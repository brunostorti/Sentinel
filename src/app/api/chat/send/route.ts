import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { streamText, generateText } from "ai";
import { createModel, describeAiError, resolveAiConfig } from "@/lib/ai/provider-factory";
import {
  getOrCreateThread,
  loadHistory,
  saveMessage,
  touchThread,
  getThreadSummary,
} from "@/lib/ai/chat/thread";
import { buildChatSystemPrompt } from "@/lib/ai/chat/context-builder";
import { extractAndPersistFacts } from "@/lib/ai/chat/fact-extractor";
import { maybeRollSummary } from "@/lib/ai/chat/summary";

/**
 * POST /api/chat/send
 * Body: { kind: "plan"|"company", resource_id?: string, content: string, stream?: boolean }
 *
 * - stream=false (ou ausente) → JSON síncrono { reply }
 * - stream=true → Server-Sent Events (text/event-stream) com chunks
 *
 * Ao terminar, dispara em background fact-extractor + rolling summary.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !userData.company_id)
    return NextResponse.json({ error: "Sem empresa." }, { status: 403 });

  const body = (await req.json()) as {
    kind: "plan" | "company";
    resource_id?: string | null;
    content: string;
    stream?: boolean;
    attachments?: string[];
  };

  if (!body.content || !body.content.trim()) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  // As chaves de IA não são legíveis pela sessão do usuário (migração 022).
  const { data: company } = await createAdminClient()
    .from("companies")
    .select("ai_plan_model, ai_chat_model, ai_api_keys")
    .eq("id", userData.company_id)
    .single();

  const aiConfig = resolveAiConfig(company, "chat");
  const isMaua = aiConfig.provider === "maua";

  const thread = await getOrCreateThread(supabase, {
    companyId: userData.company_id,
    userId: userData.id,
    kind: body.kind,
    resourceId: body.kind === "plan" ? body.resource_id ?? null : null,
  });

  const hasAttachments = body.attachments && body.attachments.length > 0;
  
  await saveMessage(supabase, {
    threadId: thread.id,
    role: "user",
    content: hasAttachments ? `${body.content}\n\n[Arquivo Anexado]` : body.content,
  });
  await touchThread(
    supabase,
    thread.id,
    thread.title ?? body.content.slice(0, 60)
  );

  const history = await loadHistory(supabase, thread.id);

  let systemPrompt = await buildChatSystemPrompt(
    userData.company_id,
    body.kind,
    body.kind === "plan" ? body.resource_id ?? null : null
  );
  const rollingSummary = await getThreadSummary(supabase, thread.id);
  if (rollingSummary) {
    systemPrompt += `\n\n## Sumário das mensagens anteriores desta thread\n${rollingSummary}`;
  }

  const messagesForLLM: any[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  if (hasAttachments && messagesForLLM.length > 0) {
    const lastMsg = messagesForLLM[messagesForLLM.length - 1];
    if (lastMsg.role === "user") {
      lastMsg.content = [
        { type: "text", text: body.content },
        ...body.attachments!.map(base64 => ({
          type: "image",
          image: base64
        }))
      ];
    }
  }

  const model = createModel(aiConfig);
  const companyId = userData.company_id;
  const userContent = body.content;

  // Em sequência (não em paralelo): a IA da Mauá aceita só 2 pedidos simultâneos
  // por chave, e a resposta principal ao usuário tem prioridade.
  async function backgroundJobs(fullReply: string) {
    try {
      await extractAndPersistFacts({
        companyId,
        userMessage: userContent,
        assistantReply: fullReply,
      });
    } catch (e) {
      console.error("chat: extração de fatos falhou:", e);
    }
    try {
      await maybeRollSummary(thread.id);
    } catch (e) {
      console.error("chat: resumo da conversa falhou:", e);
    }
  }

  // ── Streaming (SSE no formato que src/lib/chat-stream.ts lê) ───────────
  // Eventos: { delta } a cada trecho, { done: true } no fim, { error } se a IA
  // falhar no meio — assim a tela mostra a mensagem amigável (ex.: limite da Mauá).
  if (body.stream) {
    const result = streamText({
      model,
      temperature: isMaua ? 0.2 : undefined,
      maxOutputTokens: isMaua ? 1500 : undefined,
      system: systemPrompt,
      messages: messagesForLLM,
      onError: () => {}, // tratado no laço abaixo
      onFinish: async ({ text }) => {
        // Salva mensagem completa
        await saveMessage(supabase, {
          threadId: thread.id,
          role: "assistant",
          content: text,
        });
        await touchThread(supabase, thread.id);

        // Background: facts + summary
        void backgroundJobs(text);
      },
    });

    const encoder = new TextEncoder();
    const event = (payload: object) =>
      encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

    // Se a tela sair no meio, seguimos lendo a resposta até o fim para que o
    // onFinish a salve no histórico; só paramos de enviar.
    let clientConnected = true;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: object) => {
          if (!clientConnected) return;
          try {
            controller.enqueue(event(payload));
          } catch {
            clientConnected = false;
          }
        };
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") send({ delta: part.text });
            else if (part.type === "error") throw part.error;
          }
          send({ done: true });
        } catch (err) {
          console.error("chat: falha no streaming:", err);
          send({ error: describeAiError(err, aiConfig) });
        } finally {
          if (clientConnected) controller.close();
        }
      },
      cancel() {
        clientConnected = false;
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
      },
    });
  }

  // ── Síncrono (fallback / clientes que não querem stream) ─────────
  try {
    const { text } = await generateText({
      model,
      temperature: isMaua ? 0.2 : undefined,
      maxOutputTokens: isMaua ? 1500 : undefined,
      system: systemPrompt,
      messages: messagesForLLM,
    });

    const reply = text || "(sem resposta da IA)";

    await saveMessage(supabase, {
      threadId: thread.id,
      role: "assistant",
      content: reply,
    });
    await touchThread(supabase, thread.id);

    void backgroundJobs(reply);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = describeAiError(err, aiConfig);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

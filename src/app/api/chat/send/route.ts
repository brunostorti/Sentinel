import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText, generateText } from "ai";
import { createModel } from "@/lib/ai/provider-factory";
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

  const { data: company } = await supabase
    .from("companies")
    .select("ai_model, ai_api_keys")
    .eq("id", userData.company_id)
    .single();

  const aiConfig = {
    model: company?.ai_model || "claude-3-5-sonnet-20240620",
    keys: company?.ai_api_keys || {},
  };

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

  const model = createModel(aiConfig.model, aiConfig.keys);
  const companyId = userData.company_id;
  const userContent = body.content;

  async function backgroundJobs(fullReply: string) {
    await Promise.allSettled([
      extractAndPersistFacts({
        companyId,
        userMessage: userContent,
        assistantReply: fullReply,
      }),
      maybeRollSummary(thread.id),
    ]);
  }

  // ── Streaming via Vercel AI SDK ────────────────────────────────────────────
  if (body.stream) {
    try {
      const result = streamText({
        model,
        temperature: aiConfig.model === "maua" ? 0.2 : undefined,
        maxTokens: aiConfig.model === "maua" ? 1500 : undefined,
        system: systemPrompt,
        messages: messagesForLLM,
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

      return result.toTextStreamResponse();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro stream";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Síncrono (fallback / clientes que não querem stream) ─────────
  try {
    const { text } = await generateText({
      model,
      temperature: aiConfig.model === "maua" ? 0.2 : undefined,
      maxTokens: aiConfig.model === "maua" ? 1500 : undefined,
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
    const message = err instanceof Error ? err.message : "Erro ao chamar IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

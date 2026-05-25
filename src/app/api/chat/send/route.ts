import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
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
  };

  if (!body.content || !body.content.trim()) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada." },
      { status: 500 }
    );

  const thread = await getOrCreateThread(supabase, {
    companyId: userData.company_id,
    userId: userData.id,
    kind: body.kind,
    resourceId: body.kind === "plan" ? body.resource_id ?? null : null,
  });

  await saveMessage(supabase, {
    threadId: thread.id,
    role: "user",
    content: body.content,
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

  const messagesForLLM = history.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const client = new Anthropic({ apiKey });
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

  // ── Streaming via SSE ────────────────────────────────────────────
  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        try {
          const anthropicStream = await client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages: messagesForLLM,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const piece = event.delta.text;
              fullReply += piece;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ delta: piece })}\n\n`
                )
              );
            }
          }

          // Salva mensagem completa
          await saveMessage(supabase, {
            threadId: thread.id,
            role: "assistant",
            content: fullReply,
          });
          await touchThread(supabase, thread.id);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();

          // Background: facts + summary (não bloqueia o stream — close já foi)
          void backgroundJobs(fullReply);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro stream";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ── Síncrono (fallback / clientes que não querem stream) ─────────
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messagesForLLM,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const reply =
      textBlock && textBlock.type === "text"
        ? textBlock.text
        : "(sem resposta da IA)";

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

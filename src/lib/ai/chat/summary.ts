/**
 * Rolling summary — quando uma thread passa de 100 mensagens, condensa as
 * primeiras 50 em um resumo (1 chamada Sonnet pequena) e grava em
 * chat_threads.summary. Próximos prompts carregam summary + últimas 30.
 *
 * Roda em background (fire-and-forget) após resposta do assistant.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const TRIGGER_MESSAGE_COUNT = 100;
const SUMMARIZE_FIRST_N = 50;

export async function maybeRollSummary(threadId: string): Promise<{ rolled: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { rolled: false };

  const admin = createAdminClient();

  // Verifica se thread tem mensagens suficientes e ainda não tem summary recente
  const { data: thread } = await admin
    .from("chat_threads")
    .select("id, message_count, summary")
    .eq("id", threadId)
    .single();

  if (!thread) return { rolled: false };
  if ((thread.message_count ?? 0) < TRIGGER_MESSAGE_COUNT) return { rolled: false };
  if (thread.summary) return { rolled: false }; // já tem summary — TODO: re-summarize quando crescer muito mais

  // Carrega as primeiras N mensagens em ordem cronológica
  const { data: messages } = await admin
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(SUMMARIZE_FIRST_N);

  if (!messages || messages.length < SUMMARIZE_FIRST_N) return { rolled: false };

  const transcript = messages
    .map((m) => `${m.role === "user" ? "HR" : "Assistente"}: ${m.content}`)
    .join("\n\n");

  const prompt = `Você é um resumidor de conversas. Condense a conversa abaixo entre o HR e o assistente de saúde ocupacional em um sumário breve (8-15 linhas) que preserve:
- Tópicos discutidos
- Decisões tomadas pelo HR (aprovar, rejeitar, mudar de ideia)
- Fatos novos sobre a empresa que o HR mencionou
- Pontos abertos

Use voz neutra, terceira pessoa. Sem aspas, sem floreio.

## Transcrição
${transcript}

## Sumário (em português brasileiro)`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const summary = textBlock?.type === "text" ? textBlock.text.trim() : null;

    if (!summary) return { rolled: false };

    await admin
      .from("chat_threads")
      .update({ summary })
      .eq("id", threadId);

    return { rolled: true };
  } catch {
    return { rolled: false };
  }
}

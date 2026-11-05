import { createAdminClient } from "@/lib/supabase/admin";

/** Etapas que não são do modelo de linguagem da empresa (embeddings usam a chave da plataforma). */
const IGNORED_STAGES = new Set(["embedding", "rag-search"]);

interface UsageLike {
  stage?: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Grava o consumo de IA da empresa (só modelo e tokens, nunca conteúdo) para o Painel
 * Master estimar o custo. Agrupa por modelo; falha na gravação não afeta o usuário.
 */
export async function logAiUsage(companyId: string, source: "chat" | "planos", entries: UsageLike[]) {
  try {
    const byModel = new Map<string, { input: number; output: number }>();
    for (const e of entries) {
      if (e.stage && IGNORED_STAGES.has(e.stage)) continue;
      const input = Math.max(0, Math.round(e.inputTokens ?? 0));
      const output = Math.max(0, Math.round(e.outputTokens ?? 0));
      if (!input && !output) continue;
      const acc = byModel.get(e.model) ?? { input: 0, output: 0 };
      acc.input += input;
      acc.output += output;
      byModel.set(e.model, acc);
    }
    if (!byModel.size) return;
    const rows = [...byModel.entries()].map(([model, t]) => ({
      company_id: companyId,
      source,
      model: model.slice(0, 120),
      input_tokens: t.input,
      output_tokens: t.output,
    }));
    const { error } = await createAdminClient().from("ai_usage_events").insert(rows);
    if (error) console.error("ai_usage_events insert error:", error.message);
  } catch (e) {
    console.error("logAiUsage falhou:", e);
  }
}

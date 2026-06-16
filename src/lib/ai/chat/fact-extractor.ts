/**
 * Fact-extractor — pós-turno do user, extrai fatos factuais sobre a empresa
 * mencionados na conversa e cria sugestões de update no perfil (profile_events
 * pendentes) que o HR confirma depois.
 *
 * Características:
 * - Roda em background depois que /api/chat/send responde (não bloqueia UI)
 * - Skipa mensagens curtas (≤8 palavras) ou perguntas sem afirmação
 * - Apenas `confidence='high'` cria profile_events pendentes
 * - Antes de gravar, verifica valor atual do perfil — se proposed_value == current_value, descarta
 * - Dedup por field_path: fecha pendente anterior do mesmo campo
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractJsonObject } from "../pipeline/json-utils";
import type { CompanyProfile } from "../profile/schema";

const TRIVIAL_KEYWORDS = /^(oi|olá|ok|obrigado|valeu|tudo bem|hello|hi|sim|não|nope|claro)\.?$/i;
const MIN_WORDS = 8;

const ALLOWED_FIELDS = [
  "annual_budget_brl",
  "budget_horizon",
  "budget_flexibility",
  "existing_wellbeing_spend_brl",
  "hr_team_size",
  "has_dedicated_hr",
  "has_internal_training",
  "has_occupational_health",
  "has_compliance_officer",
  "decision_speed",
  "culture_type",
  "predominant_role_type",
  "has_remote",
  "has_shift_workers",
  "has_unionized_workers",
  "regions",
  "constraints",
  "preferred_modalities",
  "avoid_modalities",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

interface CandidateFact {
  field_path: string;
  current_value: unknown;
  proposed_value: unknown;
  source_quote: string;
  confidence: "high" | "medium" | "low";
}

function isTrivial(text: string): boolean {
  if (!text) return true;
  if (TRIVIAL_KEYWORDS.test(text.trim())) return true;
  return text.trim().split(/\s+/).length < MIN_WORDS;
}

export async function extractAndPersistFacts(args: {
  companyId: string;
  userMessage: string;
  assistantReply: string;
}): Promise<{ created: number }> {
  if (isTrivial(args.userMessage)) return { created: 0 };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { created: 0 };

  const admin = createAdminClient();

  // Carrega perfil atual para passar como contexto + para diff
  const { data: profileRow } = await admin
    .from("company_profiles")
    .select("*")
    .eq("company_id", args.companyId)
    .single();
  const profile = profileRow as CompanyProfile | null;
  if (!profile) return { created: 0 };

  const profileForPrompt = Object.fromEntries(
    ALLOWED_FIELDS.map((k) => [k, (profile as unknown as Record<string, unknown>)[k]])
  );

  const prompt = `Extraia fatos factuais sobre a empresa mencionados pelo HR no turno abaixo. Só inclua fatos que:
1. São informativos sobre a empresa (orçamento, estrutura, preferências, restrições, regime, valores)
2. DIVERGEM ou EXPANDEM o perfil atual
3. São declarações afirmativas (não perguntas, não suposições)

Perfil atual da empresa (NÃO altere campos que já batem):
${JSON.stringify(profileForPrompt, null, 2)}

Campos permitidos: ${ALLOWED_FIELDS.join(", ")}

## Turno do chat

USUÁRIO: ${args.userMessage}

ASSISTENTE: ${args.assistantReply}

## Output (JSON apenas — não inclua texto antes/depois)
{
  "candidate_facts": [
    {
      "field_path": "...",
      "current_value": <o que está no perfil hoje, ou null>,
      "proposed_value": <novo valor>,
      "source_quote": "trecho da mensagem do user que justifica",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Se nenhum fato relevante: { "candidate_facts": [] }`;

  let result: { candidate_facts?: CandidateFact[] } | null = null;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (textBlock?.type === "text") {
      result = extractJsonObject<{ candidate_facts?: CandidateFact[] }>(textBlock.text);
    }
  } catch {
    return { created: 0 };
  }

  const candidates = (result?.candidate_facts ?? []).filter(
    (c) =>
      c.confidence === "high" &&
      ALLOWED_FIELDS.includes(c.field_path as AllowedField)
  );

  if (candidates.length === 0) return { created: 0 };

  let created = 0;
  const now = new Date().toISOString();

  for (const fact of candidates) {
    // Re-confere valor atual (anti-race): pode ter sido editado pelo HR no meio-tempo
    const { data: freshProfile } = await admin
      .from("company_profiles")
      .select(fact.field_path)
      .eq("company_id", args.companyId)
      .single();
    const currentNow = (freshProfile as Record<string, unknown> | null)?.[fact.field_path];

    if (JSON.stringify(currentNow) === JSON.stringify(fact.proposed_value)) {
      continue; // já bate, nada a propor
    }

    // Fecha pendente anterior do mesmo campo (dedup)
    await admin
      .from("profile_events")
      .update({
        rejected_at: now,
        event_type: "ai_suggestion_superseded",
      })
      .eq("company_id", args.companyId)
      .eq("field_path", fact.field_path)
      .is("confirmed_at", null)
      .is("rejected_at", null);

    // Insere nova sugestão pendente
    await admin.from("profile_events").insert({
      company_id: args.companyId,
      event_type: "ai_suggested_from_chat",
      field_path: fact.field_path,
      old_value: currentNow ?? null,
      new_value: fact.proposed_value,
      source_context: `extraído do chat: "${fact.source_quote}"`,
      confidence: "high",
    });
    created++;
  }

  return { created };
}

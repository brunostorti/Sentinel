/**
 * Sugere valores para o perfil com base nos dados já existentes em `companies`,
 * departments e surveys passados. Faz UMA chamada Sonnet pequena.
 *
 * O resultado é mostrado ao HR com badge "sugerido"; ele aceita/edita/salva.
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "../pipeline/json-utils";

export interface PreFillSeed {
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
  department_count: number;
  past_survey_count: number;
}

export interface PreFillSuggestion {
  has_dedicated_hr?: boolean;
  decision_speed?: "fast" | "normal" | "slow";
  culture_type?:
    | "startup"
    | "family"
    | "corporate"
    | "public"
    | "multinational"
    | "other";
  predominant_role_type?: "office" | "industrial" | "field" | "mixed" | "remote";
  has_remote?: boolean;
  has_shift_workers?: boolean;
  has_unionized_workers?: boolean;
  regions?: string[];
  budget_horizon?: "ano_corrente" | "12_meses" | "bienio";
  budget_flexibility?: "rigid" | "flexible" | "unlocked_for_critical";
  rationale: string;
}

export async function suggestProfileValues(
  seed: PreFillSeed
): Promise<PreFillSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const prompt = `Você é um consultor que estima o perfil organizacional de uma empresa brasileira a partir de sinais limitados, para PRÉ-PREENCHER um formulário. O HR vai revisar antes de salvar — então é OK errar para o lado conservador.

## Dados disponíveis
- Setor: ${seed.industry ?? "desconhecido"}
- Colaboradores: ${seed.employee_count ?? "desconhecido"}
- Regime: ${seed.work_regime ?? "desconhecido"}
- Departamentos cadastrados: ${seed.department_count}
- Pesquisas anteriores: ${seed.past_survey_count}

## Sua tarefa
Estime os campos abaixo. Quando NÃO houver sinal confiável, OMITA o campo (não chute).

Campos possíveis (omita os que não tem como inferir):
- has_dedicated_hr (boolean)
- decision_speed: "fast" (startup-like) | "normal" | "slow" (público/grande corporação)
- culture_type: "startup" | "family" | "corporate" | "public" | "multinational" | "other"
- predominant_role_type: "office" | "industrial" | "field" | "mixed" | "remote"
- has_remote (boolean)
- has_shift_workers (boolean)
- has_unionized_workers (boolean)
- regions (array de UFs como ["SP","MG"]) — só se tiver sinal claro
- budget_horizon: "ano_corrente" | "12_meses" | "bienio"
- budget_flexibility: "rigid" | "flexible" | "unlocked_for_critical"

Sempre inclua "rationale" (1-2 frases explicando suas inferências).

## Heurísticas comuns
- Tech/startup < 50 colab → culture_type=startup, decision_speed=fast, has_dedicated_hr=false
- Indústria + > 200 colab + CLT → industrial, shift_workers=true, culture=corporate, decision=normal
- Setor público → culture=public, decision=slow, no remote
- Saúde > 300 colab → mixed, shift_workers=true, has_unionized_workers=true
- Varejo grande → mixed (mesclando lojas e backoffice)

## OUTPUT (JSON apenas)
{ "field": value, ..., "rationale": "..." }

Apenas o JSON. Nenhum texto antes ou depois.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  return extractJsonObject<PreFillSuggestion>(textBlock.text);
}

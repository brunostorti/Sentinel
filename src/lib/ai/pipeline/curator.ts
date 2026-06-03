/**
 * Stage 2 — Curator
 *
 * Recebe AnalystReport + perfil completo + histórico + KB JÁ FILTRADA E ANOTADA
 * (preferred/candidate/excluded por hard-filters em TS).
 * Devolve 1-2 candidatos por dimensão com personalization_rationale.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AnalystReport, CuratedSelection } from "./types";
import type {
  CompanyProfile,
  CompanyActionTaken,
  ActionOutcome,
} from "../profile/schema";
import { buildPerfilNarrativo } from "../profile/narrative";
import type { AnnotatedIntervention } from "../knowledge-base/filters";
import { extractJsonObject } from "./json-utils";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

function buildCatalogBlock(annotated: AnnotatedIntervention[]): string {
  const visible = annotated.filter((iv) => iv.status !== "excluded");
  const grouped = new Map<string, AnnotatedIntervention[]>();

  for (const iv of visible) {
    const arr = grouped.get(iv.universal_category_code) ?? [];
    arr.push(iv);
    grouped.set(iv.universal_category_code, arr);
  }

  const blocks: string[] = [];
  for (const [cat, items] of grouped.entries()) {
    const lines = items.map((iv) => {
      const status = iv.status === "preferred" ? " ⭐PREFERIDA" : "";
      const reason = iv.status_reason ? ` [${iv.status_reason}]` : "";
      return `- ${iv.intervention_id}: ${iv.title}${status}${reason}
    Esforço: ${iv.effort} | Custo/colab/ano: R$${iv.cost_per_employee.min}-${iv.cost_per_employee.max}`;
    });
    blocks.push(`### ${cat}\n${lines.join("\n")}`);
  }

  const excluded = annotated.filter((iv) => iv.status === "excluded");
  let excludedBlock = "";
  if (excluded.length > 0) {
    excludedBlock =
      "\n### Excluídas por hard-filter (NÃO escolha estas):\n" +
      excluded
        .map((iv) => `- ${iv.intervention_id}: ${iv.status_reason}`)
        .join("\n");
  }

  return blocks.join("\n\n") + excludedBlock;
}

export async function runCurator(args: {
  report: AnalystReport;
  profile: CompanyProfile;
  company: CompanyInfo;
  history: CompanyActionTaken[];
  outcomes: ActionOutcome[];
  annotated: AnnotatedIntervention[];
}): Promise<CuratedSelection> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const perfilNarrativo = buildPerfilNarrativo(
    args.company,
    args.profile,
    args.history.map((h) => ({
      title: h.title,
      year: h.year_started,
      outcome: h.outcome,
      notes: h.outcome_notes,
    }))
  );

  const catalogBlock = buildCatalogBlock(args.annotated);
  const prioritizedSummary = args.report.prioritized_dimensions
    .map(
      (d) =>
        `- dimension_id="${d.dimension_id}" | nome="${d.dimension_name}" | categoria=${d.universal_category_code} | score=${d.score}/100 | severidade=${d.severity} — ${d.why_priority}`
    )
    .join("\n");

  const employeeCount = args.company.employee_count ?? 100;

  const prompt = `Você é o curador de intervenções desta plataforma. Sua tarefa é escolher 1-2 candidatos POR DIMENSÃO priorizada, considerando o contexto da empresa.

## Perfil narrativo
${perfilNarrativo}

## Dimensões priorizadas (do Analyst)
USE EXATAMENTE o dimension_id (uuid) listado no campo "dimension_id" do output. NÃO invente IDs.

${prioritizedSummary}

## Catálogo (já filtrado por orçamento, RH disponível, histórico, restrições)
Status:
- ⭐PREFERIDA = categoria validada em ciclos anteriores nesta empresa
- (sem marca) = candidate
- "Excluídas" = NÃO escolha estas

${catalogBlock}

## REGRAS

1. Para cada dimensão prioritizada, escolha 1-2 interventions do catálogo acima.
2. PREFIRA as marcadas com ⭐ — funcionaram aqui antes.
3. EXPLIQUE por que ESTA intervention para ESTA empresa (cite perfil: orçamento, cultura, restrição, regime, etc.).
4. Estime cost_estimate_brl total para ${employeeCount} colaboradores (min-max anual).
5. Liste excluded_alternatives: outras interventions que considerou mas descartou e por quê.
6. Se uma dimensão não tem candidato bom, coloque em unmet_dimensions com motivo.
7. Calcule budget_summary considerando o annual_budget_brl da empresa.

## OUTPUT (JSON apenas)
{
  "candidates": [
    {
      "dimension_id": "uuid",
      "intervention_id": "slug do catálogo (ex: workload.task-redistribution)",
      "fit_score": 0-100,
      "personalization_rationale": "por que ESTA escolha para ESTA empresa",
      "cost_estimate_brl": { "min": N, "max": N },
      "requires_external_vendor": true|false,
      "excluded_alternatives": [
        { "intervention_id": "...", "reason": "..." }
      ]
    }
  ],
  "unmet_dimensions": [
    { "dimension_id": "uuid", "reason": "..." }
  ],
  "budget_summary": {
    "total_estimated_brl": { "min": N, "max": N },
    "fits_declared_budget": true|false,
    "headroom_or_overflow_brl": N
  }
}

Devolva APENAS o JSON.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6144,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Stage 2 (Curator): resposta não contém texto.");
  }

  const selection = extractJsonObject<CuratedSelection>(textBlock.text);
  if (!selection) {
    throw new Error("Stage 2 (Curator): JSON inválido.");
  }
  return selection;
}

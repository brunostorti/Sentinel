/**
 * Tarefa do Kanban criada ao aprovar um plano de ação. Usada pelos três caminhos de
 * aprovação: tela do plano (/api/action-plans/[id]/approve), revisão na lista e aprovação
 * em lote (planos-acao/actions.ts).
 */

import { cutsFromColumns, greenFavorability, toFavorability } from "@/lib/copsoq/scoring";
import { classify, LEVEL_INFO, suggestedDueDate } from "@/lib/nr1/criteria";
import type { AIRecommendation } from "@/lib/ai/pipeline/types";

export interface PlanForTask {
  id: string;
  survey_id: string;
  dimension_id: string;
  risk_level: "RED" | "YELLOW";
  ai_recommendation: unknown;
  questionnaire_scales: {
    scoring_direction: "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE";
    cut_low: number | null;
    cut_high: number | null;
  } | null;
  action_outcomes: { score_before: number | null }[];
}

export const PLAN_FOR_TASK_FIELDS =
  "id, company_id, status, survey_id, dimension_id, risk_level, ai_recommendation, questionnaire_scales(scoring_direction, cut_low, cut_high), action_outcomes(score_before)";

/**
 * Tarefa do Kanban para um plano aprovado. O prazo inicial segue o critério do Dossiê
 * NR-1 (nível de risco da dimensão → prazo do quadro 5 do Manual GRO/PGR); o RH ajusta
 * prazo e responsável no card.
 */
export function kanbanTaskFor(plan: PlanForTask, companyId: string, columnId: string) {
  const rec = (plan.ai_recommendation ?? {}) as Partial<AIRecommendation>;
  const before = plan.action_outcomes?.[0]?.score_before;
  const scale = plan.questionnaire_scales;
  const direction = scale?.scoring_direction;
  const greenAt = greenFavorability(direction ?? "HIGH_IS_FAVORABLE", cutsFromColumns(scale?.cut_low, scale?.cut_high));
  // Sem o escore, usa a cor do plano: Risco ≈ 30% do limite verde, Intermédio ≈ 75%
  // (nos tercis do COPSOQ: favorabilidade 20 e 50).
  const favorability =
    before != null && direction
      ? toFavorability(Number(before), direction)
      : greenAt * (plan.risk_level === "RED" ? 0.3 : 0.75);
  const level = classify(favorability, { healthEvidence: false, effectiveMeasure: false }, greenAt)?.level ?? "BAIXO";
  const description = [
    rec.quick_action ? `Primeiros 30 dias: ${rec.quick_action}` : null,
    rec.rationale ?? null,
    rec.stakeholders?.accountable
      ? `Responsável sugerido: ${rec.stakeholders.accountable}. Defina o responsável neste card.`
      : null,
    `Prazo inicial pelo critério do Dossiê NR-1: risco ${LEVEL_INFO[level].label.toLowerCase()} (${LEVEL_INFO[level].deadline.toLowerCase()}).`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    company_id: companyId,
    column_id: columnId,
    title: rec.title ?? "Medida do plano de ação",
    description,
    dimension_id: plan.dimension_id,
    source_survey_id: plan.survey_id,
    action_plan_id: plan.id,
    due_date: suggestedDueDate(favorability, new Date(), greenAt),
  };
}

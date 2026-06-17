/* Helpers compartilhados para montar PlanView a partir de linhas do banco.
   Usado pelo index (page.tsx) e pela página per-survey, removendo duplicação. */

import type { AIRecommendation } from "@/lib/ai/pipeline/types";
import type { PlanView } from "../types";

export const EMPTY_RECOMMENDATION: AIRecommendation = {
  title: "(sem título)",
  description: "",
  quick_action: "",
  rationale: "",
  recommendation_status: "MITIGAR",
  roadmap: [],
  prerequisites: [],
  time_to_first_value: "",
  internal_capacity_required: "",
  stakeholders: {
    accountable: "",
    responsible: [],
    consulted: [],
    informed: [],
  },
  vendors: [],
  internal_alternative: null,
  leading_indicators: [],
  monitoring_cadence: "",
  communication_plan: { channels: [], key_message: "", timing: "" },
  investment: { total_annual: "N/D", per_employee_month: "N/D", breakdown: "N/D" },
  expected_return: { conservative: "N/D", optimistic: "N/D", payback_period: "N/D" },
  impact_metrics: [],
  risk_if_not_acted: "",
  implementation_risks: [],
  nr1_compliance: null,
  compliance_extra: [],
};

/** Mescla um ai_recommendation parcial (do banco) com os defaults garantindo campos opcionais. */
export function mergeRecommendation(
  raw: Partial<AIRecommendation> | null | undefined
): AIRecommendation {
  const r = raw ?? {};
  return {
    ...EMPTY_RECOMMENDATION,
    ...r,
    stakeholders: { ...EMPTY_RECOMMENDATION.stakeholders, ...(r.stakeholders ?? {}) },
    communication_plan: {
      ...EMPTY_RECOMMENDATION.communication_plan,
      ...(r.communication_plan ?? {}),
    },
    roadmap: r.roadmap ?? [],
    vendors: r.vendors ?? [],
    leading_indicators: r.leading_indicators ?? [],
    impact_metrics: r.impact_metrics ?? [],
    implementation_risks: r.implementation_risks ?? [],
    prerequisites: r.prerequisites ?? [],
    compliance_extra: r.compliance_extra ?? [],
  };
}

/** Linha crua de action_plans com relações embutidas (surveys, questionnaire_scales, company_actions_taken). */
export interface RawPlanRow {
  id: string;
  risk_level: string;
  ai_recommendation: unknown;
  status: string;
  priority: string | null;
  effort: string | null;
  timeframe: string | null;
  created_at: string;
  surveys: unknown;
  questionnaire_scales: unknown;
  company_actions_taken: unknown;
}

/** Converte uma linha do banco em PlanView para a UI. */
export function toPlanView(p: RawPlanRow): PlanView {
  const recommendation = mergeRecommendation(
    p.ai_recommendation as Partial<AIRecommendation> | null
  );

  const survey = p.surveys as { id: string; title: string } | null;
  const scale = p.questionnaire_scales as { name: string } | null;
  const actionTakenArr = p.company_actions_taken as
    | { outcome: string; outcome_notes: string }[]
    | null;
  const actionTaken =
    Array.isArray(actionTakenArr) && actionTakenArr.length > 0 ? actionTakenArr[0] : null;

  return {
    id: p.id,
    riskLevel: p.risk_level as PlanView["riskLevel"],
    recommendation,
    status: p.status as PlanView["status"],
    createdAt: p.created_at,
    surveyId: survey?.id ?? "",
    surveyTitle: survey?.title ?? "Pesquisa",
    dimensionName: scale?.name ?? "",
    priority: p.priority,
    effort: p.effort,
    timeframe: p.timeframe,
    outcome: (actionTaken?.outcome as PlanView["outcome"]) ?? null,
    outcomeNotes: actionTaken?.outcome_notes ?? null,
  };
}

/** Colunas de action_plans (com relações) usadas para montar PlanView. */
export const PLAN_VIEW_SELECT = `
  id,
  risk_level,
  ai_recommendation,
  status,
  priority,
  effort,
  timeframe,
  created_at,
  surveys (id, title),
  questionnaire_scales (name),
  company_actions_taken (outcome, outcome_notes)
` as const;

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanDetailView } from "./plan-detail-view";
import { getReferencesForIntervention } from "@/lib/ai/knowledge-base/references";
import type { AIRecommendation } from "@/lib/ai/pipeline/types";

const EMPTY: AIRecommendation = {
  title: "",
  description: "",
  quick_action: "",
  rationale: "",
  roadmap: [],
  prerequisites: [],
  time_to_first_value: "",
  internal_capacity_required: "",
  stakeholders: { accountable: "", responsible: [], consulted: [], informed: [] },
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

export default async function PlanoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");

  const { data: plan } = await supabase
    .from("action_plans")
    .select(
      `id, risk_level, ai_recommendation, status, priority, effort, timeframe,
       target_department, created_at,
       surveys (id, title),
       questionnaire_scales (name),
       company_actions_taken (outcome, outcome_notes)`
    )
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .maybeSingle();

  if (!plan) notFound();

  // Resolve intervention_id (pode estar em outcome linkado ou no JSONB; outcomes é o canal canônico)
  // Como simplificamos, também tentamos buscar da tabela outcomes
  const { data: outcomeData } = await supabase
    .from("action_outcomes")
    .select("intervention_id")
    .eq("action_plan_id", id)
    .maybeSingle();
  const interventionId = outcomeData?.intervention_id ?? null;
  const references = interventionId
    ? await getReferencesForIntervention(interventionId)
    : [];

  const raw = (plan.ai_recommendation as Partial<AIRecommendation>) ?? {};
  const recommendation: AIRecommendation = {
    ...EMPTY,
    ...raw,
    investment: { ...EMPTY.investment, ...(raw.investment ?? {}) },
    expected_return: { ...EMPTY.expected_return, ...(raw.expected_return ?? {}) },
    stakeholders: { ...EMPTY.stakeholders, ...(raw.stakeholders ?? {}) },
    communication_plan: { ...EMPTY.communication_plan, ...(raw.communication_plan ?? {}) },
    roadmap: raw.roadmap ?? [],
    vendors: raw.vendors ?? [],
    leading_indicators: raw.leading_indicators ?? [],
    impact_metrics: raw.impact_metrics ?? [],
    implementation_risks: raw.implementation_risks ?? [],
    prerequisites: raw.prerequisites ?? [],
    compliance_extra: raw.compliance_extra ?? [],
  };

  const survey = plan.surveys as unknown as { id: string; title: string } | null;
  const dim = plan.questionnaire_scales as unknown as { name: string } | null;
  const canManage = userData.role === "HR" || userData.role === "ADMIN";

  const actionTakenArr = plan.company_actions_taken as unknown as { outcome: string; outcome_notes: string }[] | null;
  const actionTaken = Array.isArray(actionTakenArr) && actionTakenArr.length > 0 ? actionTakenArr[0] : null;

  return (
    <PlanDetailView
      planId={plan.id}
      riskLevel={plan.risk_level as "RED" | "YELLOW"}
      status={plan.status as "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED"}
      dimensionName={dim?.name ?? ""}
      surveyTitle={survey?.title ?? ""}
      timeframe={plan.timeframe as string | null}
      targetDepartment={plan.target_department as string | null}
      recommendation={recommendation}
      canManage={canManage}
      references={references}
      initialOutcome={actionTaken?.outcome as any}
      initialOutcomeNotes={actionTaken?.outcome_notes}
    />
  );
}

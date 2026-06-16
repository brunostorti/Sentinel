import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionPlansList } from "./action-plans-list";
import type { PlanView } from "./types";
import type { AIRecommendation } from "@/lib/ai/pipeline/types";

const EMPTY_RECOMMENDATION: AIRecommendation = {
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

export default async function ActionPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) redirect("/entrar");

  const companyId = userData.company_id;
  const canManage = userData.role === "HR" || userData.role === "ADMIN";

  const { data: plans } = await supabase
    .from("action_plans")
    .select(
      `
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
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: closedSurveys } = await supabase
    .from("surveys")
    .select("id, title")
    .eq("company_id", companyId)
    .eq("status", "CLOSED");

  const formattedPlans: PlanView[] = (plans ?? []).map((p) => {
    const raw = (p.ai_recommendation as Partial<AIRecommendation>) ?? {};
    // Merge com EMPTY_RECOMMENDATION para garantir campos opcionais
    const recommendation: AIRecommendation = {
      ...EMPTY_RECOMMENDATION,
      ...raw,
      // Re-aplica nested defaults se ausentes
      stakeholders: { ...EMPTY_RECOMMENDATION.stakeholders, ...(raw.stakeholders ?? {}) },
      communication_plan: { ...EMPTY_RECOMMENDATION.communication_plan, ...(raw.communication_plan ?? {}) },
      roadmap: raw.roadmap ?? [],
      vendors: raw.vendors ?? [],
      leading_indicators: raw.leading_indicators ?? [],
      impact_metrics: raw.impact_metrics ?? [],
      implementation_risks: raw.implementation_risks ?? [],
      prerequisites: raw.prerequisites ?? [],
      compliance_extra: raw.compliance_extra ?? [],
    };

    const actionTakenArr = p.company_actions_taken as unknown as { outcome: string; outcome_notes: string }[] | null;
    const actionTaken = Array.isArray(actionTakenArr) && actionTakenArr.length > 0 ? actionTakenArr[0] : null;

    return {
      id: p.id,
      riskLevel: p.risk_level as "RED" | "YELLOW",
      recommendation,
      status: p.status as PlanView["status"],
      createdAt: p.created_at,
      surveyId:
        (p.surveys as unknown as { id: string; title: string })?.id ?? "",
      surveyTitle:
        (p.surveys as unknown as { id: string; title: string })?.title ??
        "Pesquisa",
      dimensionName:
        (p.questionnaire_scales as unknown as { name: string })?.name ?? "",
      priority: p.priority as string | null,
      effort: p.effort as string | null,
      timeframe: p.timeframe as string | null,
      outcome: actionTaken?.outcome as PlanView["outcome"] ?? null,
      outcomeNotes: actionTaken?.outcome_notes ?? null,
    };
  });

  const surveyIdsWithPlans = new Set(formattedPlans.map((p) => p.surveyId));
  const surveysWithoutPlans = (closedSurveys ?? []).filter(
    (s) => !surveyIdsWithPlans.has(s.id)
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">
          Planos de Ação IA
        </h1>
        <p className="mt-1 text-muted-foreground">
          Recomendações geradas por inteligência artificial com base nos
          resultados das pesquisas psicossociais.
        </p>
      </div>

      <ActionPlansList
        plans={formattedPlans}
        surveysWithoutPlans={surveysWithoutPlans}
        canManage={canManage}
        hasAnySurveys={(closedSurveys?.length ?? 0) > 0}
        hasApiKey={!!process.env.ANTHROPIC_API_KEY}
      />
    </div>
  );
}

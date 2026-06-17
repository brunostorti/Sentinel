import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { ActionPlansList } from "../../action-plans-list";
import type { PlanView } from "../../types";
import { toPlanView, PLAN_VIEW_SELECT, type RawPlanRow } from "../../_lib/format-plan";

export default async function SurveyPlansPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

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

  // Pesquisa (valida posse pela empresa)
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title, status")
    .eq("id", surveyId)
    .eq("company_id", companyId!)
    .maybeSingle();
  if (!survey) notFound();

  // Planos desta pesquisa (não filtrar por status da pesquisa)
  const { data: planRows } = await supabase
    .from("action_plans")
    .select(PLAN_VIEW_SELECT)
    .eq("company_id", companyId)
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });

  const plans: PlanView[] = ((planRows ?? []) as unknown as RawPlanRow[]).map(toPlanView);

  // Banner "Gerar planos" escopado: só se 0 planos + CLOSED
  const surveysWithoutPlans =
    plans.length === 0 && survey.status === "CLOSED"
      ? [{ id: survey.id, title: survey.title }]
      : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <Link
          href="/planos-acao"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" size={14} />
          Pesquisas
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{survey.title}</h1>
        <p className="mt-1 text-muted-foreground">
          Planos de ação gerados a partir desta pesquisa.
        </p>
      </div>

      <ActionPlansList
        plans={plans}
        surveysWithoutPlans={surveysWithoutPlans}
        canManage={canManage}
        hasAnySurveys
        hasApiKey={!!process.env.ANTHROPIC_API_KEY}
      />
    </div>
  );
}

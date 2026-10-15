import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SurveyContextNav } from "@/components/survey-context-nav";
import { Icon } from "@/components/icon";
import { fetchCycleContextForSurvey } from "@/lib/surveys/cycle";
import { KanbanBoard } from "./kanban-board";
import { CycleFilterPills } from "@/components/cycle-filter-pills";

export default async function KanbanPage(props: {
  searchParams?: Promise<{ surveyId?: string; cycleId?: string; ciclo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const surveyId = searchParams?.surveyId ?? null;
  const cycleIdParam = searchParams?.cycleId ?? searchParams?.ciclo ?? null;
  const cycleId = cycleIdParam && cycleIdParam !== "todos" ? cycleIdParam : null;

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

  let currentSurvey: { id: string; title: string; status: string } | null = null;
  if (surveyId) {
    const { data: survey } = await supabase
      .from("surveys")
      .select("id, title, status")
      .eq("id", surveyId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!survey) notFound();
    currentSurvey = survey;
  }

  const cycleContext = surveyId
    ? await fetchCycleContextForSurvey(supabase, surveyId, companyId)
    : null;

  let currentCycle: { id: string; title: string } | null = null;
  let cycleSurveyIds: string[] = [];
  if (cycleId) {
    const { data: cycle } = await supabase
      .from("survey_cycles")
      .select("id, title")
      .eq("id", cycleId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cycle) {
      currentCycle = cycle;
      const { data: cSurveys } = await supabase
        .from("surveys")
        .select("id")
        .eq("cycle_id", cycleId)
        .eq("company_id", companyId);
      cycleSurveyIds = (cSurveys ?? []).map((s) => s.id);
    }
  }

  // List of company cycles for quick filtering when viewing general kanban
  const { data: companyCycles } = await supabase
    .from("survey_cycles")
    .select("id, title")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: columns } = await supabase
    .from("kanban_columns")
    .select("id, name, order_index")
    .eq("company_id", companyId)
    .order("order_index");

  let kanbanColumns = columns ?? [];
  if (kanbanColumns.length === 0 && canManage) {
    const defaults = [
      { name: "A Definir", order_index: 0, company_id: companyId },
      { name: "Em Andamento", order_index: 1, company_id: companyId },
      { name: "Quase Concluído", order_index: 2, company_id: companyId },
      { name: "Concluído", order_index: 3, company_id: companyId },
    ];
    const { data: created } = await supabase
      .from("kanban_columns")
      .insert(defaults)
      .select("id, name, order_index");

    kanbanColumns = created ?? [];
  }

  let taskQuery = supabase
    .from("kanban_tasks")
    .select(
      `
      id,
      title,
      description,
      column_id,
      due_date,
      assigned_to,
      dimension_id,
      source_survey_id,
      questionnaire_scales (name),
      surveys (id, title),
      users!kanban_tasks_assigned_to_fkey (name)
    `
    )
    .eq("company_id", companyId);

  if (currentSurvey) {
    taskQuery = taskQuery.eq("source_survey_id", currentSurvey.id);
  } else if (currentCycle) {
    if (cycleSurveyIds.length > 0) {
      taskQuery = taskQuery.in("source_survey_id", cycleSurveyIds);
    } else {
      taskQuery = taskQuery.eq("source_survey_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data: tasks } = await taskQuery;

  const { data: companyUsers } = await supabase
    .from("users")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");

  return (
    <div className="space-y-6">
      {currentSurvey && (
        <SurveyContextNav
          surveyId={currentSurvey.id}
          surveyTitle={currentSurvey.title}
          status={currentSurvey.status}
          current="kanban"
          cycleId={cycleContext?.cycleId}
          cycleTitle={cycleContext?.cycleTitle}
          stageLabel={cycleContext?.stageLabel}
        />
      )}

      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">
          {currentSurvey
            ? "Kanban da pesquisa"
            : currentCycle
              ? `Kanban — ${currentCycle.title}`
              : "Kanban de Planos"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentSurvey
            ? "Acompanhe apenas as tarefas derivadas desta pesquisa."
            : currentCycle
              ? `Acompanhe todas as tarefas decorrentes do ciclo ${currentCycle.title}.`
              : "Acompanhe e gerencie as tarefas de intervenção em saúde psicossocial da empresa."}
        </p>

        {/* Quick filter by cycle when viewing general kanban */}
        {!currentSurvey && (companyCycles ?? []).length > 0 && (
          <CycleFilterPills
            cycles={companyCycles ?? []}
            currentCycleId={cycleId}
            basePath="/kanban"
            className="mt-3 pt-1"
          />
        )}
      </div>

      <KanbanBoard
        columns={kanbanColumns}
        tasks={(tasks ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          columnId: t.column_id,
          dueDate: t.due_date,
          dimensionName:
            (t.questionnaire_scales as unknown as { name: string })?.name ?? null,
          surveyTitle:
            (t.surveys as unknown as { title: string } | null)?.title ?? null,
          sourceSurveyId: t.source_survey_id,
          assigneeName:
            (t.users as unknown as { name: string })?.name ?? null,
          assignedTo: t.assigned_to,
        }))}
        companyUsers={companyUsers ?? []}
        canManage={canManage}
        sourceSurveyId={currentSurvey?.id ?? null}
      />
    </div>
  );
}

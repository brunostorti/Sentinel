import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchSurveyDimensionScores } from "@/lib/copsoq/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { SurveyContextNav } from "@/components/survey-context-nav";
import { fetchCycleContextForSurvey } from "@/lib/surveys/cycle";
import { CollectionPanel } from "./collection-panel";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  ACTIVE: { label: "Em coleta", variant: "success" },
  CLOSED: { label: "Encerrada", variant: "outline" },
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "pendentes",
  APPROVED: "aprovados",
  REJECTED: "rejeitados",
  COMPLETED: "concluídos",
  AI_GENERATION_FAILED: "falha",
};

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function formatDate(date: string | null) {
  if (!date) return "Não informado";
  return new Date(date).toLocaleDateString("pt-BR");
}

function FlowCard({
  step,
  title,
  description,
  href,
  icon,
  badge,
  details,
  disabled = false,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  badge: { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" };
  details?: string;
  disabled?: boolean;
}) {
  const content = (
    <Card className={`h-full transition-all ${disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"}`}>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name={icon} size={21} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {step}
              </p>
              <CardTitle className="text-base font-black">{title}</CardTitle>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {details && (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs font-medium text-foreground/80">
            {details}
          </p>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
          Abrir modulo
          <Icon name="arrow_forward" size={14} />
        </span>
      </CardContent>
    </Card>
  );

  if (disabled) return <div>{content}</div>;
  return <Link href={href}>{content}</Link>;
}

export default async function SurveyFlowPage({
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
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title, status, created_at, expires_at, closed_at, version, questionnaire_instruments(name)")
    .eq("id", surveyId)
    .eq("company_id", userData.company_id)
    .maybeSingle();

  if (!survey) notFound();

  const [{ count: participantCount }, { count: responseCount }, { data: targets }] =
    await Promise.all([
      supabase
        .from("survey_participants")
        .select("*", { count: "exact", head: true })
        .eq("survey_id", surveyId),
      supabase
        .from("survey_responses")
        .select("*", { count: "exact", head: true })
        .eq("survey_id", surveyId),
      supabase
        .from("survey_target_departments")
        .select("departments(name)")
        .eq("survey_id", surveyId),
    ]);

  const [{ data: planRows }, { data: taskRows }, { data: certificateRows }] =
    await Promise.all([
      supabase
        .from("action_plans")
        .select("id, status")
        .eq("survey_id", surveyId)
        .eq("company_id", userData.company_id),
      supabase
        .from("kanban_tasks")
        .select("id, column_id, action_plan_id")
        .eq("source_survey_id", surveyId)
        .eq("company_id", userData.company_id),
      supabase
        .from("certificates")
        .select("id, issued_at")
        .eq("survey_id", surveyId)
        .eq("company_id", userData.company_id),
    ]);

  const cycleContext = await fetchCycleContextForSurvey(
    supabase,
    surveyId,
    userData.company_id
  );

  const scoresResult = await fetchSurveyDimensionScores(supabase, surveyId);
  const scores = scoresResult.scores;
  const redCount = scores.filter((s) => s.trafficLight === "RED").length;
  const yellowCount = scores.filter((s) => s.trafficLight === "YELLOW").length;
  const riskCount = redCount + yellowCount;

  const canManage = userData.role === "HR" || userData.role === "ADMIN";
  const totalParticipants = participantCount ?? 0;
  const totalResponses = responseCount ?? 0;
  const responseRate = pct(totalResponses, totalParticipants);
  const status = STATUS_LABELS[survey.status] ?? { label: survey.status, variant: "outline" as const };
  const instrument = Array.isArray(survey.questionnaire_instruments)
    ? survey.questionnaire_instruments[0]?.name
    : (survey.questionnaire_instruments as { name?: string } | null)?.name;

  const targetNames = ((targets ?? []) as unknown as { departments: { name: string } | null }[])
    .map((t) => t.departments?.name)
    .filter(Boolean) as string[];

  const plans = planRows ?? [];
  const planCounts = plans.reduce<Record<string, number>>((acc, plan) => {
    acc[plan.status] = (acc[plan.status] ?? 0) + 1;
    return acc;
  }, {});
  const approvedOrDone = (planCounts.APPROVED ?? 0) + (planCounts.COMPLETED ?? 0);
  const tasks = taskRows ?? [];
  const certificates = certificateRows ?? [];

  const planSummary =
    plans.length === 0
      ? survey.status === "CLOSED"
        ? "Nenhum plano gerado ainda"
        : "Disponível após encerrar a pesquisa"
      : Object.entries(planCounts)
          .map(([key, value]) => `${value} ${PLAN_STATUS_LABELS[key] ?? key.toLowerCase()}`)
          .join(" · ");

  return (
    <div className="space-y-6">
      <SurveyContextNav
        surveyId={survey.id}
        surveyTitle={survey.title}
        status={survey.status}
        current="fluxo"
        cycleId={cycleContext?.cycleId}
        cycleTitle={cycleContext?.cycleTitle}
        stageLabel={cycleContext?.stageLabel}
      />

      <div className="animate-fade-in-up">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="outline">{instrument ?? "Instrumento"}</Badge>
              <Badge variant="outline">{targetNames.length > 0 ? `${targetNames.length} setor(es)` : "Todos os setores"}</Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight">{survey.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Fluxo conectado desta pesquisa: coleta, dashboard, planos de ação,
              Kanban, relatórios e certificado partem do mesmo ciclo.
            </p>
          </div>

          <div className="grid min-w-full grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm lg:min-w-[360px]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Respostas
              </p>
              <p className="text-xl font-black">{totalResponses}/{totalParticipants}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Adesão
              </p>
              <p className="text-xl font-black">{responseRate}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Criada
              </p>
              <p className="font-semibold">{formatDate(survey.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Encerramento
              </p>
              <p className="font-semibold">{survey.status === "CLOSED" ? formatDate(survey.closed_at) : formatDate(survey.expires_at)}</p>
            </div>
          </div>
        </div>
      </div>

      <CollectionPanel
        surveyId={survey.id}
        status={survey.status}
        responded={totalResponses}
        invited={totalParticipants}
        responseRate={responseRate}
        expiresAt={survey.expires_at}
        closedAt={survey.closed_at}
        canManage={canManage}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FlowCard
          step="1. Coleta"
          title="Pesquisa"
          icon="assignment"
          href="/gerenciar-pesquisas"
          badge={{ label: status.label, variant: status.variant }}
          description="Acompanhe convites, status da coleta, setores envolvidos e prazo do ciclo."
          details={`${totalResponses}/${totalParticipants} respostas registradas (${responseRate}%).`}
        />

        <FlowCard
          step="2. Dashboard"
          title="Dashboard da pesquisa"
          icon="monitoring"
          href={`/gerenciar-pesquisas/${survey.id}/dashboard`}
          badge={{
            label: scoresResult.isAnonymized
              ? "Anonimizado"
              : scores.length > 0
                ? "Calculado"
                : "Sem dados",
            variant: scores.length > 0 ? "success" : "warning",
          }}
          description="Veja os indicadores, semáforos de risco e comparação por setor para esta pesquisa."
          details={
            scoresResult.isAnonymized
              ? "Menos de 5 respostas: dados protegidos pela regra de anonimato."
              : scores.length > 0
                ? `${redCount} risco(s) crítico(s) e ${yellowCount} intermediário(s).`
                : "Ainda não há respostas suficientes para diagnóstico."
          }
        />

        <FlowCard
          step="3. Plano"
          title="Planos de ação"
          icon="lightbulb"
          href={`/planos-acao/pesquisa/${survey.id}`}
          badge={{
            label: plans.length > 0 ? `${plans.length} plano(s)` : "Pendente",
            variant: plans.length > 0 ? "success" : "warning",
          }}
          description="Revise, aprove ou gere os planos derivados dos riscos encontrados neste ciclo."
          details={planSummary}
        />

        <FlowCard
          step="4. Kanban"
          title="Kanban do ciclo"
          icon="view_kanban"
          href={`/kanban?surveyId=${survey.id}`}
          badge={{
            label: tasks.length > 0 ? `${tasks.length} tarefa(s)` : "Sem tarefas",
            variant: tasks.length > 0 ? "success" : "outline",
          }}
          description="Acompanhe as tarefas criadas a partir dos planos aprovados desta pesquisa."
          details={`${approvedOrDone} plano(s) aprovado(s) ou concluídos alimentando o Kanban.`}
        />

        <FlowCard
          step="5. Evidências"
          title="Relatório"
          icon="summarize"
          href={`/relatorios?surveyId=${survey.id}`}
          badge={{
            label: scores.length > 0 ? "Exportável" : "Aguardando",
            variant: scores.length > 0 ? "success" : "warning",
          }}
          description="Exporte PDF ou CSV com os resultados e a participação desta pesquisa."
          details={riskCount > 0 ? `${riskCount} dimensão(ões) exigem atenção.` : "Sem dimensões em risco calculadas."}
        />

        <FlowCard
          step="6. Certificado"
          title="Certificado NR1"
          icon="verified"
          href={`/certificados?surveyId=${survey.id}`}
          badge={{
            label: certificates.length > 0 ? "Emitido" : "Não emitido",
            variant: certificates.length > 0 ? "success" : survey.status === "CLOSED" ? "warning" : "outline",
          }}
          description="Emita ou consulte o certificado relacionado exclusivamente a esta pesquisa."
          details={
            certificates.length > 0
              ? `Última emissão em ${formatDate(certificates[0]?.issued_at ?? null)}.`
              : survey.status === "CLOSED"
                ? "Disponível se passar nas regras de emissão do certificado."
                : "Disponível após o encerramento da pesquisa."
          }
        />
      </div>
    </div>
  );
}

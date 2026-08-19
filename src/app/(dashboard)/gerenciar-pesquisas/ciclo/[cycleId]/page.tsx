import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  fetchSurveyDimensionScores,
  fetchHistoricalTrends,
} from "@/lib/copsoq/dashboard";
import { computeHealthIndex, getHealthColor } from "@/lib/copsoq/health-index";
import type { DimensionScore } from "@/lib/copsoq/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { TrendsChart } from "../../../painel/trends-chart";
import { fetchCycleDetail } from "@/lib/surveys/cycle";
import type { CycleSurvey } from "@/lib/surveys/cycle";
import { CreateFollowUpButton } from "./create-follow-up-button";
import { CycleTabs } from "./cycle-tabs";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; dot: string }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary", dot: "bg-gray-400" },
  ACTIVE: { label: "Em coleta", variant: "default", dot: "bg-emerald-500" },
  CLOSED: { label: "Encerrada", variant: "outline", dot: "bg-muted-foreground" },
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

type ScoreResult = { scores: DimensionScore[]; isAnonymized: boolean };

/** Uma pesquisa do ciclo cruzada com o resultado do seu diagnóstico. */
interface SurveyComparison {
  survey: CycleSurvey;
  healthIndex: number | null;
  riskCount: number | null;
  isAnonymized: boolean;
  hasCertificate: boolean;
}

interface ConformityCheck {
  title: string;
  detail: string;
  done: boolean;
}

interface ConformityStage {
  number: string;
  label: string;
  description: string;
  icon: string;
  checks: ConformityCheck[];
}

function SurveyCard({ survey }: { survey: CycleSurvey }) {
  const status = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.DRAFT;
  return (
    <Link
      href={`/gerenciar-pesquisas/${survey.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {survey.stageLabel}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold">{survey.title}</h3>
        </div>
        <Badge variant={status.variant} className="shrink-0 gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
        <div>
          <p className="font-black">
            {survey.responded}/{survey.invited}
          </p>
          <p className="text-[10px] text-muted-foreground">Respostas</p>
        </div>
        <div>
          <p className="font-black">{survey.responseRate}%</p>
          <p className="text-[10px] text-muted-foreground">Adesão</p>
        </div>
        <div>
          <p className="font-black">{survey.planCount}</p>
          <p className="text-[10px] text-muted-foreground">Planos</p>
        </div>
      </div>

      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
        Entrar nesta pesquisa
        <Icon name="arrow_forward" size={13} />
      </span>
    </Link>
  );
}

function OverviewStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <Icon name={icon} size={16} className="text-muted-foreground" />
      <p className="mt-1 text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ConformityTimeline({ stages }: { stages: ConformityStage[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-8">
        {stages.map((stage) => {
          const stageDone = stage.checks.filter((c) => c.done).length;
          const complete = stageDone === stage.checks.length;
          const partial = !complete && stageDone > 0;
          return (
            <div key={stage.number} className="relative pl-12">
              <div
                className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-card text-sm font-black ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : partial
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {complete ? <Icon name="check" size={18} /> : stage.number}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3 pt-1.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Etapa {stage.number} · {stage.label}
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                <Badge variant={complete ? "default" : "secondary"} className="shrink-0">
                  {stageDone}/{stage.checks.length} evidências
                </Badge>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
                {stage.checks.map((check, i) => (
                  <div
                    key={check.title}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-border/60" : ""
                    } ${check.done ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        check.done
                          ? "bg-emerald-500 text-white"
                          : "border-2 border-dashed border-muted-foreground/30 text-transparent"
                      }`}
                    >
                      <Icon name="check" size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold ${
                          check.done ? "" : "text-muted-foreground"
                        }`}
                      >
                        {check.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function CycleHubPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
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

  const cycle = await fetchCycleDetail(supabase, cycleId, userData.company_id);
  if (!cycle) notFound();

  const canManage = userData.role === "HR" || userData.role === "ADMIN";
  const latest = cycle.latestSurvey;
  const latestStatus = STATUS_CONFIG[latest.status] ?? STATUS_CONFIG.DRAFT;
  const surveyIds = cycle.surveys.map((s) => s.id);

  const [{ data: planRows }, { data: taskRows }, { data: certRows }] =
    await Promise.all([
      supabase
        .from("action_plans")
        .select("id, status, survey_id")
        .eq("company_id", userData.company_id)
        .in("survey_id", surveyIds),
      supabase
        .from("kanban_tasks")
        .select("id, source_survey_id")
        .eq("company_id", userData.company_id)
        .in("source_survey_id", surveyIds),
      supabase
        .from("certificates")
        .select("id, survey_id, issued_at")
        .eq("company_id", userData.company_id)
        .in("survey_id", surveyIds)
        .order("issued_at", { ascending: false }),
    ]);

  const plans = planRows ?? [];
  const tasks = taskRows ?? [];
  const certificates = certRows ?? [];
  const certificateSurveyIds = new Set(certificates.map((c) => c.survey_id));

  const approvedPlans = plans.filter((p) =>
    ["APPROVED", "COMPLETED"].includes(p.status)
  ).length;
  const pendingPlans = plans.filter((p) => p.status === "PENDING_REVIEW").length;

  // Diagnóstico de cada pesquisa encerrada. São poucas por ciclo, então buscar
  // em paralelo é mais simples do que adivinhar quais têm dados.
  const closed = cycle.surveys.filter((s) => s.status === "CLOSED");
  const closedScores = await Promise.all(
    closed.map((s) => fetchSurveyDimensionScores(supabase, s.id))
  );
  const scoreById = new Map<string, ScoreResult>();
  closed.forEach((s, i) => scoreById.set(s.id, closedScores[i]));

  const comparisons: SurveyComparison[] = cycle.surveys.map((survey) => {
    const result = scoreById.get(survey.id);
    const usable = Boolean(
      result && !result.isAnonymized && result.scores.length > 0
    );
    return {
      survey,
      healthIndex: usable ? computeHealthIndex(result!.scores) : null,
      riskCount: usable
        ? result!.scores.filter(
            (s) => s.trafficLight === "RED" || s.trafficLight === "YELLOW"
          ).length
        : null,
      isAnonymized: result?.isAnonymized ?? false,
      hasCertificate: certificateSurveyIds.has(survey.id),
    };
  });

  // Só compara quem tem diagnóstico calculado: a variação entre a primeira e a
  // última medição com dados é a resposta a "os riscos diminuíram?".
  const measured = comparisons.filter((c) => c.healthIndex !== null);
  const first = measured[0] ?? null;
  const last = measured.length > 1 ? measured[measured.length - 1] : null;
  const healthDelta =
    first && last ? last.healthIndex! - first.healthIndex! : null;
  const riskDelta = first && last ? last.riskCount! - first.riskCount! : null;

  const totalResponses = cycle.surveys.reduce((sum, s) => sum + s.responded, 0);
  const totalInvited = cycle.surveys.reduce((sum, s) => sum + s.invited, 0);

  const trendData = await fetchHistoricalTrends(
    supabase,
    userData.company_id,
    cycleId
  );

  // Etapas do PGR: identificar o risco, agir sobre ele e comprovar que a ação
  // funcionou. O ciclo acumula essas evidências ao longo do tempo.
  const stages: ConformityStage[] = [
    {
      number: "1",
      label: "Identificação e avaliação",
      description:
        "Levantar os riscos psicossociais com instrumento validado e participação dos trabalhadores.",
      icon: "search",
      checks: [
        {
          title: "Pesquisa base aplicada",
          detail: "O ciclo tem uma primeira medição estruturada.",
          done: cycle.surveys.length >= 1,
        },
        {
          title: "Participação registrada",
          detail: `${totalResponses} de ${totalInvited} convidados responderam.`,
          done: totalResponses > 0,
        },
        {
          title: "Diagnóstico consolidado",
          detail: "Ao menos uma coleta encerrada com resultado calculado.",
          done: measured.length > 0,
        },
      ],
    },
    {
      number: "2",
      label: "Medidas de controle",
      description:
        "Converter os riscos encontrados em ações com responsável e prazo definidos.",
      icon: "lightbulb",
      checks: [
        {
          title: "Planos de ação gerados",
          detail: `${plans.length} plano(s) derivados dos riscos do ciclo.`,
          done: plans.length > 0,
        },
        {
          title: "Planos revisados pela gestão",
          detail:
            pendingPlans > 0
              ? `${pendingPlans} plano(s) ainda aguardam aprovação.`
              : `${approvedPlans} plano(s) aprovados.`,
          done: approvedPlans > 0,
        },
        {
          title: "Execução acompanhada",
          detail: `${tasks.length} tarefa(s) no Kanban vinculadas a este ciclo.`,
          done: tasks.length > 0,
        },
      ],
    },
    {
      number: "3",
      label: "Monitoramento da eficácia",
      description:
        "Reavaliar depois das ações para comprovar que os riscos de fato diminuíram.",
      icon: "repeat",
      checks: [
        {
          title: "Reavaliação aplicada",
          detail: "Uma segunda medição permite comparar antes e depois.",
          done: cycle.surveys.length > 1,
        },
        {
          title: "Comparação disponível",
          detail:
            measured.length > 1
              ? "Duas medições com dados suficientes para comparar."
              : "Precisa de duas coletas encerradas com respostas suficientes.",
          done: measured.length > 1,
        },
        {
          title: "Certificado emitido",
          detail:
            certificates.length > 0
              ? `Última emissão em ${formatDate(certificates[0].issued_at)}.`
              : "Documento final gerado após as validações.",
          done: certificates.length > 0,
        },
      ],
    },
  ];

  const allChecks = stages.flatMap((s) => s.checks);
  const doneChecks = allChecks.filter((c) => c.done).length;
  const conformityPct = Math.round((doneChecks / allChecks.length) * 100);

  const visaoGeral = (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black">Números do ciclo</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Somados de todas as pesquisas deste ciclo.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <OverviewStat
              icon="assignment"
              label="Pesquisas"
              value={String(cycle.surveys.length)}
              detail={`${measured.length} com diagnóstico`}
            />
            <OverviewStat
              icon="group"
              label="Respostas"
              value={String(totalResponses)}
              detail={`de ${totalInvited} convidados`}
            />
            <OverviewStat
              icon="lightbulb"
              label="Planos"
              value={String(plans.length)}
              detail={
                pendingPlans > 0
                  ? `${pendingPlans} a revisar`
                  : `${approvedPlans} aprovados`
              }
            />
            <OverviewStat
              icon="view_kanban"
              label="Tarefas"
              value={String(tasks.length)}
              detail="no Kanban"
            />
            <OverviewStat
              icon="verified"
              label="Certificados"
              value={String(certificates.length)}
              detail={
                certificates.length > 0
                  ? formatDate(certificates[0].issued_at)
                  : "nenhum emitido"
              }
            />
          </div>
        </CardContent>
      </Card>

      {trendData.surveys.length >= 2 && (
        <TrendsChart
          surveys={trendData.surveys}
          dimensions={trendData.dimensions}
        />
      )}
    </div>
  );

  const comparacao = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black">
          Comparação entre pesquisas
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {measured.length > 1
            ? "Como cada medição se saiu, lado a lado."
            : "Com duas coletas encerradas, esta tela passa a mostrar a variação entre elas."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthDelta !== null && riskDelta !== null && first && last && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Índice de saúde
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black">
                  {first.healthIndex} → {last.healthIndex}
                </span>
                <span
                  className={`text-sm font-bold ${
                    healthDelta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : healthDelta < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {healthDelta > 0 ? "+" : ""}
                  {healthDelta} pts
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {first.survey.stageLabel} vs {last.survey.stageLabel}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Dimensões em atenção
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black">
                  {first.riskCount} → {last.riskCount}
                </span>
                <span
                  className={`text-sm font-bold ${
                    riskDelta < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : riskDelta > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {riskDelta > 0 ? "+" : ""}
                  {riskDelta}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Menos dimensões em atenção indica melhora
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Pesquisa
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Adesão
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Índice
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Em atenção
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Planos
                </th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Certificado
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const status =
                  STATUS_CONFIG[c.survey.status] ?? STATUS_CONFIG.DRAFT;
                const health =
                  c.healthIndex !== null ? getHealthColor(c.healthIndex) : null;
                return (
                  <tr key={c.survey.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/gerenciar-pesquisas/${c.survey.id}`}
                        className="font-bold hover:text-primary"
                      >
                        {c.survey.stageLabel}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.survey.closed_at ?? c.survey.created_at)}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={status.variant} className="gap-1">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {c.survey.responseRate}%
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({c.survey.responded}/{c.survey.invited})
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {c.healthIndex !== null && health ? (
                        <span
                          className="font-black tabular-nums"
                          style={{ color: health.color }}
                        >
                          {c.healthIndex}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.isAnonymized ? "anonimizado" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {c.riskCount !== null ? (
                        c.riskCount
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {c.survey.planCount}
                    </td>
                    <td className="py-2.5">
                      {c.hasCertificate ? (
                        <Icon
                          name="verified"
                          size={18}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const conformidade = (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black">
              Conformidade NR-1 / PGR
            </CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              As evidências que este ciclo acumula, na sequência exigida:
              identificar o risco, agir sobre ele e comprovar que a ação
              funcionou.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/70 bg-muted/30 px-5 py-3 text-center">
            <p className="text-3xl font-black leading-none text-primary">
              {conformityPct}%
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {doneChecks} de {allChecks.length} evidências
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${conformityPct}%` }}
          />
        </div>
      </CardHeader>

      <CardContent>
        <ConformityTimeline stages={stages} />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho do ciclo */}
      <div className="animate-fade-in-up">
        <Link
          href="/gerenciar-pesquisas"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" size={14} />
          Ciclos
        </Link>

        <div className="mt-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Icon name="account_tree" size={12} />
              {cycle.surveys.length} pesquisa(s)
            </Badge>
            <Badge variant={latestStatus.variant} className="gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${latestStatus.dot}`} />
              Última: {latestStatus.label}
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight">{cycle.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Acompanha o mesmo grupo ao longo do tempo: diagnóstico, ações e
            reavaliação para comprovar se os riscos diminuíram.
          </p>
        </div>
      </div>

      {/* Pesquisas do ciclo: fora das abas, é por onde se entra */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black">
                Pesquisas deste ciclo
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre numa pesquisa para acompanhar a coleta e ver dashboard,
                planos, relatório e certificado só daquela etapa.
              </p>
            </div>
            {canManage && (
              <CreateFollowUpButton
                cycleId={cycle.id}
                canCreate={latest.status === "CLOSED"}
                blockedReason="Encerre a pesquisa atual para reavaliar"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cycle.surveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        </CardContent>
      </Card>

      <CycleTabs
        tabs={[
          {
            id: "visao-geral",
            label: "Visão geral",
            icon: "dashboard",
            content: visaoGeral,
          },
          {
            id: "comparacao",
            label: "Comparação",
            icon: "compare_arrows",
            content: comparacao,
          },
          {
            id: "conformidade",
            label: "Conformidade",
            icon: "verified_user",
            content: conformidade,
          },
        ]}
      />
    </div>
  );
}

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
import {
  fetchCycleDetail,
  computeCycleConformity,
  resolveCertificateTier,
} from "@/lib/surveys/cycle";
import type { CycleSurvey, ConformityStage } from "@/lib/surveys/cycle";
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
}

function SurveyCard({ survey }: { survey: CycleSurvey }) {
  const status = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.DRAFT;
  const isActive = survey.status === "ACTIVE";
  return (
    <Link
      href={`/gerenciar-pesquisas/${survey.id}`}
      className={`group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-primary/30 shadow-sm"
          : "border-border hover:border-primary/30"
      }`}
    >
      <div className={`h-1 ${status.dot}`} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {survey.stageLabel}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-bold">
              {survey.title}
            </h3>
          </div>
          <Badge variant={status.variant} className="shrink-0 gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status.dot} ${
                isActive ? "animate-pulse-soft" : ""
              }`}
            />
            {status.label}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
          <div>
            <p className="font-black tabular-nums">
              {survey.responded}/{survey.invited}
            </p>
            <p className="text-[10px] text-muted-foreground">Respostas</p>
          </div>
          <div>
            <p className="font-black tabular-nums">{survey.responseRate}%</p>
            <p className="text-[10px] text-muted-foreground">Adesão</p>
          </div>
          <div>
            <p className="font-black tabular-nums">{survey.planCount}</p>
            <p className="text-[10px] text-muted-foreground">Planos</p>
          </div>
        </div>

        {survey.invited > 0 && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                survey.status === "CLOSED" ? "bg-muted-foreground/40" : "bg-primary"
              }`}
              style={{ width: `${Math.min(survey.responseRate, 100)}%` }}
            />
          </div>
        )}

        <span className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 text-sm font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          Entrar nesta pesquisa
          <Icon name="arrow_forward" size={15} />
        </span>
      </div>
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
    <div className="rounded-xl border border-border/70 bg-muted/25 p-4 transition-colors hover:border-primary/25">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-2.5 text-3xl font-black leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {detail && (
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      )}
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
        .select("id, issued_at, tier")
        .eq("company_id", userData.company_id)
        .eq("cycle_id", cycleId)
        .order("issued_at", { ascending: false }),
    ]);

  const plans = planRows ?? [];
  const tasks = taskRows ?? [];
  const certificates = certRows ?? [];

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

  const latestMeasured = measured.length > 0 ? measured[measured.length - 1] : null;

  const totalResponses = cycle.surveys.reduce((sum, s) => sum + s.responded, 0);
  const totalInvited = cycle.surveys.reduce((sum, s) => sum + s.invited, 0);

  const trendData = await fetchHistoricalTrends(
    supabase,
    userData.company_id,
    cycleId
  );

  // Etapas do PGR: identificar o risco, agir sobre ele e comprovar que a ação
  // funcionou. Função compartilhada com o gerador de certificado — as duas
  // telas nunca podem discordar sobre o que já foi cumprido.
  const { stages, doneChecks, totalChecks, conformityPct } =
    computeCycleConformity({
      cycle,
      measuredCount: measured.length,
      plansTotal: plans.length,
      plansApproved: approvedPlans,
      plansPending: pendingPlans,
      tasksTotal: tasks.length,
      totalResponses,
      totalInvited,
      certificatesIssued: certificates.length,
      latestCertificateIssuedAt: certificates[0]?.issued_at ?? null,
    });

  const certificateTier = resolveCertificateTier(stages);
  const TIER_LABEL: Record<1 | 2 | 3, string> = {
    1: "Nível 1 — Avaliação Realizada",
    2: "Nível 2 — Plano de Ação Implementado",
    3: "Nível 3 — Ciclo de Melhoria Comprovado",
  };

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
              {doneChecks} de {totalChecks} evidências
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

      <CardContent className="space-y-5">
        <ConformityTimeline stages={stages} />

        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            certificateTier
              ? "border-primary/25 bg-primary/5"
              : "border-dashed border-border bg-muted/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                certificateTier
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon name="verified" size={20} />
            </span>
            <div>
              <p className="text-sm font-bold">
                {certificateTier
                  ? TIER_LABEL[certificateTier]
                  : "Certificado ainda não disponível"}
              </p>
              <p className="text-xs text-muted-foreground">
                {certificateTier
                  ? "O certificado declara as evidências deste nível com os dados reais do ciclo."
                  : "Conclua a etapa 1 (identificação e avaliação) para emitir o primeiro nível."}
              </p>
            </div>
          </div>
          {certificateTier && (
            <Link
              href={`/certificados?cycleId=${cycle.id}`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Icon name="verified" size={15} />
              Emitir certificado
            </Link>
          )}
        </div>
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

        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-6 p-6">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Icon name="account_tree" size={12} />
                  {cycle.surveys.length} pesquisa(s)
                </Badge>
                <Badge variant={latestStatus.variant} className="gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${latestStatus.dot}`}
                  />
                  Última: {latestStatus.label}
                </Badge>
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                {cycle.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Acompanha o mesmo grupo ao longo do tempo: diagnóstico, ações e
                reavaliação para comprovar se os riscos diminuíram.
              </p>
            </div>

            {/* O indice da medicao mais recente e a resposta curta de "como
                estamos"; fica ao lado do titulo em vez de exigir uma aba. */}
            {latestMeasured && (
              <div className="shrink-0 rounded-xl border border-border/70 bg-muted/25 px-5 py-4 text-center">
                <p
                  className="text-4xl font-black leading-none"
                  style={{ color: getHealthColor(latestMeasured.healthIndex!).color }}
                >
                  {latestMeasured.healthIndex}
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Índice de saúde
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {latestMeasured.survey.stageLabel}
                </p>
              </div>
            )}
          </div>
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
            hint: "Números e evolução",
            icon: "dashboard",
            content: visaoGeral,
          },
          {
            id: "comparacao",
            label: "Comparação",
            hint:
              measured.length > 1
                ? "Antes e depois das ações"
                : "Disponível com 2 coletas",
            icon: "compare_arrows",
            content: comparacao,
          },
          {
            id: "conformidade",
            label: "Conformidade",
            hint: `${conformityPct}% das evidências`,
            icon: "verified_user",
            content: conformidade,
          },
        ]}
      />
    </div>
  );
}

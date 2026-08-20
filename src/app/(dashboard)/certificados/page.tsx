import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import {
  fetchCyclesWithSurveys,
  computeCycleConformity,
  resolveCertificateTier,
} from "@/lib/surveys/cycle";
import type { Cycle } from "@/lib/surveys/cycle";
import { fetchSurveyDimensionScores } from "@/lib/copsoq/dashboard";
import { GenerateCertificateButton } from "./generate-certificate-button";

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: "Nível 1 — Avaliação Realizada",
  2: "Nível 2 — Plano de Ação Implementado",
  3: "Nível 3 — Ciclo de Melhoria Comprovado",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

interface IssuedCertificate {
  id: string;
  issued_at: string;
  tier: number;
  unique_hash: string;
}

interface CycleCertInfo {
  cycle: Cycle;
  tier: 1 | 2 | 3 | null;
  conformityPct: number;
  issuedCertificates: IssuedCertificate[];
}

/**
 * Monta o nível de certificado de cada ciclo em lote — mesmo padrão de
 * `fetchCyclesWithSurveys` (poucas consultas, agregadas em memória, em vez de
 * uma consulta por ciclo).
 */
async function buildCertInfo(
  supabase: SupabaseClient,
  companyId: string,
  cycles: Cycle[]
): Promise<CycleCertInfo[]> {
  if (cycles.length === 0) return [];

  const allSurveyIds = cycles.flatMap((c) => c.surveys.map((s) => s.id));
  const cycleIds = cycles.map((c) => c.id);

  const [{ data: planRows }, { data: taskRows }, { data: certRows }] = await Promise.all([
    supabase
      .from("action_plans")
      .select("survey_id, status")
      .eq("company_id", companyId)
      .in("survey_id", allSurveyIds),
    supabase
      .from("kanban_tasks")
      .select("source_survey_id")
      .eq("company_id", companyId)
      .in("source_survey_id", allSurveyIds),
    supabase
      .from("certificates")
      .select("id, cycle_id, issued_at, tier, unique_hash")
      .eq("company_id", companyId)
      .in("cycle_id", cycleIds)
      .order("issued_at", { ascending: false }),
  ]);

  const surveyToCycle = new Map<string, string>();
  for (const cycle of cycles) {
    for (const survey of cycle.surveys) surveyToCycle.set(survey.id, cycle.id);
  }

  const plansByCycle = new Map<string, { status: string }[]>();
  for (const row of planRows ?? []) {
    const cycleId = surveyToCycle.get(row.survey_id);
    if (!cycleId) continue;
    const list = plansByCycle.get(cycleId) ?? [];
    list.push(row);
    plansByCycle.set(cycleId, list);
  }

  const tasksByCycle = new Map<string, number>();
  for (const row of taskRows ?? []) {
    const cycleId = surveyToCycle.get(row.source_survey_id);
    if (!cycleId) continue;
    tasksByCycle.set(cycleId, (tasksByCycle.get(cycleId) ?? 0) + 1);
  }

  const certsByCycle = new Map<string, IssuedCertificate[]>();
  for (const row of certRows ?? []) {
    const list = certsByCycle.get(row.cycle_id) ?? [];
    list.push(row);
    certsByCycle.set(row.cycle_id, list);
  }

  // Diagnóstico por pesquisa encerrada — mesmo cálculo que o hub do ciclo
  // usa (respeita a regra dos 5), feito em lote pra empresa toda de uma vez.
  const closedSurveys = cycles.flatMap((c) => c.surveys.filter((s) => s.status === "CLOSED"));
  const scoreResults = await Promise.all(
    closedSurveys.map((s) => fetchSurveyDimensionScores(supabase, s.id))
  );
  const scoreById = new Map<string, Awaited<ReturnType<typeof fetchSurveyDimensionScores>>>();
  closedSurveys.forEach((s, i) => scoreById.set(s.id, scoreResults[i]));

  return cycles.map((cycle) => {
    const plans = plansByCycle.get(cycle.id) ?? [];
    const approvedPlans = plans.filter((p) => ["APPROVED", "COMPLETED"].includes(p.status)).length;
    const pendingPlans = plans.filter((p) => p.status === "PENDING_REVIEW").length;
    const tasksTotal = tasksByCycle.get(cycle.id) ?? 0;
    const issuedCertificates = certsByCycle.get(cycle.id) ?? [];

    const measuredCount = cycle.surveys.filter((s) => {
      const result = scoreById.get(s.id);
      return Boolean(result && !result.isAnonymized && result.scores.length > 0);
    }).length;

    const totalResponses = cycle.surveys.reduce((sum, s) => sum + s.responded, 0);
    const totalInvited = cycle.surveys.reduce((sum, s) => sum + s.invited, 0);

    const { stages, conformityPct } = computeCycleConformity({
      cycle,
      measuredCount,
      plansTotal: plans.length,
      plansApproved: approvedPlans,
      plansPending: pendingPlans,
      tasksTotal,
      totalResponses,
      totalInvited,
      certificatesIssued: issuedCertificates.length,
      latestCertificateIssuedAt: issuedCertificates[0]?.issued_at ?? null,
    });

    return {
      cycle,
      tier: resolveCertificateTier(stages),
      conformityPct,
      issuedCertificates,
    };
  });
}

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams?: Promise<{ cycleId?: string }>;
}) {
  const params = await searchParams;
  const cycleIdFilter = params?.cycleId ?? null;

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

  const canManage = userData.role === "HR" || userData.role === "ADMIN";

  const allCycles = await fetchCyclesWithSurveys(supabase, userData.company_id);
  const cycles = cycleIdFilter ? allCycles.filter((c) => c.id === cycleIdFilter) : allCycles;

  const info = await buildCertInfo(supabase, userData.company_id, cycles);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        {cycleIdFilter && (
          <Link
            href={`/gerenciar-pesquisas/ciclo/${cycleIdFilter}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="arrow_back" size={14} />
            Voltar ao ciclo
          </Link>
        )}
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {cycleIdFilter ? "Certificado do ciclo" : "Certificados"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cycleIdFilter
            ? "Emita ou consulte o certificado deste ciclo."
            : "O certificado é por ciclo, não por pesquisa: quanto mais etapas do PGR o ciclo cumpriu, mais completo o nível emitido."}
        </p>
      </div>

      {info.length === 0 ? (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="verified" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            {cycleIdFilter ? "Ciclo não encontrado" : "Nenhum ciclo criado ainda"}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            O certificado fica disponível assim que a etapa de identificação e avaliação do ciclo estiver completa.
          </p>
        </div>
      ) : (
        <div className="stagger-children grid gap-4 xl:grid-cols-2">
          {info.map(({ cycle, tier, conformityPct, issuedCertificates }) => (
            <Card key={cycle.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-black">{cycle.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cycle.surveys.length} pesquisa(s) · {conformityPct}% de conformidade
                    </p>
                  </div>
                  {canManage && (
                    <GenerateCertificateButton
                      cycleId={cycle.id}
                      cycleTitle={cycle.title}
                      disabled={!tier}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={tier ? "default" : "secondary"} className="gap-1">
                  <Icon name="verified" size={12} />
                  {tier ? TIER_LABEL[tier] : "Ainda não elegível"}
                </Badge>

                {!tier && (
                  <p className="text-xs text-muted-foreground">
                    Conclua a identificação e avaliação (etapa 1 do ciclo) para liberar o primeiro nível.
                  </p>
                )}

                {issuedCertificates.length > 0 && (
                  <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Certificados já emitidos
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                      {issuedCertificates.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-muted-foreground">
                            {TIER_LABEL[c.tier as 1 | 2 | 3]} · {formatDate(c.issued_at)}
                          </span>
                          <Link
                            href={`/validacao/${c.unique_hash}`}
                            target="_blank"
                            className="shrink-0 font-bold text-primary hover:underline"
                          >
                            Ver validação
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!cycleIdFilter && (
                  <Link
                    href={`/gerenciar-pesquisas/ciclo/${cycle.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Ver conformidade completa no ciclo
                    <Icon name="arrow_forward" size={12} />
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

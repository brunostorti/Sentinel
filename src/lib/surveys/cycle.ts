import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Camada de dados dos ciclos de pesquisa.
 *
 * Um ciclo agrupa a pesquisa base e suas reavaliações posteriores. Desde a
 * migration 016 o vínculo é explícito (`surveys.cycle_id`), então tudo aqui é
 * consulta direta — nenhuma heurística de título. A ordem das pesquisas dentro
 * do ciclo é sempre `created_at` crescente: a primeira é a base, as seguintes
 * são as reavaliações.
 */

export interface CycleSurvey {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  closed_at: string | null;
  version: string | null;
  instrumentName: string | null;
  /** Rótulo da etapa: "Pesquisa base", "1ª reavaliação", ... */
  stageLabel: string;
  invited: number;
  responded: number;
  responseRate: number;
  planCount: number;
}

export interface Cycle {
  id: string;
  title: string;
  created_at: string;
  surveys: CycleSurvey[];
  /** Pesquisa mais recente — define o status e a próxima ação do ciclo. */
  latestSurvey: CycleSurvey;
  baseSurvey: CycleSurvey;
}

export interface ConformityCheck {
  title: string;
  detail: string;
  done: boolean;
}

export interface ConformityStage {
  number: string;
  label: string;
  description: string;
  icon: string;
  checks: ConformityCheck[];
}

export interface CycleConformityInput {
  cycle: Cycle;
  /** Nº de pesquisas do ciclo com diagnóstico calculado (encerrada, não
   *  anonimizada, com escores). */
  measuredCount: number;
  plansTotal: number;
  plansApproved: number;
  plansPending: number;
  tasksTotal: number;
  totalResponses: number;
  totalInvited: number;
  certificatesIssued: number;
  latestCertificateIssuedAt: string | null;
}

export interface CycleConformityResult {
  stages: ConformityStage[];
  doneChecks: number;
  totalChecks: number;
  conformityPct: number;
}

/**
 * Rótulo da etapa dentro do ciclo.
 *
 * O índice 0 é a pesquisa base; os demais são numerados pela ordem de
 * reavaliação (índice 1 → "1ª reavaliação"), e não pela posição absoluta —
 * numerar pela posição faria a primeira reavaliação aparecer como "2".
 */
export function getStageLabel(index: number): string {
  if (index === 0) return "Pesquisa base";
  return `${index}ª reavaliação`;
}

/** Versão compacta, para linhas do tempo e chips estreitos. */
export function getStageShortLabel(index: number): string {
  return index === 0 ? "Base" : `R${index}`;
}

export function getResponseRate(responded: number, invited: number): number {
  if (invited <= 0) return 0;
  return Math.round((responded / invited) * 100);
}

interface SurveyRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  closed_at: string | null;
  version: string | null;
  cycle_id: string;
  questionnaire_instruments: { name?: string } | { name?: string }[] | null;
}

function instrumentName(row: SurveyRow): string | null {
  const inst = Array.isArray(row.questionnaire_instruments)
    ? row.questionnaire_instruments[0]
    : row.questionnaire_instruments;
  return inst?.name ?? null;
}

/**
 * Monta os ciclos da empresa com suas pesquisas e contagens.
 *
 * Faz 4 consultas no total (ciclos, pesquisas, participantes, planos) em vez
 * de N por pesquisa — as contagens são agregadas em memória, que é barato para
 * o volume de uma empresa e evita o padrão N+1.
 */
export async function fetchCyclesWithSurveys(
  supabase: SupabaseClient,
  companyId: string
): Promise<Cycle[]> {
  const { data: cycleRows } = await supabase
    .from("survey_cycles")
    .select("id, title, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!cycleRows || cycleRows.length === 0) return [];

  const { data: surveyRows } = await supabase
    .from("surveys")
    .select(
      "id, title, status, created_at, expires_at, closed_at, version, cycle_id, questionnaire_instruments(name)"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const surveys = (surveyRows ?? []) as unknown as SurveyRow[];
  const surveyIds = surveys.map((s) => s.id);

  const [participantCounts, planCounts] = await Promise.all([
    fetchParticipantCounts(supabase, surveyIds),
    fetchPlanCounts(supabase, companyId, surveyIds),
  ]);

  const surveysByCycle = new Map<string, SurveyRow[]>();
  for (const survey of surveys) {
    const list = surveysByCycle.get(survey.cycle_id) ?? [];
    list.push(survey);
    surveysByCycle.set(survey.cycle_id, list);
  }

  const cycles: Cycle[] = [];
  for (const cycleRow of cycleRows) {
    const rows = surveysByCycle.get(cycleRow.id) ?? [];
    // Um ciclo sem pesquisas não tem o que mostrar — e não deveria existir,
    // já que todo ciclo nasce junto com sua pesquisa base.
    if (rows.length === 0) continue;

    const cycleSurveys = rows.map((row, index) =>
      toCycleSurvey(row, index, participantCounts, planCounts)
    );

    cycles.push({
      id: cycleRow.id,
      title: cycleRow.title,
      created_at: cycleRow.created_at,
      surveys: cycleSurveys,
      baseSurvey: cycleSurveys[0],
      latestSurvey: cycleSurveys[cycleSurveys.length - 1],
    });
  }

  return cycles;
}

/** Um ciclo específico. Devolve null se não existir ou for de outra empresa. */
export async function fetchCycleDetail(
  supabase: SupabaseClient,
  cycleId: string,
  companyId: string
): Promise<Cycle | null> {
  const { data: cycleRow } = await supabase
    .from("survey_cycles")
    .select("id, title, created_at")
    .eq("id", cycleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!cycleRow) return null;

  const { data: surveyRows } = await supabase
    .from("surveys")
    .select(
      "id, title, status, created_at, expires_at, closed_at, version, cycle_id, questionnaire_instruments(name)"
    )
    .eq("cycle_id", cycleId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const rows = (surveyRows ?? []) as unknown as SurveyRow[];
  if (rows.length === 0) return null;

  const surveyIds = rows.map((s) => s.id);
  const [participantCounts, planCounts] = await Promise.all([
    fetchParticipantCounts(supabase, surveyIds),
    fetchPlanCounts(supabase, companyId, surveyIds),
  ]);

  const cycleSurveys = rows.map((row, index) =>
    toCycleSurvey(row, index, participantCounts, planCounts)
  );

  return {
    id: cycleRow.id,
    title: cycleRow.title,
    created_at: cycleRow.created_at,
    surveys: cycleSurveys,
    baseSurvey: cycleSurveys[0],
    latestSurvey: cycleSurveys[cycleSurveys.length - 1],
  };
}

/**
 * Contexto do ciclo a partir de uma pesquisa — usado pelo cabeçalho de
 * navegação para mostrar a trilha "Ciclo › etapa".
 */
export async function fetchCycleContextForSurvey(
  supabase: SupabaseClient,
  surveyId: string,
  companyId: string
): Promise<{
  cycleId: string;
  cycleTitle: string;
  stageLabel: string;
  totalSurveys: number;
} | null> {
  const { data: survey } = await supabase
    .from("surveys")
    .select("cycle_id, survey_cycles(title)")
    .eq("id", surveyId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!survey?.cycle_id) return null;

  const cycle = Array.isArray(survey.survey_cycles)
    ? survey.survey_cycles[0]
    : (survey.survey_cycles as { title?: string } | null);

  // Só os ids, ordenados — o índice na lista é a etapa da pesquisa.
  const { data: siblings } = await supabase
    .from("surveys")
    .select("id")
    .eq("cycle_id", survey.cycle_id)
    .order("created_at", { ascending: true });

  const ids = (siblings ?? []).map((s) => s.id);
  const index = ids.indexOf(surveyId);

  return {
    cycleId: survey.cycle_id,
    cycleTitle: cycle?.title ?? "Ciclo",
    stageLabel: getStageLabel(index < 0 ? 0 : index),
    totalSurveys: ids.length,
  };
}

/**
 * As 9 evidências de conformidade do ciclo, em 3 etapas do PGR: identificar o
 * risco, agir sobre ele, comprovar que a ação funcionou.
 *
 * Função pura — recebe os agregados já calculados pelo chamador (o hub do
 * ciclo já precisa buscar pesquisas/planos/tarefas/certificados/escores para
 * a própria tela, e o gerador de certificado precisa dos mesmos dados para
 * decidir o nível). Centralizar aqui garante que as duas telas nunca
 * discordem sobre o que já foi cumprido.
 */
export function computeCycleConformity(
  input: CycleConformityInput
): CycleConformityResult {
  const {
    cycle,
    measuredCount,
    plansTotal,
    plansApproved,
    plansPending,
    tasksTotal,
    totalResponses,
    totalInvited,
    certificatesIssued,
    latestCertificateIssuedAt,
  } = input;

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
          done: measuredCount > 0,
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
          detail: `${plansTotal} plano(s) derivados dos riscos do ciclo.`,
          done: plansTotal > 0,
        },
        {
          title: "Planos revisados pela gestão",
          detail:
            plansPending > 0
              ? `${plansPending} plano(s) ainda aguardam aprovação.`
              : `${plansApproved} plano(s) aprovados.`,
          done: plansApproved > 0,
        },
        {
          title: "Execução acompanhada",
          detail: `${tasksTotal} tarefa(s) no Kanban vinculadas a este ciclo.`,
          done: tasksTotal > 0,
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
            measuredCount > 1
              ? "Duas medições com dados suficientes para comparar."
              : "Precisa de duas coletas encerradas com respostas suficientes.",
          done: measuredCount > 1,
        },
        {
          title: "Certificado emitido",
          detail:
            certificatesIssued > 0 && latestCertificateIssuedAt
              ? `Última emissão em ${new Date(latestCertificateIssuedAt).toLocaleDateString("pt-BR")}.`
              : "Documento final gerado após as validações.",
          done: certificatesIssued > 0,
        },
      ],
    },
  ];

  const allChecks = stages.flatMap((s) => s.checks);
  const doneChecks = allChecks.filter((c) => c.done).length;
  const totalChecks = allChecks.length;
  const conformityPct = Math.round((doneChecks / totalChecks) * 100);

  return { stages, doneChecks, totalChecks, conformityPct };
}

/**
 * Nível de certificado que o ciclo sustenta agora, a partir das mesmas 9
 * evidências do checklist de conformidade.
 *
 * A 3ª evidência da etapa 3 ("Certificado emitido") fica de fora do cálculo
 * de propósito: exigi-la para emitir o primeiro certificado seria circular.
 * Ela continua existindo normalmente no checklist do hub — ali faz sentido
 * ("você já tirou o comprovante final?"); só não conta como pré-requisito
 * para decidir QUAL nível emitir.
 *
 * Retorna `null` quando nem o nível 1 fecha — não há o que certificar ainda.
 */
export function resolveCertificateTier(
  stages: ConformityStage[]
): 1 | 2 | 3 | null {
  const [stage1, stage2, stage3] = stages;
  const stage1Done = Boolean(stage1?.checks.every((c) => c.done));
  const stage2Done = Boolean(stage2?.checks.every((c) => c.done));
  const stage3Partial = Boolean(
    stage3?.checks.slice(0, 2).every((c) => c.done)
  );

  if (!stage1Done) return null;
  if (!stage2Done) return 1;
  if (!stage3Partial) return 2;
  return 3;
}

/* ─── Internos ─── */

type CountMap = Map<string, { invited: number; responded: number }>;

async function fetchParticipantCounts(
  supabase: SupabaseClient,
  surveyIds: string[]
): Promise<CountMap> {
  const counts: CountMap = new Map();
  if (surveyIds.length === 0) return counts;

  const { data } = await supabase
    .from("survey_participants")
    .select("survey_id, has_accessed")
    .in("survey_id", surveyIds);

  for (const row of data ?? []) {
    const entry = counts.get(row.survey_id) ?? { invited: 0, responded: 0 };
    entry.invited++;
    if (row.has_accessed) entry.responded++;
    counts.set(row.survey_id, entry);
  }
  return counts;
}

async function fetchPlanCounts(
  supabase: SupabaseClient,
  companyId: string,
  surveyIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (surveyIds.length === 0) return counts;

  const { data } = await supabase
    .from("action_plans")
    .select("survey_id")
    .eq("company_id", companyId)
    .in("survey_id", surveyIds);

  for (const row of data ?? []) {
    counts.set(row.survey_id, (counts.get(row.survey_id) ?? 0) + 1);
  }
  return counts;
}

function toCycleSurvey(
  row: SurveyRow,
  index: number,
  participantCounts: CountMap,
  planCounts: Map<string, number>
): CycleSurvey {
  const counts = participantCounts.get(row.id) ?? { invited: 0, responded: 0 };
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    closed_at: row.closed_at,
    version: row.version,
    instrumentName: instrumentName(row),
    stageLabel: getStageLabel(index),
    invited: counts.invited,
    responded: counts.responded,
    responseRate: getResponseRate(counts.responded, counts.invited),
    planCount: planCounts.get(row.id) ?? 0,
  };
}

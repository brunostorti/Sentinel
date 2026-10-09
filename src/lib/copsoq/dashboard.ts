import type { SupabaseClient } from "@supabase/supabase-js";

import { toDisplayScore, UNIVERSAL_CATEGORY_LABELS, type ScoringDirection } from "@/lib/constants";
import type { DimensionScore, DepartmentResult } from "./types";
import { toFavorability, toTrafficLight } from "./scoring";

/** Fetch dashboard KPIs for a company */
export async function fetchDashboardKPIs(
  supabase: SupabaseClient,
  companyId: string
) {
  // Active surveys count
  const { count: activeSurveys } = await supabase
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "ACTIVE");

  // Total surveys
  const { count: totalSurveys } = await supabase
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  // Get survey IDs for this company
  const { data: companySurveys } = await supabase
    .from("surveys")
    .select("id")
    .eq("company_id", companyId);

  const surveyIds = (companySurveys ?? []).map((s) => s.id);

  let totalParticipants = 0;
  let totalResponded = 0;
  let totalResponses = 0;

  if (surveyIds.length > 0) {
    const { count: participants } = await supabase
      .from("survey_participants")
      .select("*", { count: "exact", head: true })
      .in("survey_id", surveyIds);

    const { count: responded } = await supabase
      .from("survey_participants")
      .select("*", { count: "exact", head: true })
      .in("survey_id", surveyIds)
      .eq("has_accessed", true);

    const { count: responses } = await supabase
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .in("survey_id", surveyIds);

    totalParticipants = participants ?? 0;
    totalResponded = responded ?? 0;
    totalResponses = responses ?? 0;
  }

  const responseRate =
    totalParticipants > 0
      ? Math.round((totalResponded / totalParticipants) * 100)
      : 0;

  return {
    activeSurveys: activeSurveys ?? 0,
    totalSurveys: totalSurveys ?? 0,
    totalParticipants,
    totalResponded,
    totalResponses,
    responseRate,
  };
}

export interface GroupScores {
  scores: DimensionScore[];
  /** true quando o grupo está oculto pela regra de 5 (inclui a supressão complementar) */
  isAnonymized: boolean;
  responseCount: number;
}

export interface SurveyScoreBreakdown {
  company: GroupScores;
  /** Por setor (department_id). Setores sem respostas não aparecem. */
  departments: Map<string, GroupScores>;
}

const EMPTY_GROUP: GroupScores = { scores: [], isAnonymized: false, responseCount: 0 };

interface ScoreRow {
  scope: "company" | "department";
  department_id: string | null;
  dimension_id: string;
  respondents: number;
  mean_score: number | string | null;
  suppressed: boolean;
}

/**
 * Médias por dimensão de uma pesquisa — da empresa inteira e de cada setor.
 *
 * O cálculo acontece no banco (função survey_dimension_scores, migração 025): só
 * médias agregadas saem de lá, sem o limite de 1.000 linhas da API, e a regra de 5
 * já vem aplicada com supressão complementar (impede descobrir um setor oculto por
 * subtração). O banco também confere se quem chama pode ver a pesquisa.
 */
export async function fetchSurveyScoreBreakdown(
  supabase: SupabaseClient,
  surveyId: string
): Promise<SurveyScoreBreakdown> {
  const { data: survey } = await supabase
    .from("surveys")
    .select("version, instrument_id")
    .eq("id", surveyId)
    .single();

  if (!survey) return { company: EMPTY_GROUP, departments: new Map() };

  // Dimensões do instrumento — e, nos instrumentos com versões (COPSOQ), só as da versão aplicada
  let scaleQuery = supabase
    .from("questionnaire_scales")
    .select("id, name, category, scoring_direction, universal_categories(code)");
  if (survey.instrument_id) scaleQuery = scaleQuery.eq("instrument_id", survey.instrument_id);
  if (survey.version) {
    const versionColumn =
      survey.version === "SHORT" ? "short_version" : survey.version === "MEDIUM" ? "medium_version" : "long_version";
    scaleQuery = scaleQuery.eq(versionColumn, true);
  }

  const [{ data: rawDimensions }, { data: rows, error }] = await Promise.all([
    scaleQuery.order("display_order"),
    supabase.rpc("survey_dimension_scores", { p_survey_id: surveyId }),
  ]);

  if (error) {
    console.error("survey_dimension_scores:", error.message);
    return { company: EMPTY_GROUP, departments: new Map() };
  }
  if (!rawDimensions?.length || !rows?.length) return { company: EMPTY_GROUP, departments: new Map() };

  const meta = new Map(
    rawDimensions.map((d) => [
      d.id,
      {
        name: d.name as string,
        category: d.category as string,
        scoringDirection: d.scoring_direction as ScoringDirection,
        universalCategory: (d.universal_categories as unknown as { code: string } | null)?.code,
        order: rawDimensions.indexOf(d),
      },
    ])
  );

  const groups = new Map<string, GroupScores>(); // chave: "company" ou id do setor
  for (const row of rows as ScoreRow[]) {
    const dim = meta.get(row.dimension_id);
    if (!dim) continue;
    const key = row.scope === "company" ? "company" : (row.department_id ?? "");
    const group = groups.get(key) ?? { scores: [], isAnonymized: row.suppressed, responseCount: 0 };
    group.responseCount = Math.max(group.responseCount, row.respondents);
    if (row.suppressed || row.mean_score === null) {
      group.isAnonymized = true;
    } else {
      const mean = Number(row.mean_score);
      group.scores.push({
        dimensionId: row.dimension_id,
        name: dim.name,
        category: dim.category,
        universalCategory: dim.universalCategory,
        scoringDirection: dim.scoringDirection,
        meanScore: mean,
        displayScore: toDisplayScore(mean),
        trafficLight: toTrafficLight(mean, dim.scoringDirection),
        questionCount: row.respondents,
      });
    }
    groups.set(key, group);
  }

  // Mesma ordem de exibição do instrumento
  for (const g of groups.values()) {
    if (g.isAnonymized) g.scores = [];
    g.scores.sort((a, b) => (meta.get(a.dimensionId)?.order ?? 0) - (meta.get(b.dimensionId)?.order ?? 0));
  }

  const company = groups.get("company") ?? EMPTY_GROUP;
  groups.delete("company");
  return { company, departments: groups };
}

/** Fetch dimension scores for a specific survey, optionally filtered by department */
export async function fetchSurveyDimensionScores(
  supabase: SupabaseClient,
  surveyId: string,
  departmentId?: string
): Promise<{ scores: DimensionScore[]; isAnonymized: boolean }> {
  const breakdown = await fetchSurveyScoreBreakdown(supabase, surveyId);
  const group = departmentId ? (breakdown.departments.get(departmentId) ?? EMPTY_GROUP) : breakdown.company;
  return { scores: group.scores, isAnonymized: group.isAnonymized };
}

/** Fetch all non-draft surveys with their response counts */
export async function fetchAllSurveysWithResponses(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data: surveys } = await supabase
    .from("surveys")
    .select("id, title, version, status, created_at, expires_at, closed_at, instrument_id, questionnaire_instruments(code, name)")
    .eq("company_id", companyId)
    .in("status", ["CLOSED", "ACTIVE"])
    .order("created_at", { ascending: false });

  if (!surveys?.length) return [];

  // Get response counts for each survey
  const results: {
    id: string;
    title: string;
    version: string | null;
    status: string;
    created_at: string;
    expires_at: string | null;
    closed_at: string | null;
    instrumentName: string | null;
    responseCount: number;
  }[] = [];

  for (const s of surveys) {
    const { count } = await supabase
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", s.id);

    const inst = s.questionnaire_instruments as unknown as { code: string; name: string } | null;

    results.push({
      id: s.id,
      title: s.title,
      version: s.version,
      status: s.status,
      created_at: s.created_at,
      expires_at: s.expires_at,
      closed_at: s.closed_at,
      instrumentName: inst?.name ?? null,
      responseCount: count ?? 0,
    });
  }

  return results;
}

/**
 * Visão geral de várias pesquisas (e instrumentos): uma linha por categoria universal
 * (Carga de Trabalho, Liderança...). Como uma categoria junta dimensões em que alto é
 * risco e outras em que alto é favorável, a média é feita sobre a FAVORABILIDADE
 * (0-100, alto = bom) — o resultado sai com direção HIGH_IS_FAVORABLE e semáforo
 * coerente com ela.
 */
export function aggregateMultiSurveyScores(
  allSurveyScores: { scores: DimensionScore[]; isAnonymized: boolean }[]
): { scores: DimensionScore[]; isAnonymized: boolean } {
  const groups = new Map<string, { scores: DimensionScore[]; favorability: number }>();

  for (const surveyResult of allSurveyScores) {
    if (surveyResult.isAnonymized || !surveyResult.scores.length) continue;
    for (const score of surveyResult.scores) {
      const key = score.universalCategory ?? `dim:${score.name}`;
      const group = groups.get(key) ?? { scores: [], favorability: 0 };
      group.scores.push(score);
      group.favorability += toFavorability(score.meanScore, score.scoringDirection);
      groups.set(key, group);
    }
  }

  if (groups.size === 0) return { scores: [], isAnonymized: false };

  const aggregated: DimensionScore[] = [];
  for (const [key, group] of groups) {
    const mean = group.favorability / group.scores.length;
    const label = group.scores[0].universalCategory
      ? (UNIVERSAL_CATEGORY_LABELS[group.scores[0].universalCategory] ?? group.scores[0].name)
      : group.scores[0].name;
    aggregated.push({
      dimensionId: `geral:${key}`,
      name: label,
      category: label,
      universalCategory: group.scores[0].universalCategory,
      scoringDirection: "HIGH_IS_FAVORABLE",
      meanScore: mean,
      displayScore: toDisplayScore(mean),
      trafficLight: toTrafficLight(mean, "HIGH_IS_FAVORABLE"),
      questionCount: group.scores.reduce((sum, s) => sum + s.questionCount, 0),
    });
  }

  return { scores: aggregated, isAnonymized: false };
}

/** Fetch departments for a company */
export async function fetchDepartments(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");

  return data ?? [];
}

/** Fetch response counts per department for a survey */
export async function fetchDepartmentResponseCounts(
  supabase: SupabaseClient,
  surveyId: string
) {
  const { data: participants } = await supabase
    .from("survey_participants")
    .select("department_id, has_accessed")
    .eq("survey_id", surveyId);

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("department_id")
    .eq("survey_id", surveyId);

  // Count per department
  const deptStats = new Map<
    string,
    { invited: number; responded: number; responses: number }
  >();

  for (const p of participants ?? []) {
    const stats = deptStats.get(p.department_id) ?? {
      invited: 0,
      responded: 0,
      responses: 0,
    };
    stats.invited++;
    if (p.has_accessed) stats.responded++;
    deptStats.set(p.department_id, stats);
  }

  for (const r of responses ?? []) {
    const stats = deptStats.get(r.department_id) ?? {
      invited: 0,
      responded: 0,
      responses: 0,
    };
    stats.responses++;
    deptStats.set(r.department_id, stats);
  }

  return deptStats;
}

/** Fetch dimension scores per department for comparison view */
export async function fetchDepartmentDimensionScores(
  supabase: SupabaseClient,
  surveyId: string,
  departments: { id: string; name: string }[]
): Promise<DepartmentResult[]> {
  // Uma chamada ao banco para todos os setores (antes: duas consultas por setor)
  const breakdown = await fetchSurveyScoreBreakdown(supabase, surveyId);

  return departments.map((dept) => {
    const group = breakdown.departments.get(dept.id) ?? EMPTY_GROUP;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      responseCount: group.responseCount,
      isAnonymous: group.isAnonymized,
      dimensions: group.isAnonymized ? null : group.scores,
    };
  });
}

/** Fetch historical trend data across multiple surveys */
export async function fetchHistoricalTrends(
  supabase: SupabaseClient,
  companyId: string,
  /**
   * Restringe a evolução às pesquisas de um ciclo. Omitido, mantém o
   * comportamento original (empresa inteira), usado pelo painel.
   */
  cycleId?: string
): Promise<{
  surveys: { id: string; title: string; closedAt: string }[];
  dimensions: {
    dimensionId: string;
    name: string;
    category: string;
    scoringDirection: ScoringDirection;
    scores: { surveyId: string; displayScore: number }[];
  }[];
}> {
  // As 10 pesquisas encerradas mais RECENTES (antes pegava as 10 mais antigas e a
  // atual sumia do gráfico a partir da 11ª), exibidas da mais antiga para a mais nova.
  let closedSurveysQuery = supabase
    .from("surveys")
    .select("id, title, closed_at")
    .eq("company_id", companyId)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false })
    .limit(10);

  if (cycleId) {
    closedSurveysQuery = closedSurveysQuery.eq("cycle_id", cycleId);
  }

  const { data: latestClosed } = await closedSurveysQuery;
  const closedSurveys = latestClosed ? [...latestClosed].reverse() : null;

  if (!closedSurveys || closedSurveys.length < 2) {
    return { surveys: [], dimensions: [] };
  }

  const surveys = closedSurveys.map((s) => ({
    id: s.id,
    title: s.title,
    closedAt: s.closed_at,
  }));

  // Fetch scores for each survey
  const allScores = new Map<
    string,
    { name: string; category: string; scoringDirection: ScoringDirection; scores: { surveyId: string; displayScore: number }[] }
  >();

  for (const survey of surveys) {
    const { scores } = await fetchSurveyDimensionScores(supabase, survey.id);
    for (const score of scores) {
      const existing = allScores.get(score.dimensionId);
      if (existing) {
        existing.scores.push({
          surveyId: survey.id,
          displayScore: score.displayScore,
        });
      } else {
        allScores.set(score.dimensionId, {
          name: score.name,
          category: score.category,
          scoringDirection: score.scoringDirection,
          scores: [{ surveyId: survey.id, displayScore: score.displayScore }],
        });
      }
    }
  }

  // Only include dimensions present in at least 2 surveys
  const dimensions = Array.from(allScores.entries())
    .filter(([, d]) => d.scores.length >= 2)
    .map(([dimensionId, d]) => ({
      dimensionId,
      name: d.name,
      category: d.category,
      scoringDirection: d.scoringDirection,
      scores: d.scores,
    }));

  return { surveys, dimensions };
}

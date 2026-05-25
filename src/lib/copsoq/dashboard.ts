import type { SupabaseClient } from "@supabase/supabase-js";

import type { DimensionMeta, DimensionScore, DepartmentResult, RawAnswer } from "./types";
import { aggregateResponseScores } from "./aggregation";
import { enforceAnonymity } from "./aggregation";

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

/** Fetch dimension scores for a specific survey, optionally filtered by department */
export async function fetchSurveyDimensionScores(
  supabase: SupabaseClient,
  surveyId: string,
  departmentId?: string
): Promise<{ scores: DimensionScore[]; isAnonymized: boolean }> {
  // Get the survey version + instrument
  const { data: survey } = await supabase
    .from("surveys")
    .select("version, instrument_id")
    .eq("id", surveyId)
    .single();

  if (!survey) return { scores: [], isAnonymized: false };

  // Fetch dimensions/scales — filter by instrument, and by version if applicable
  let scaleQuery = supabase
    .from("questionnaire_scales")
    .select("id, name, category, scoring_direction, universal_categories(code)");

  if (survey.instrument_id) {
    scaleQuery = scaleQuery.eq("instrument_id", survey.instrument_id);
  }

  // Only filter by version column for versioned instruments (COPSOQ)
  if (survey.version) {
    const versionColumn =
      survey.version === "SHORT"
        ? "short_version"
        : survey.version === "MEDIUM"
          ? "medium_version"
          : "long_version";
    scaleQuery = scaleQuery.eq(versionColumn, true);
  }

  const { data: rawDimensions } = await scaleQuery;

  if (!rawDimensions?.length) return { scores: [], isAnonymized: false };

  // Build a map of dimension id → universal category code
  const universalCategoryMap = new Map<string, string>();
  for (const d of rawDimensions) {
    const uc = d.universal_categories as unknown as { code: string } | null;
    if (uc?.code) universalCategoryMap.set(d.id, uc.code);
  }

  const dimensions: DimensionMeta[] = rawDimensions.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    scoringDirection: d.scoring_direction,
  }));

  // Fetch responses
  let responseQuery = supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId);

  if (departmentId) {
    responseQuery = responseQuery.eq("department_id", departmentId);
  }

  const { data: responses } = await responseQuery;

  if (!responses?.length) return { scores: [], isAnonymized: false };

  // Anonymity check
  if (enforceAnonymity(responses.length)) {
    return { scores: [], isAnonymized: true };
  }

  const responseIds = responses.map((r) => r.id);

  // Fetch all answers for these responses with question metadata
  const { data: rawAnswers } = await supabase
    .from("survey_answers")
    .select(
      `
      score,
      survey_response_id,
      question_id,
      questionnaire_items (
        dimension_id,
        is_inverted
      )
    `
    )
    .in("survey_response_id", responseIds);

  if (!rawAnswers?.length) return { scores: [], isAnonymized: false };

  // Group answers by response
  const responseMap = new Map<string, RawAnswer[]>();
  for (const a of rawAnswers) {
    const q = a.questionnaire_items as unknown as {
      dimension_id: string;
      is_inverted: boolean;
    };
    const answer: RawAnswer = {
      questionId: a.question_id,
      dimensionId: q.dimension_id,
      score: a.score,
      isInverted: q.is_inverted,
    };
    const existing = responseMap.get(a.survey_response_id) ?? [];
    existing.push(answer);
    responseMap.set(a.survey_response_id, existing);
  }

  const allResponses = Array.from(responseMap.values());
  const scores = aggregateResponseScores(allResponses, dimensions);

  // Inject universal category codes into scores
  for (const score of scores) {
    score.universalCategory = universalCategoryMap.get(score.dimensionId);
  }

  return { scores, isAnonymized: false };
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

/** Aggregate scores across multiple surveys into a "general" view by averaging universal categories */
export function aggregateMultiSurveyScores(
  allSurveyScores: { scores: DimensionScore[]; isAnonymized: boolean }[]
): { scores: DimensionScore[]; isAnonymized: boolean } {
  // Collect all scores grouped by universal category
  const categoryScores = new Map<string, { scores: DimensionScore[]; totalDisplayScore: number; count: number }>();

  for (const surveyResult of allSurveyScores) {
    if (surveyResult.isAnonymized || !surveyResult.scores.length) continue;

    for (const score of surveyResult.scores) {
      const key = score.universalCategory ?? score.name;
      const existing = categoryScores.get(key);
      if (existing) {
        existing.scores.push(score);
        existing.totalDisplayScore += score.displayScore;
        existing.count++;
      } else {
        categoryScores.set(key, {
          scores: [score],
          totalDisplayScore: score.displayScore,
          count: 1,
        });
      }
    }
  }

  if (categoryScores.size === 0) return { scores: [], isAnonymized: false };

  // Average per universal category, using first score as template
  const aggregated: DimensionScore[] = [];
  for (const [, data] of categoryScores) {
    const avg = Math.round(data.totalDisplayScore / data.count);
    const template = data.scores[0];
    aggregated.push({
      ...template,
      meanScore: avg,
      displayScore: avg,
      trafficLight: avg >= 66 ? "GREEN" : avg >= 33 ? "YELLOW" : "RED",
      questionCount: data.scores.reduce((sum, s) => sum + s.questionCount, 0),
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
  const results: DepartmentResult[] = [];

  for (const dept of departments) {
    const { scores, isAnonymized } = await fetchSurveyDimensionScores(
      supabase,
      surveyId,
      dept.id
    );

    // Count responses for this department
    const { count } = await supabase
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId)
      .eq("department_id", dept.id);

    results.push({
      departmentId: dept.id,
      departmentName: dept.name,
      responseCount: count ?? 0,
      isAnonymous: isAnonymized,
      dimensions: isAnonymized ? null : scores,
    });
  }

  return results;
}

/** Fetch historical trend data across multiple surveys */
export async function fetchHistoricalTrends(
  supabase: SupabaseClient,
  companyId: string
): Promise<{
  surveys: { id: string; title: string; closedAt: string }[];
  dimensions: {
    dimensionId: string;
    name: string;
    category: string;
    scores: { surveyId: string; displayScore: number }[];
  }[];
}> {
  // Get closed surveys ordered by closed_at
  const { data: closedSurveys } = await supabase
    .from("surveys")
    .select("id, title, closed_at")
    .eq("company_id", companyId)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: true })
    .limit(10);

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
    { name: string; category: string; scores: { surveyId: string; displayScore: number }[] }
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
      scores: d.scores,
    }));

  return { surveys, dimensions };
}

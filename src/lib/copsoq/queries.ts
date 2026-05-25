import type { SupabaseClient } from "@supabase/supabase-js";
import type { SurveyVersion } from "@/lib/constants";
import type { DimensionMeta, RawAnswer } from "./types";

/** Map survey version to the boolean column name */
function versionColumn(version: SurveyVersion): string {
  return `${version.toLowerCase()}_version`;
}

/** Fetch all dimensions/scales for a given survey version, optionally filtered by instrument */
export async function fetchDimensions(
  supabase: SupabaseClient,
  version: SurveyVersion | null,
  instrumentId?: string
): Promise<DimensionMeta[]> {
  let query = supabase
    .from("questionnaire_scales")
    .select("id, name, category, scoring_direction");

  if (instrumentId) {
    query = query.eq("instrument_id", instrumentId);
  }

  if (version) {
    const col = versionColumn(version);
    query = query.eq(col, true);
  }

  const { data, error } = await query.order("category");

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    scoringDirection: d.scoring_direction,
  }));
}

/** Fetch all questions/items for a given survey version, ordered by order_index */
export async function fetchQuestions(
  supabase: SupabaseClient,
  version: SurveyVersion
): Promise<
  {
    id: string;
    dimensionId: string;
    text: string;
    isInverted: boolean;
    orderIndex: number;
  }[]
> {
  const col = versionColumn(version);
  const { data, error } = await supabase
    .from("questionnaire_items")
    .select("id, dimension_id, text, is_inverted, order_index")
    .eq(col, true)
    .order("order_index");

  if (error) throw error;

  return (data ?? []).map((q) => ({
    id: q.id,
    dimensionId: q.dimension_id,
    text: q.text,
    isInverted: q.is_inverted,
    orderIndex: q.order_index,
  }));
}

/** Fetch all answers for a survey, grouped by response */
export async function fetchSurveyAnswers(
  supabase: SupabaseClient,
  surveyId: string
): Promise<
  { responseId: string; departmentId: string; answers: RawAnswer[] }[]
> {
  const { data, error } = await supabase
    .from("survey_responses")
    .select(
      `
      id,
      department_id,
      survey_answers (
        id,
        question_id,
        score,
        questionnaire_items (
          dimension_id,
          is_inverted
        )
      )
    `
    )
    .eq("survey_id", surveyId);

  if (error) throw error;

  return (data ?? []).map((response) => ({
    responseId: response.id,
    departmentId: response.department_id,
    answers: (response.survey_answers ?? []).map(
      (a: Record<string, unknown>) => {
        const q = a.questionnaire_items as {
          dimension_id: string;
          is_inverted: boolean;
        } | null;
        return {
          questionId: a.question_id as string,
          dimensionId: q?.dimension_id ?? "",
          score: a.score as number,
          isInverted: q?.is_inverted ?? false,
        };
      }
    ),
  }));
}

/** Fetch response count per department for a survey */
export async function fetchResponseCounts(
  supabase: SupabaseClient,
  surveyId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("survey_responses")
    .select("department_id")
    .eq("survey_id", surveyId);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.department_id, (counts.get(row.department_id) ?? 0) + 1);
  }
  return counts;
}

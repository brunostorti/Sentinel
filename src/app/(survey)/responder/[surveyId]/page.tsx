import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SurveyForm from "./survey-form";

interface Props {
  params: Promise<{ surveyId: string }>;
}

export default async function SurveyResponsePage({ params }: Props) {
  const { surveyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/entrar");

  // Use admin client for data queries — safe because we filter by verified email
  const admin = createAdminClient();

  // Verify participant + get department
  const { data: participant } = await admin
    .from("survey_participants")
    .select("id, department_id, has_accessed, survey_id")
    .eq("survey_id", surveyId)
    .eq("email", user.email)
    .maybeSingle();

  if (!participant) redirect("/pesquisas");

  // Fetch survey details including instrument
  const { data: survey } = await admin
    .from("surveys")
    .select("id, title, version, status, expires_at, instrument_id")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.status !== "ACTIVE") redirect("/pesquisas");

  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    redirect("/pesquisas");
  }

  // Already answered? Check if participant has_accessed
  if (participant.has_accessed) {
    redirect("/obrigado");
  }

  // Build question query filtered by instrument, including response format
  let questionQuery = admin
    .from("questionnaire_items")
    .select(
      `
      id,
      text,
      is_inverted,
      order_index,
      dimension_id,
      questionnaire_scales (
        id,
        name,
        category
      ),
      response_formats (
        code,
        options
      )
    `
    );

  // Filter by instrument
  if (survey.instrument_id) {
    questionQuery = questionQuery.eq("instrument_id", survey.instrument_id);
  }

  // Filter by version for instruments that support it (COPSOQ)
  if (survey.version) {
    const versionColumn =
      survey.version === "SHORT"
        ? "short_version"
        : survey.version === "MEDIUM"
          ? "medium_version"
          : "long_version";
    questionQuery = questionQuery.eq(versionColumn, true);
  }

  const { data: questions } = await questionQuery.order("order_index", {
    ascending: true,
  });

  if (!questions || questions.length === 0) redirect("/pesquisas");

  return (
    <SurveyForm
      surveyId={survey.id}
      surveyTitle={survey.title}
      participantId={participant.id}
      departmentId={participant.department_id}
      questions={questions.map((q) => {
        const dim = q.questionnaire_scales as unknown as {
          id: string;
          name: string;
          category: string;
        };
        const fmt = q.response_formats as unknown as {
          code: string;
          options: { label: string; value: number }[];
        } | null;
        return {
          id: q.id,
          text: q.text,
          dimensionName: dim.name,
          category: dim.category,
          orderIndex: q.order_index,
          responseOptions: fmt?.options ?? null,
        };
      })}
    />
  );
}

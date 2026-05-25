"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface SubmitPayload {
  surveyId: string;
  participantId: string;
  departmentId: string;
  answers: { questionId: string; score: number }[];
}

export async function submitSurveyResponse(payload: SubmitPayload) {
  const { surveyId, participantId, departmentId, answers } = payload;

  if (!answers.length) {
    return { error: "Nenhuma resposta enviada." };
  }

  // Validate scores are 0-100
  for (const a of answers) {
    if (a.score < 0 || a.score > 100 || !Number.isInteger(a.score)) {
      return { error: "Resposta inválida detectada." };
    }
  }

  // Use admin client to bypass RLS — ensures no user context leaks into response
  const admin = createAdminClient();

  // Double-check participant hasn't already responded
  const { data: participant } = await admin
    .from("survey_participants")
    .select("has_accessed")
    .eq("id", participantId)
    .single();

  if (participant?.has_accessed) {
    return { error: "Você já respondeu esta pesquisa." };
  }

  // 1. Create anonymous response (NO email, NO session, NO IP)
  const { data: response, error: responseError } = await admin
    .from("survey_responses")
    .insert({ survey_id: surveyId, department_id: departmentId })
    .select("id")
    .single();

  if (responseError || !response) {
    return { error: "Erro ao salvar resposta. Tente novamente." };
  }

  // 2. Insert all answers
  const answerRows = answers.map((a) => ({
    survey_response_id: response.id,
    question_id: a.questionId,
    score: a.score,
  }));

  const { error: answersError } = await admin
    .from("survey_answers")
    .insert(answerRows);

  if (answersError) {
    // Rollback: delete the orphaned response
    await admin.from("survey_responses").delete().eq("id", response.id);
    return { error: "Erro ao salvar respostas. Tente novamente." };
  }

  // 3. Mark participant as having responded
  await admin
    .from("survey_participants")
    .update({ has_accessed: true })
    .eq("id", participantId);

  return { success: true };
}

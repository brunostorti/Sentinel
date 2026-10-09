"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubmitPayload {
  surveyId: string;
  answers: { questionId: string; score: number }[];
}

export async function submitSurveyResponse(payload: SubmitPayload) {
  const { surveyId, answers } = payload;

  if (!answers.length) {
    return { error: "Nenhuma resposta enviada." };
  }

  // Validate scores are 0-100
  for (const a of answers) {
    if (a.score < 0 || a.score > 100 || !Number.isInteger(a.score)) {
      return { error: "Resposta inválida detectada." };
    }
  }

  // Quem responde é sempre o usuário da sessão — nunca IDs vindos do navegador.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Sessão expirada. Entre novamente pelo link enviado ao seu e-mail." };
  }

  // Use admin client to bypass RLS — ensures no user context leaks into response
  const admin = createAdminClient();

  const { data: survey } = await admin
    .from("surveys")
    .select("id, status, expires_at, instrument_id, version")
    .eq("id", surveyId)
    .maybeSingle();

  if (!survey || survey.status !== "ACTIVE") {
    return { error: "Esta pesquisa não está aberta para respostas." };
  }
  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return { error: "O prazo desta pesquisa terminou." };
  }

  // As respostas precisam cobrir exatamente as perguntas desta pesquisa
  // (mesmo instrumento e versão exibidos em page.tsx).
  let itemQuery = admin.from("questionnaire_items").select("id");
  if (survey.instrument_id) {
    itemQuery = itemQuery.eq("instrument_id", survey.instrument_id);
  }
  if (survey.version) {
    const versionColumn =
      survey.version === "SHORT"
        ? "short_version"
        : survey.version === "MEDIUM"
          ? "medium_version"
          : "long_version";
    itemQuery = itemQuery.eq(versionColumn, true);
  }
  const { data: items } = await itemQuery;
  const validIds = new Set((items ?? []).map((i) => i.id));
  const answeredIds = new Set(answers.map((a) => a.questionId));
  const isExactSet =
    answeredIds.size === answers.length &&
    answeredIds.size === validIds.size &&
    answers.every((a) => validIds.has(a.questionId));
  if (!isExactSet) {
    return { error: "Respostas incompletas ou inválidas. Recarregue a página e tente novamente." };
  }

  // Reserva atômica: marca "respondeu" só se ainda não estava marcado. Impede
  // envio duplo (inclusive simultâneo) e fixa o setor a partir do cadastro.
  const { data: claimed } = await admin
    .from("survey_participants")
    .update({ has_accessed: true })
    .eq("survey_id", surveyId)
    .eq("email", user.email)
    .eq("has_accessed", false)
    .select("id, department_id")
    .maybeSingle();

  if (!claimed) {
    const { data: existing } = await admin
      .from("survey_participants")
      .select("id")
      .eq("survey_id", surveyId)
      .eq("email", user.email)
      .maybeSingle();
    return {
      error: existing
        ? "Você já respondeu esta pesquisa."
        : "Você não está entre os participantes desta pesquisa.",
    };
  }

  const releaseClaim = () =>
    admin.from("survey_participants").update({ has_accessed: false }).eq("id", claimed.id);

  // 1. Create anonymous response (NO email, NO session, NO IP)
  const { data: response, error: responseError } = await admin
    .from("survey_responses")
    .insert({ survey_id: surveyId, department_id: claimed.department_id })
    .select("id")
    .single();

  if (responseError || !response) {
    await releaseClaim();
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
    // Rollback: delete the orphaned response and free the participant to retry
    await admin.from("survey_responses").delete().eq("id", response.id);
    await releaseClaim();
    return { error: "Erro ao salvar respostas. Tente novamente." };
  }

  return { success: true };
}

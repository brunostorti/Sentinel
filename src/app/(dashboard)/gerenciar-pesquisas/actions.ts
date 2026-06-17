"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerActionPlanGeneration } from "@/lib/ai/trigger-generation";

async function enrollParticipants(surveyId: string, targetDeptIds: string[] | null, companyId: string) {
  const admin = createAdminClient();
  
  let employeeQuery = admin
    .from("employees")
    .select("email, department_id")
    .eq("company_id", companyId);

  if (targetDeptIds && targetDeptIds.length > 0) {
    employeeQuery = employeeQuery.in("department_id", targetDeptIds);
  }

  const { data: employees } = await employeeQuery;

  if (!employees || employees.length === 0) {
    return { success: true, enrolled: 0 };
  }

  const participantRows = employees.map((emp) => ({
    survey_id: surveyId,
    email: emp.email,
    department_id: emp.department_id,
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < participantRows.length; i += BATCH_SIZE) {
    const batch = participantRows.slice(i, i + BATCH_SIZE);
    await admin.from("survey_participants").upsert(batch, {
      onConflict: "survey_id,email",
      ignoreDuplicates: true,
    });
  }
  
  return { success: true, enrolled: employees.length };
}

interface CreateSurveyPayload {
  companyId: string;
  title: string;
  instrumentId: string;
  version: "SHORT" | "MEDIUM" | "LONG" | null; // null for instruments without versions (JSS, OLBI)
  expiresAt: string | null;
  targetDepartmentIds: string[] | null; // null = all departments
}

export async function createSurvey(payload: CreateSurveyPayload) {
  if (!payload.title.trim()) {
    return { error: "Título é obrigatório." };
  }

  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Não autenticado." };

  // Verify user belongs to the company
  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.user.id)
    .single();

  if (!userData || userData.company_id !== payload.companyId) {
    return { error: "Sem permissão." };
  }

  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem criar pesquisas." };
  }

  const { data: newSurvey, error } = await supabase
    .from("surveys")
    .insert({
      company_id: payload.companyId,
      title: payload.title.trim(),
      instrument_id: payload.instrumentId,
      version: payload.version,
      status: "DRAFT",
      expires_at: payload.expiresAt
        ? new Date(payload.expiresAt).toISOString()
        : null,
    })
    .select("id")
    .single();

  if (error || !newSurvey) {
    return { error: "Erro ao criar pesquisa. Tente novamente." };
  }

  // Save target departments (empty = all departments)
  if (payload.targetDepartmentIds && payload.targetDepartmentIds.length > 0) {
    const targetRows = payload.targetDepartmentIds.map((deptId) => ({
      survey_id: newSurvey.id,
      department_id: deptId,
    }));
    await supabase.from("survey_target_departments").insert(targetRows);
  }

  // Enroll participants at creation time
  await enrollParticipants(newSurvey.id, payload.targetDepartmentIds, payload.companyId);

  return { success: true };
}

export async function editSurvey(surveyId: string, payload: CreateSurveyPayload) {
  if (!payload.title.trim()) {
    return { error: "Título é obrigatório." };
  }

  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.user.id)
    .single();

  if (!userData || userData.company_id !== payload.companyId) {
    return { error: "Sem permissão." };
  }

  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem editar pesquisas." };
  }

  // Verify survey belongs to company and is DRAFT
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, company_id, status")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "DRAFT") {
    return { error: "Apenas pesquisas em rascunho podem ser editadas." };
  }

  const { error } = await supabase
    .from("surveys")
    .update({
      title: payload.title.trim(),
      instrument_id: payload.instrumentId,
      version: payload.version,
      expires_at: payload.expiresAt
        ? new Date(payload.expiresAt).toISOString()
        : null,
    })
    .eq("id", surveyId);

  if (error) {
    return { error: "Erro ao editar pesquisa. Tente novamente." };
  }

  // Clear previous target departments and participants
  await supabase.from("survey_target_departments").delete().eq("survey_id", surveyId);
  const admin = createAdminClient();
  await admin.from("survey_participants").delete().eq("survey_id", surveyId);

  // Save new target departments
  if (payload.targetDepartmentIds && payload.targetDepartmentIds.length > 0) {
    const targetRows = payload.targetDepartmentIds.map((deptId) => ({
      survey_id: surveyId,
      department_id: deptId,
    }));
    await supabase.from("survey_target_departments").insert(targetRows);
  }

  // Enroll new participants
  await enrollParticipants(surveyId, payload.targetDepartmentIds, payload.companyId);

  return { success: true };
}

export async function activateSurvey(surveyId: string) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  // Verify survey belongs to company and is DRAFT
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, company_id, status")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "DRAFT") {
    return { error: "Apenas pesquisas em rascunho podem ser ativadas." };
  }

  const admin = createAdminClient();

  // Re-enroll to guarantee any late employees are caught
  const { data: targetDepts } = await supabase
    .from("survey_target_departments")
    .select("department_id")
    .eq("survey_id", surveyId);

  const targetDeptIds = (targetDepts ?? []).map((t) => t.department_id);
  await enrollParticipants(surveyId, targetDeptIds, userData.company_id);

  // Check if anyone is actually enrolled
  const { count } = await supabase
    .from("survey_participants")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", surveyId);

  if (!count || count === 0) {
    return {
      error: "Nenhum colaborador encontrado nos setores selecionados. Adicione colaboradores antes de ativar.",
    };
  }

  // Flip status to ACTIVE
  const { error } = await supabase
    .from("surveys")
    .update({ status: "ACTIVE" })
    .eq("id", surveyId);

  if (error) return { error: "Erro ao ativar pesquisa." };

  return { success: true, enrolled: count };
}

export async function closeSurvey(surveyId: string) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, company_id, status")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "ACTIVE") {
    return { error: "Apenas pesquisas ativas podem ser encerradas." };
  }

  const { error } = await supabase
    .from("surveys")
    .update({ status: "CLOSED", closed_at: new Date().toISOString() })
    .eq("id", surveyId);

  if (error) return { error: "Erro ao encerrar pesquisa." };

  // Trigger AI action plan generation in background
  triggerActionPlanGeneration(surveyId, survey.company_id).catch(
    (err) => console.error("AI plan generation failed:", err)
  );

  return { success: true };
}

export async function sendReminders(surveyId: string) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  // Verify survey is ACTIVE and belongs to company
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, company_id, status, title")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "ACTIVE") {
    return { error: "Apenas pesquisas ativas podem receber lembretes." };
  }

  // Fetch non-respondents (has_accessed = false)
  const { data: nonRespondents } = await supabase
    .from("survey_participants")
    .select("email")
    .eq("survey_id", surveyId)
    .eq("has_accessed", false);

  if (!nonRespondents || nonRespondents.length === 0) {
    return { error: "Todos os colaboradores já responderam." };
  }

  // Send magic link to each non-respondent via admin client
  const adminClient = createAdminClient();
  let sentCount = 0;
  const errors: string[] = [];

  for (const participant of nonRespondents) {
    const { error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: participant.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_APP_URL : "http://localhost:3000"}/pesquisas`,
      },
    });

    if (error) {
      errors.push(participant.email);
    } else {
      sentCount++;
    }
  }

  if (sentCount === 0) {
    return { error: "Não foi possível enviar os lembretes." };
  }

  return {
    success: true,
    message: `${sentCount} lembrete(s) enviado(s) com sucesso.${errors.length > 0 ? ` ${errors.length} falha(s).` : ""}`,
  };
}

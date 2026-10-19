"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request-origin";
import { triggerActionPlanGeneration } from "@/lib/ai/trigger-generation";

async function enrollParticipants(supabase: any, surveyId: string, targetDeptIds: string[] | null, companyId: string) {
  let employeeQuery = supabase
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

  const participantRows = employees.map((emp: { email: string; department_id: string }) => ({
    survey_id: surveyId,
    email: emp.email,
    department_id: emp.department_id,
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < participantRows.length; i += BATCH_SIZE) {
    const batch = participantRows.slice(i, i + BATCH_SIZE);
    await supabase.from("survey_participants").upsert(batch, {
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

  // Toda pesquisa nasce dentro de um ciclo. Criar uma pesquisa "solta" é
  // criar um ciclo novo cuja pesquisa base é ela — as reavaliações vêm depois
  // via createFollowUpSurvey.
  const { data: newCycle, error: cycleError } = await supabase
    .from("survey_cycles")
    .insert({
      company_id: payload.companyId,
      title: payload.title.trim(),
    })
    .select("id")
    .single();

  if (cycleError || !newCycle) {
    return { error: "Erro ao criar ciclo. Tente novamente." };
  }

  const { data: newSurvey, error } = await supabase
    .from("surveys")
    .insert({
      company_id: payload.companyId,
      cycle_id: newCycle.id,
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
    // Sem transação entre statements no supabase-js: desfaz o ciclo à mão
    // para não deixar um ciclo vazio, que não tem o que exibir na listagem.
    await supabase.from("survey_cycles").delete().eq("id", newCycle.id);
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
  await enrollParticipants(supabase, newSurvey.id, payload.targetDepartmentIds, payload.companyId);

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
    .select("id, company_id, status, cycle_id")
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

  // Renomear a única pesquisa de um ciclo é, na prática, renomear o ciclo —
  // ainda está sendo configurado. Com reavaliações já criadas o nome do ciclo
  // é o guarda-chuva delas e não acompanha a edição de uma pesquisa só.
  const { count: siblingCount } = await supabase
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .eq("cycle_id", survey.cycle_id);

  if (siblingCount === 1) {
    await supabase
      .from("survey_cycles")
      .update({ title: payload.title.trim() })
      .eq("id", survey.cycle_id);
  }

  // Clear previous target departments and participants
  await supabase.from("survey_target_departments").delete().eq("survey_id", surveyId);
  await supabase.from("survey_participants").delete().eq("survey_id", surveyId);

  // Save new target departments
  if (payload.targetDepartmentIds && payload.targetDepartmentIds.length > 0) {
    const targetRows = payload.targetDepartmentIds.map((deptId) => ({
      survey_id: surveyId,
      department_id: deptId,
    }));
    await supabase.from("survey_target_departments").insert(targetRows);
  }

  // Enroll new participants
  await enrollParticipants(supabase, surveyId, payload.targetDepartmentIds, payload.companyId);

  return { success: true };
}

/**
 * Cria a próxima reavaliação de um ciclo, reaproveitando instrumento, versão e
 * setores da pesquisa base — só assim as medições são comparáveis entre si.
 *
 * Nasce em DRAFT: o RH revisa e ativa quando quiser abrir a coleta.
 */
export async function createFollowUpSurvey(cycleId: string) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Apenas RH e Admin podem criar reavaliações." };
  }

  const { data: cycle } = await supabase
    .from("survey_cycles")
    .select("id, title, company_id")
    .eq("id", cycleId)
    .eq("company_id", userData.company_id)
    .maybeSingle();

  if (!cycle) return { error: "Ciclo não encontrado." };

  const { data: cycleSurveys } = await supabase
    .from("surveys")
    .select("id, status, instrument_id, version, created_at")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  const surveys = cycleSurveys ?? [];
  if (surveys.length === 0) {
    return { error: "Este ciclo não possui uma pesquisa base." };
  }

  // Reavaliar antes de encerrar a coleta atual não faz sentido: não há
  // resultado com que comparar, e duas coletas abertas ao mesmo tempo
  // confundem quem responde. Validado aqui, não só na UI.
  const latest = surveys[surveys.length - 1];
  if (latest.status !== "CLOSED") {
    return {
      error:
        "A pesquisa mais recente deste ciclo ainda não foi encerrada. Encerre-a antes de criar uma reavaliação.",
    };
  }

  const base = surveys[0];

  // A 2ª pesquisa do ciclo é a "Reavaliação 1" — numera pela ordem de
  // reavaliação, não pela posição absoluta.
  const followUpNumber = surveys.length;

  const { data: targetDepts } = await supabase
    .from("survey_target_departments")
    .select("department_id")
    .eq("survey_id", base.id);

  const targetDeptIds = (targetDepts ?? []).map((t) => t.department_id);

  const { data: newSurvey, error } = await supabase
    .from("surveys")
    .insert({
      company_id: userData.company_id,
      cycle_id: cycleId,
      title: `${cycle.title} - Reavaliação ${followUpNumber}`,
      instrument_id: base.instrument_id,
      version: base.version,
      status: "DRAFT",
      expires_at: null,
    })
    .select("id")
    .single();

  if (error || !newSurvey) {
    return { error: "Erro ao criar reavaliação. Tente novamente." };
  }

  if (targetDeptIds.length > 0) {
    await supabase.from("survey_target_departments").insert(
      targetDeptIds.map((deptId) => ({
        survey_id: newSurvey.id,
        department_id: deptId,
      }))
    );
  }

  await enrollParticipants(
    supabase,
    newSurvey.id,
    targetDeptIds.length > 0 ? targetDeptIds : null,
    userData.company_id
  );

  return { success: true, surveyId: newSurvey.id };
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

  // Re-enroll to guarantee any late employees are caught
  const { data: targetDepts } = await supabase
    .from("survey_target_departments")
    .select("department_id")
    .eq("survey_id", surveyId);

  const targetDeptIds = (targetDepts ?? []).map((t) => t.department_id);
  await enrollParticipants(supabase, surveyId, targetDeptIds, userData.company_id);

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

  // Cada participante recebe o link de acesso, que já faz o login. Uma falha de e-mail não
  // desfaz a ativação: o RH vê o resultado e pode reenviar pelo botão de lembrete.
  const { data: participants } = await supabase
    .from("survey_participants")
    .select("email")
    .eq("survey_id", surveyId)
    .eq("has_accessed", false);
  const emails = await sendAccessLinks((participants ?? []).map((p) => p.email));

  return { success: true, enrolled: count, emails };
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

  // Gera os planos depois de responder ao usuário. Com after(), a plataforma mantém a
  // função viva até o fim (sem ele, a Vercel pode congelar a geração no meio).
  const companyId = survey.company_id;
  after(() =>
    triggerActionPlanGeneration(surveyId, companyId).catch((err) =>
      console.error("AI plan generation failed:", err)
    )
  );

  return { success: true };
}

/**
 * Monta a mensagem de convite/lembrete para o RH enviar pelo canal da empresa
 * (e-mail, Teams, WhatsApp). O Sentinel ainda não envia e-mails: o link de acesso
 * individual é pedido pelo próprio colaborador em /entrar, no aparelho dele —
 * um link gerado aqui não funcionaria no navegador do colaborador.
 */
export async function getReminderMessage(surveyId: string) {
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
    .select("id, company_id, status, title, expires_at")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "ACTIVE") {
    return { error: "Apenas pesquisas ativas podem receber lembretes." };
  }

  const { count: pending } = await supabase
    .from("survey_participants")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", surveyId)
    .eq("has_accessed", false);

  if (!pending) {
    return { error: "Todos os colaboradores já responderam." };
  }

  const origin = await requestOrigin();
  const deadline = survey.expires_at
    ? ` até ${new Date(survey.expires_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    : "";

  const message = [
    `Olá! A pesquisa "${survey.title}" sobre as condições de trabalho está aberta${deadline}.`,
    `Para responder, acesse ${origin}/entrar e informe o seu e-mail corporativo: você receberá um link de acesso.`,
    "As respostas são anônimas: não ficam ligadas ao seu nome, e os resultados só aparecem em grupos de pelo menos 5 pessoas.",
    "Se você já respondeu, desconsidere esta mensagem. Obrigado pela participação!",
  ].join("\n\n");

  return { success: true, message, pending };
}

/**
 * Dispara e-mails de lembrete com Magic Link para todos os colaboradores que ainda não responderam (has_accessed = false).
 * Respeita integralmente as regras de anonimato do sistema.
 */
export async function sendSurveyReminders(surveyId: string) {
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
    .select("id, company_id, status, title, expires_at")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "ACTIVE") {
    return { error: "Apenas pesquisas ativas podem receber lembretes." };
  }

  // Busca estritamente colaboradores com has_accessed = false (não responderam)
  const { data: pendingParticipants, error: pendingError } = await supabase
    .from("survey_participants")
    .select("id, email")
    .eq("survey_id", surveyId)
    .eq("has_accessed", false);

  if (pendingError) {
    return { error: "Erro ao buscar colaboradores pendentes." };
  }

  if (!pendingParticipants || pendingParticipants.length === 0) {
    return { error: "Todos os colaboradores já responderam a pesquisa." };
  }

  const result = await sendAccessLinks(pendingParticipants.map((p) => p.email));
  if (result.sentCount === 0) {
    return {
      error: result.rateLimited
        ? "Limite de envio de e-mails atingido. Tente novamente mais tarde."
        : "Não foi possível enviar os lembretes. Verifique a configuração de e-mail.",
    };
  }
  return { success: true, ...result };
}

export interface AccessLinksResult {
  sentCount: number;
  totalPending: number;
  notSent?: number;
  rateLimited?: boolean;
}

/**
 * Envia o link de acesso (o próprio login) para cada e-mail, de 5 em 5. Usa o cliente
 * admin: o link é pedido em nome do colaborador, então nada pode ficar gravado no navegador
 * do RH. Para no limite de envio. Não devolve e-mails: a lista de pendentes revelaria ao RH
 * quem não respondeu.
 */
async function sendAccessLinks(emails: string[]): Promise<AccessLinksResult> {
  const origin = await requestOrigin();
  const admin = createAdminClient();
  let sentCount = 0;
  let rateLimited = false;

  for (let i = 0; i < emails.length && !rateLimited; i += 5) {
    const errors = await Promise.all(
      emails.slice(i, i + 5).map(async (email) => {
        const { error } = await admin.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${origin}/api/auth/callback?next=/pesquisas`,
          },
        });
        return error;
      })
    );
    for (const error of errors) {
      if (!error) {
        sentCount++;
        continue;
      }
      console.error("Access link error:", error.code ?? error.message);
      if (error.status === 429 || error.code === "over_email_send_rate_limit") rateLimited = true;
    }
  }

  const notSent = emails.length - sentCount;
  return {
    sentCount,
    totalPending: emails.length,
    notSent: notSent > 0 ? notSent : undefined,
    rateLimited: rateLimited || undefined,
  };
}


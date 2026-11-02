"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizeExternalAssignee, type ExternalAssigneeInput } from "@/lib/kanban/external-assignees";

async function getSurveyIdFromCurrentRequest() {
  const headersList = await headers();
  const referer = headersList.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).searchParams.get("surveyId");
  } catch {
    return null;
  }
}

export async function moveTask(taskId: string, newColumnId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("kanban_tasks")
    .update({ column_id: newColumnId, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: "Erro ao mover tarefa." };
  return { success: true };
}

interface CreateTaskPayload {
  title: string;
  description: string | null;
  columnId: string;
  assignedTo: string | null;
  externalAssigneeId?: string | null;
  dueDate: string | null;
  sourceSurveyId?: string | null;
}

export async function createTask(payload: CreateTaskPayload) {
  if (!payload.title.trim()) return { error: "Título é obrigatório." };

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData) return { error: "Sem permissão." };
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem criar tarefas." };
  }

  const sourceSurveyId =
    payload.sourceSurveyId ?? (await getSurveyIdFromCurrentRequest());

  if (sourceSurveyId) {
    const { data: survey } = await supabase
      .from("surveys")
      .select("id")
      .eq("id", sourceSurveyId)
      .eq("company_id", userData.company_id)
      .maybeSingle();

    if (!survey) return { error: "Pesquisa não encontrada para vincular tarefa." };
  }

  const refsError = await checkAssignees(supabase, userData.company_id, payload);
  if (refsError) return { error: refsError };

  const { error } = await supabase.from("kanban_tasks").insert({
    company_id: userData.company_id,
    column_id: payload.columnId,
    title: payload.title.trim(),
    description: payload.description,
    assigned_to: payload.assignedTo,
    external_assignee_id: payload.externalAssigneeId ?? null,
    due_date: payload.dueDate,
    source_survey_id: sourceSurveyId,
  });

  if (error) return { error: "Erro ao criar tarefa." };
  return { success: true };
}

interface UpdateTaskPayload {
  taskId: string;
  title: string;
  description: string | null;
  columnId: string;
  assignedTo: string | null;
  externalAssigneeId?: string | null;
  dueDate: string | null;
}

export async function updateTask(payload: UpdateTaskPayload) {
  if (!payload.title.trim()) return { error: "Título é obrigatório." };

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData) return { error: "Sem permissão." };
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem editar tarefas." };
  }

  const refsError = await checkAssignees(supabase, userData.company_id, payload);
  if (refsError) return { error: refsError };

  const { error } = await supabase
    .from("kanban_tasks")
    .update({
      title: payload.title.trim(),
      description: payload.description,
      column_id: payload.columnId,
      assigned_to: payload.assignedTo,
      external_assignee_id: payload.externalAssigneeId ?? null,
      due_date: payload.dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.taskId);

  if (error) return { error: "Erro ao atualizar tarefa." };
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("kanban_tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { error: "Erro ao excluir tarefa." };
  return { success: true };
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Dono interno e executor externo precisam ser da empresa de quem edita. */
async function checkAssignees(
  supabase: ServerClient,
  companyId: string,
  payload: { assignedTo: string | null; externalAssigneeId?: string | null }
): Promise<string | null> {
  if (payload.assignedTo) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", payload.assignedTo)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!data) return "Responsável interno não encontrado nesta empresa.";
  }
  if (payload.externalAssigneeId) {
    const { data } = await supabase
      .from("external_assignees")
      .select("id")
      .eq("id", payload.externalAssigneeId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!data) return "Responsável externo não encontrado nesta empresa.";
  }
  return null;
}

/** Cadastra um responsável externo (prestadora, consultoria de SST etc.). */
export async function createExternalAssignee(input: ExternalAssigneeInput) {
  const normalized = normalizeExternalAssignee(input);
  if (!normalized.ok) return { error: normalized.error };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();
  if (!userData?.company_id) return { error: "Sem permissão." };
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem cadastrar responsáveis externos." };
  }

  const { data, error } = await supabase
    .from("external_assignees")
    .insert({ ...normalized.value, company_id: userData.company_id })
    .select("id, name, organization, kind")
    .single();

  if (error || !data) return { error: "Erro ao cadastrar o responsável externo." };
  return { success: true as const, external: data };
}

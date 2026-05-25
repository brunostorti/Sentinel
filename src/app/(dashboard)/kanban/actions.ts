"use server";

import { createClient } from "@/lib/supabase/server";

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
  dueDate: string | null;
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

  const { error } = await supabase.from("kanban_tasks").insert({
    company_id: userData.company_id,
    column_id: payload.columnId,
    title: payload.title.trim(),
    description: payload.description,
    assigned_to: payload.assignedTo,
    due_date: payload.dueDate,
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

  const { error } = await supabase
    .from("kanban_tasks")
    .update({
      title: payload.title.trim(),
      description: payload.description,
      column_id: payload.columnId,
      assigned_to: payload.assignedTo,
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

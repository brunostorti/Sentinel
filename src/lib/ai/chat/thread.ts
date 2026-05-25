/**
 * Lifecycle de threads de chat (criação, recuperação, persistência de mensagem).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  company_id: string;
  kind: "plan" | "company";
  resource_id: string | null;
  created_by_user_id: string;
  title: string | null;
  summary: string | null;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

const HISTORY_WINDOW_SIZE = 30;
const ROLLING_SUMMARY_THRESHOLD = 100;

export async function getOrCreateThread(
  supabase: SupabaseClient,
  args: {
    companyId: string;
    userId: string;
    kind: "plan" | "company";
    resourceId: string | null;
  }
): Promise<ChatThread> {
  let query = supabase
    .from("chat_threads")
    .select("*")
    .eq("company_id", args.companyId)
    .eq("kind", args.kind);
  if (args.resourceId) {
    query = query.eq("resource_id", args.resourceId);
  } else {
    query = query.is("resource_id", null);
  }
  const { data: existing } = await query.maybeSingle();

  if (existing) return existing as ChatThread;

  const { data: created, error } = await supabase
    .from("chat_threads")
    .insert({
      company_id: args.companyId,
      kind: args.kind,
      resource_id: args.resourceId,
      created_by_user_id: args.userId,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Falha ao criar thread: ${error?.message ?? "desconhecido"}`);
  }
  return created as ChatThread;
}

export async function loadHistory(
  supabase: SupabaseClient,
  threadId: string
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_WINDOW_SIZE);
  if (!data) return [];
  return (data as ChatMessage[]).reverse();
}

/** Recupera summary persistido na thread (se houver rolling summary aplicado). */
export async function getThreadSummary(
  supabase: SupabaseClient,
  threadId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("chat_threads")
    .select("summary")
    .eq("id", threadId)
    .single();
  return (data?.summary as string | null) ?? null;
}

export async function saveMessage(
  supabase: SupabaseClient,
  args: {
    threadId: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: args.threadId,
      role: args.role,
      content: args.content,
      metadata: args.metadata ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Falha ao salvar mensagem: ${error?.message ?? "desconhecido"}`);
  }
  return data as ChatMessage;
}

export async function touchThread(
  supabase: SupabaseClient,
  threadId: string,
  title?: string
) {
  const patch: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
  };
  if (title) patch.title = title;
  await supabase.from("chat_threads").update(patch).eq("id", threadId);

  // Incrementa contador via RPC simples (UPDATE ... SET message_count = message_count + 1)
  // Como não temos RPC, fazemos um SELECT+UPDATE simples.
  const { data: cur } = await supabase
    .from("chat_threads")
    .select("message_count")
    .eq("id", threadId)
    .single();
  if (cur) {
    await supabase
      .from("chat_threads")
      .update({ message_count: (cur.message_count ?? 0) + 1 })
      .eq("id", threadId);
  }
}

export const CHAT_CONSTANTS = {
  HISTORY_WINDOW_SIZE,
  ROLLING_SUMMARY_THRESHOLD,
};

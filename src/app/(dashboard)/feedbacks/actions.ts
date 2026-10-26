"use server";

import { createClient } from "@/lib/supabase/server";

/** Marca um feedback como lido/não lido. A RLS garante empresa e papel (RH/Admin). */
export async function setFeedbackStatus(id: string, status: "NEW" | "READ") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_plan_feedback")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) return { error: "Não foi possível atualizar o feedback." };
  return { success: true };
}

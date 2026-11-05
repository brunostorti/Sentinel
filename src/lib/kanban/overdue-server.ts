import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInBrazil } from "@/lib/reports/alerts";

/**
 * Conta tarefas vencidas e não concluídas (concluída = está na última coluna do quadro).
 * Usa o cliente da sessão: a RLS limita à empresa do usuário.
 */
export async function countOverdueTasks(
  supabase: SupabaseClient,
  companyId: string,
  opts: { actionPlanId?: string } = {}
): Promise<number> {
  const { data: last } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("company_id", companyId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  let query = supabase
    .from("kanban_tasks")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .lt("due_date", todayInBrazil());
  if (last?.id) query = query.neq("column_id", last.id);
  if (opts.actionPlanId) query = query.eq("action_plan_id", opts.actionPlanId);

  const { count } = await query;
  return count ?? 0;
}

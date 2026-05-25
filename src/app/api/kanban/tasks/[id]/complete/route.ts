import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/kanban/tasks/:id/complete
 * Body: { outcome: 'successful'|'partial'|'unsuccessful'|'in_progress', notes?: string }
 *
 * Move a task para a coluna "Concluído" (maior order_index da empresa) e
 * cria entry em company_actions_taken (source='sentinel_kanban').
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const body = (await req.json()) as {
    outcome: "successful" | "partial" | "unsuccessful" | "in_progress";
    notes?: string;
  };
  if (!body.outcome) {
    return NextResponse.json({ error: "outcome obrigatório." }, { status: 400 });
  }

  // Carrega task + plano linkado
  const { data: task } = await supabase
    .from("kanban_tasks")
    .select(
      `id, company_id, title, description, dimension_id, action_plan_id,
       action_plans (universal_category_id, ai_recommendation)`
    )
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .single();
  if (!task) {
    return NextResponse.json({ error: "Task não encontrada." }, { status: 404 });
  }

  // Acha coluna "Concluído" (maior order_index da empresa)
  const { data: lastCol } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("company_id", userData.company_id!)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Move task para a última coluna (idempotente)
  if (lastCol) {
    await supabase
      .from("kanban_tasks")
      .update({ column_id: lastCol.id })
      .eq("id", id);
  }

  // Cria company_actions_taken
  // Supabase devolve `action_plans` como array quando vem de FK; pegamos o primeiro.
  const planRaw = task.action_plans as unknown;
  const plan = Array.isArray(planRaw)
    ? (planRaw[0] as
        | {
            universal_category_id: string | null;
            ai_recommendation: { title?: string; description?: string } | null;
          }
        | undefined) ?? null
    : (planRaw as
        | {
            universal_category_id: string | null;
            ai_recommendation: { title?: string; description?: string } | null;
          }
        | null);
  const title = plan?.ai_recommendation?.title ?? task.title;

  await supabase.from("company_actions_taken").insert({
    company_id: userData.company_id!,
    title,
    description: task.description ?? null,
    universal_category_id: plan?.universal_category_id ?? null,
    year_started: new Date().getFullYear(),
    year_ended: body.outcome === "in_progress" ? null : new Date().getFullYear(),
    outcome: body.outcome,
    outcome_notes: body.notes ?? null,
    source: "sentinel_kanban",
    linked_action_plan_id: task.action_plan_id ?? null,
  });

  return NextResponse.json({ status: "completed" });
}

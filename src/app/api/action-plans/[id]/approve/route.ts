import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { kanbanTaskFor, PLAN_FOR_TASK_FIELDS, type PlanForTask } from "@/lib/action-plans/kanban-task";

/**
 * POST /api/action-plans/:id/approve
 *
 * Side-effects:
 *  - status='APPROVED'
 *  - cria task no Kanban (primeira coluna), com prazo inicial pelo critério do
 *    Dossiê NR-1 (src/lib/action-plans/kanban-task.ts)
 */
export async function POST(
  _req: NextRequest,
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
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const { data: plan, error: planErr } = await supabase
    .from("action_plans")
    .select(PLAN_FOR_TASK_FIELDS)
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .single();
  if (planErr || !plan) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  if (plan.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: `Plano em status ${plan.status}, não é PENDING_REVIEW.` },
      { status: 409 }
    );
  }

  // Atualiza status
  await supabase
    .from("action_plans")
    .update({ status: "APPROVED" })
    .eq("id", id);

  // Cria task no primeiro Kanban column
  const { data: firstColumn } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("company_id", userData.company_id!)
    .order("order_index")
    .limit(1)
    .maybeSingle();

  if (firstColumn) {
    await supabase
      .from("kanban_tasks")
      .insert(kanbanTaskFor(plan as unknown as PlanForTask, userData.company_id!, firstColumn.id));
  }

  return NextResponse.json({ status: "approved" });
}

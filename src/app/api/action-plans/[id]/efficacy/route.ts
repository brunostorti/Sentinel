import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/action-plans/:id/efficacy
 * Body: { outcome: 'successful'|'partial'|'unsuccessful'|'in_progress', notes?: string }
 *
 * Updates or creates the efficacy feedback in company_actions_taken for a completed plan.
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
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const { data: plan, error: planErr } = await supabase
    .from("action_plans")
    .select("id, company_id, status, universal_category_id, ai_recommendation")
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .single();
  if (planErr || !plan) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const body = (await req.json()) as {
    outcome: "successful" | "partial" | "unsuccessful" | "in_progress";
    notes?: string;
  };
  if (!body.outcome) {
    return NextResponse.json({ error: "outcome obrigatório." }, { status: 400 });
  }

  // Procura se já existe um registro em company_actions_taken
  const { data: existingAction } = await supabase
    .from("company_actions_taken")
    .select("id")
    .eq("linked_action_plan_id", id)
    .eq("company_id", userData.company_id!)
    .maybeSingle();

  const rec = plan.ai_recommendation as { title?: string } | null;
  const title = rec?.title ?? "Plano de ação";

  if (existingAction) {
    // Atualiza existente
    await supabase
      .from("company_actions_taken")
      .update({
        outcome: body.outcome,
        outcome_notes: body.notes ?? null,
        year_ended: body.outcome === "in_progress" ? null : new Date().getFullYear(),
      })
      .eq("id", existingAction.id);
  } else {
    // Insere novo
    await supabase.from("company_actions_taken").insert({
      company_id: userData.company_id!,
      title,
      universal_category_id: plan.universal_category_id ?? null,
      year_started: new Date().getFullYear(),
      year_ended: body.outcome === "in_progress" ? null : new Date().getFullYear(),
      outcome: body.outcome,
      outcome_notes: body.notes ?? null,
      source: "sentinel_outcome",
      linked_action_plan_id: id,
    });
  }

  return NextResponse.json({ status: "success" });
}

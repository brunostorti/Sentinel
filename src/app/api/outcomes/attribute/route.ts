import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/outcomes/attribute
 * Body: { outcomeId, attribution: 'high'|'medium'|'low'|'none'|'cannot_tell', notes? }
 *
 * Side-effect: cria company_actions_taken (source='sentinel_outcome') quando atribuído.
 */
export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as {
    outcomeId: string;
    attribution: "high" | "medium" | "low" | "none" | "cannot_tell";
    notes?: string;
  };

  if (!body.outcomeId || !body.attribution) {
    return NextResponse.json(
      { error: "outcomeId e attribution são obrigatórios." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data: outcome, error: updErr } = await supabase
    .from("action_outcomes")
    .update({
      hr_attribution: body.attribution,
      hr_notes: body.notes ?? null,
      attribution_collected_at: now,
      attribution_user_id: userData.id,
    })
    .eq("id", body.outcomeId)
    .eq("company_id", userData.company_id!)
    .select("intervention_id, universal_category_id, action_plans(ai_recommendation)")
    .single();

  if (updErr || !outcome) {
    return NextResponse.json(
      { error: updErr?.message ?? "Outcome não encontrado." },
      { status: 500 }
    );
  }

  // Cria entry em company_actions_taken (source='sentinel_outcome')
  const rec = (outcome.action_plans as { ai_recommendation?: { title?: string } } | null)?.ai_recommendation;
  await supabase.from("company_actions_taken").insert({
    company_id: userData.company_id!,
    title: rec?.title ?? `Ação ${outcome.intervention_id}`,
    universal_category_id: outcome.universal_category_id,
    outcome:
      body.attribution === "high"
        ? "successful"
        : body.attribution === "medium"
          ? "partial"
          : body.attribution === "none"
            ? "unsuccessful"
            : "unknown",
    outcome_notes: body.notes ?? null,
    source: "sentinel_outcome",
    linked_action_plan_id: null,
  });

  return NextResponse.json({ status: "attributed" });
}

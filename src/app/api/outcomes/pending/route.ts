import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/outcomes/pending
 *
 * Lista action_outcomes com delta_computed_at preenchido mas hr_attribution NULL.
 * Filtra: |delta| > 5 (apenas os com impacto medível notável).
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { data, error } = await supabase
    .from("action_outcomes")
    .select(`
      id, dimension_id, intervention_id, score_before, score_after, delta,
      delta_computed_at, attribution_skip_count,
      action_plans(id, ai_recommendation),
      questionnaire_scales(name)
    `)
    .eq("company_id", userData.company_id!)
    .not("delta_computed_at", "is", null)
    .is("hr_attribution", null)
    .order("delta_computed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtra outcomes com impacto notável (|delta| > 5)
  const notable = (data ?? []).filter((o) => o.delta != null && Math.abs(o.delta) >= 5);
  return NextResponse.json({ outcomes: notable });
}

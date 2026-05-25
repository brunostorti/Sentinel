import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/action-plans/pending-count
 *
 * Retorna { pending: N, failed: M, latestSurveyTitle: string|null }
 * Usado pelo banner "X planos para revisar" no painel.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ pending: 0, failed: 0, latestSurveyTitle: null });
  }

  const [{ count: pending }, { count: failed }, { data: latest }] =
    await Promise.all([
      supabase
        .from("action_plans")
        .select("*", { count: "exact", head: true })
        .eq("company_id", userData.company_id!)
        .eq("status", "PENDING_REVIEW"),
      supabase
        .from("surveys")
        .select("*", { count: "exact", head: true })
        .eq("company_id", userData.company_id!)
        .eq("ai_generation_status", "failed"),
      supabase
        .from("action_plans")
        .select("created_at, surveys(title)")
        .eq("company_id", userData.company_id!)
        .eq("status", "PENDING_REVIEW")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const latestSurveyTitle =
    (latest?.surveys as { title?: string } | null)?.title ?? null;

  return NextResponse.json({
    pending: pending ?? 0,
    failed: failed ?? 0,
    latestSurveyTitle,
  });
}

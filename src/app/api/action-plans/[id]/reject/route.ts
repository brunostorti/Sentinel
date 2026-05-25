import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/action-plans/:id/reject
 * Body: { reason?: string, tags?: string[] }
 *
 * Side-effects:
 *  - status='REJECTED'
 *  - se reason fornecido: cria profile_events confirmados (manual)
 *    com tags possíveis adicionando a constraints/avoid_modalities
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

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    tags?: string[];
  };

  const { data: plan, error: planErr } = await supabase
    .from("action_plans")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .single();
  if (planErr || !plan) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  if (plan.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: `Plano em status ${plan.status}.` },
      { status: 409 }
    );
  }

  await supabase
    .from("action_plans")
    .update({ status: "REJECTED" })
    .eq("id", id);

  // Captura motivo como profile_event manual + adiciona tags a constraints
  if (body.reason || (body.tags && body.tags.length > 0)) {
    const now = new Date().toISOString();
    await supabase.from("profile_events").insert({
      company_id: userData.company_id!,
      event_type: "manual_edit",
      field_path: "constraints",
      old_value: null,
      new_value: body.tags ?? [],
      source_context: `Rejeição do plano ${id}: ${body.reason ?? "(sem motivo)"}`,
      confidence: null,
      confirmed_by_user_id: userData.id,
      confirmed_at: now,
    });

    if (body.tags && body.tags.length > 0) {
      // Append às constraints existentes
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("constraints")
        .eq("company_id", userData.company_id!)
        .single();
      const existing = (profile?.constraints as string[] | null) ?? [];
      const merged = Array.from(new Set([...existing, ...body.tags]));
      await supabase
        .from("company_profiles")
        .update({ constraints: merged, constraints_reviewed_at: now })
        .eq("company_id", userData.company_id!);
    }
  }

  return NextResponse.json({ status: "rejected" });
}

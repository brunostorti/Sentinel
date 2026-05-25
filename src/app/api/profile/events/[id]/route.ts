import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/profile/events/:id
 * Body: { action: "accept" | "reject" | "edit", custom_value?: unknown }
 *
 * - accept: aplica `new_value` no perfil + marca evento como confirmed
 * - reject: só marca rejected_at
 * - edit: aplica custom_value no perfil + marca confirmed
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

  const body = (await req.json()) as {
    action: "accept" | "reject" | "edit";
    custom_value?: unknown;
  };

  const { data: event } = await supabase
    .from("profile_events")
    .select("*")
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .single();
  if (!event)
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  if (event.confirmed_at || event.rejected_at)
    return NextResponse.json({ error: "Evento já resolvido." }, { status: 409 });

  const now = new Date().toISOString();

  if (body.action === "reject") {
    await supabase
      .from("profile_events")
      .update({ rejected_at: now })
      .eq("id", id);
    return NextResponse.json({ status: "rejected" });
  }

  const valueToApply =
    body.action === "edit" ? body.custom_value : event.new_value;

  // Aplica no perfil
  const patch: Record<string, unknown> = { [event.field_path]: valueToApply };
  patch.updated_at = now;

  const { error: updErr } = await supabase
    .from("company_profiles")
    .update(patch)
    .eq("company_id", userData.company_id!);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase
    .from("profile_events")
    .update({
      confirmed_at: now,
      confirmed_by_user_id: userData.id,
      new_value: valueToApply,
    })
    .eq("id", id);

  return NextResponse.json({ status: "applied" });
}

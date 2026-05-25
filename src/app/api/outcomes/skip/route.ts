import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/outcomes/skip
 * Body: { outcomeId }
 *
 * Incrementa attribution_skip_count. Ao chegar em 2, marca automaticamente
 * hr_attribution='cannot_tell' (sai da fila).
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

  const { outcomeId } = (await req.json()) as { outcomeId: string };
  if (!outcomeId)
    return NextResponse.json({ error: "outcomeId é obrigatório." }, { status: 400 });

  const { data: current } = await supabase
    .from("action_outcomes")
    .select("attribution_skip_count")
    .eq("id", outcomeId)
    .eq("company_id", userData.company_id!)
    .single();

  if (!current)
    return NextResponse.json({ error: "Outcome não encontrado." }, { status: 404 });

  const newCount = (current.attribution_skip_count ?? 0) + 1;

  if (newCount >= 2) {
    await supabase
      .from("action_outcomes")
      .update({
        attribution_skip_count: newCount,
        hr_attribution: "cannot_tell",
        attribution_collected_at: new Date().toISOString(),
        attribution_user_id: userData.id,
      })
      .eq("id", outcomeId);
    return NextResponse.json({ status: "auto_cannot_tell" });
  }

  await supabase
    .from("action_outcomes")
    .update({ attribution_skip_count: newCount })
    .eq("id", outcomeId);
  return NextResponse.json({ status: "skipped", count: newCount });
}

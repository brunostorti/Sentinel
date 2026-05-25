import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profile/events?status=pending|all
 *
 * Lista profile_events pendentes (default) ou todos.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  let query = supabase
    .from("profile_events")
    .select("*")
    .eq("company_id", userData.company_id!)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status === "pending") {
    query = query.is("confirmed_at", null).is("rejected_at", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

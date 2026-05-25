import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const { surveyId } = (await req.json()) as { surveyId?: string };
  if (!surveyId)
    return NextResponse.json({ error: "surveyId é obrigatório." }, { status: 400 });

  const { data, error } = await supabase
    .from("surveys")
    .update({
      ai_generation_status: "cancelled",
      ai_generation_finished_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .eq("company_id", userData.company_id!)
    .eq("ai_generation_status", "running")
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { error: "Geração não está rodando." },
      { status: 409 }
    );

  return NextResponse.json({ status: "cancelled" });
}

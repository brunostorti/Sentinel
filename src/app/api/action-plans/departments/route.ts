import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", userData.company_id)
    .order("name");

  return NextResponse.json({ departments: departments ?? [] });
}

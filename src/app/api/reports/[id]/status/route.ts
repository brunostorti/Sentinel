import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const body = (await req.json()) as { status: string };
    if (!body.status || !["PENDING", "RESOLVED"].includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    // Atualiza status do relato se pertencer à empresa do usuário
    const { data, error } = await supabase
      .from("reports")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", userData.company_id!)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error updating report status:", error);
      return NextResponse.json({ error: "Erro ao atualizar status." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Report status update route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

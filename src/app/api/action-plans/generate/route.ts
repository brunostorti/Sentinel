import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPipeline } from "@/lib/ai/pipeline/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("auth_id", authUser.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    if (userData.role !== "HR" && userData.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas RH e Admin podem gerar planos." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { surveyId?: string };
    if (!body.surveyId) {
      return NextResponse.json(
        { error: "surveyId é obrigatório." },
        { status: 400 }
      );
    }

    const result = await runPipeline(body.surveyId, userData.company_id!);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

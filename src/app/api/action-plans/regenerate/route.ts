import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPipeline } from "@/lib/ai/pipeline/orchestrator";

/**
 * A geração de planos (3 chamadas de IA, com modelos que raciocinam como o Opus 5.5)
 * pode passar de 2 minutos: ampliamos o tempo máximo das funções na Vercel.
 */
export const maxDuration = 300;

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

  // Reseta status e re-dispara
  await supabase
    .from("surveys")
    .update({
      ai_generation_status: "not_started",
      ai_generation_error: null,
    })
    .eq("id", surveyId)
    .eq("company_id", userData.company_id!);

  const result = await runPipeline(surveyId, userData.company_id!);
  return NextResponse.json(result);
}

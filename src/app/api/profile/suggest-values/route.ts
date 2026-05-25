import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestProfileValues } from "@/lib/ai/profile/pre-fill";

/**
 * POST /api/profile/suggest-values
 *
 * Chama Claude para sugerir valores iniciais do perfil baseado em
 * companies.industry, employee_count, work_regime, n° departamentos, n° surveys.
 *
 * Retorna apenas a sugestão (NÃO grava nada). HR aceita/edita/salva via /update.
 */
export async function POST(_req: NextRequest) {
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

  const { data: company } = await supabase
    .from("companies")
    .select("industry, employee_count, work_regime")
    .eq("id", userData.company_id!)
    .single();

  const { count: deptCount } = await supabase
    .from("departments")
    .select("*", { count: "exact", head: true })
    .eq("company_id", userData.company_id!);

  const { count: surveyCount } = await supabase
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .eq("company_id", userData.company_id!);

  try {
    const suggestion = await suggestProfileValues({
      industry: company?.industry ?? null,
      employee_count: company?.employee_count ?? null,
      work_regime: company?.work_regime ?? null,
      department_count: deptCount ?? 0,
      past_survey_count: surveyCount ?? 0,
    });

    return NextResponse.json({ suggestion });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao consultar IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

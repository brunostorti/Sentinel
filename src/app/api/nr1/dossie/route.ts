import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDossier } from "@/lib/nr1/dossier";
import { renderDossierPdf } from "@/lib/nr1/pdf";

/**
 * GET /api/nr1/dossie?surveyId=…  → PDF do Dossiê NR-1 de uma pesquisa encerrada.
 * Só ADMIN, RH e gestores da empresa dona da pesquisa.
 */
export async function GET(req: NextRequest) {
  const surveyId = req.nextUrl.searchParams.get("surveyId");
  if (!surveyId) return NextResponse.json({ error: "surveyId é obrigatório." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: caller } = await supabase.from("users").select("company_id, role").eq("auth_id", user.id).single();
  if (!caller?.company_id || !["ADMIN", "HR", "MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: survey } = await admin
    .from("surveys")
    .select("id, status, title")
    .eq("id", surveyId)
    .eq("company_id", caller.company_id)
    .maybeSingle();
  if (!survey) return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
  if (survey.status !== "CLOSED") {
    return NextResponse.json({ error: "O dossiê é gerado a partir de uma pesquisa encerrada." }, { status: 400 });
  }

  try {
    const dossier = await buildDossier(admin, surveyId);
    const pdf = renderDossierPdf(dossier);
    const slug = `${dossier.company.name}-${survey.title}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 80);
    const download = req.nextUrl.searchParams.get("download") !== "0";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="dossie-nr1-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("nr1: falha ao gerar dossiê:", err);
    return NextResponse.json({ error: "Falha ao gerar o dossiê." }, { status: 500 });
  }
}

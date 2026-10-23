import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { normalizeProtocol } from "@/lib/reports/protocol";

/**
 * Andamento de uma denúncia pelo protocolo. Exige login de colaborador e só procura nas
 * empresas da pessoa. Devolve apenas status, tipo e dia — nunca o relato.
 */
export async function GET(req: NextRequest) {
  try {
    const employee = await getEmployeeContext();
    if (!employee) {
      return NextResponse.json(
        { error: "Sua sessão expirou. Entre novamente pelo link enviado ao seu e-mail." },
        { status: 401 }
      );
    }

    const protocol = normalizeProtocol(req.nextUrl.searchParams.get("protocol"));
    if (!protocol || employee.companies.length === 0) {
      return NextResponse.json({ error: "Protocolo não encontrado." }, { status: 404 });
    }

    const { data, error } = await createAdminClient()
      .from("reports")
      .select("status, created_at, occurrence_type")
      .eq("protocol", protocol)
      .in(
        "company_id",
        employee.companies.map((c) => c.id)
      )
      .maybeSingle();

    if (error) {
      console.error("Error tracking report:", error);
      return NextResponse.json({ error: "Erro ao buscar a denúncia." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Protocolo não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ protocol, ...data });
  } catch (error: unknown) {
    console.error("Report tracking route error:", error);
    return NextResponse.json({ error: "Erro ao buscar a denúncia." }, { status: 500 });
  }
}

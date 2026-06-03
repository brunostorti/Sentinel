import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const protocol = searchParams.get("protocol");

    if (!protocol) {
      return NextResponse.json({ error: "Protocolo é obrigatório" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("reports")
      .select("status, created_at, occurrence_type")
      .eq("protocol", protocol)
      .maybeSingle();

    if (error) {
      console.error("Error tracking report:", error);
      return NextResponse.json({ error: "Erro ao buscar denúncia" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Protocolo não encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Report tracking route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

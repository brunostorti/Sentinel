import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("companies")
      .select("id, name")
      .gt("employee_count", 20);

    if (error) {
      console.error("Error fetching companies:", error);
      return NextResponse.json({ error: "Erro ao carregar empresas" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Companies route error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

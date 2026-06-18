import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, companyId } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const selectedCompanyId = String(companyId ?? "").trim();

    if (!normalizedEmail || !normalizedEmail.includes("@") || !selectedCompanyId) {
      return NextResponse.json(
        { error: "Informe empresa e email válidos." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .select("id")
      .eq("company_id", selectedCompanyId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (employeeError) {
      console.error("Report access employee check error:", employeeError);
      return NextResponse.json(
        { error: "Erro ao validar colaborador." },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Este email não consta como colaborador da empresa selecionada." },
        { status: 403 }
      );
    }

    const headersList = await headers();
    const origin =
      headersList.get("x-forwarded-host")
        ? `${headersList.get("x-forwarded-proto") ?? "https"}://${headersList.get("x-forwarded-host")}`
        : headersList.get("origin") ?? "http://localhost:3000";

    const next = `/denuncia/nova?companyId=${encodeURIComponent(selectedCompanyId)}`;
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      console.error("Report access magic link error:", error);
      const isRateLimit = error.status === 429 || error.code === "over_email_send_rate_limit";
      return NextResponse.json(
        {
          error: isRateLimit
            ? "Aguarde alguns segundos antes de solicitar outro link."
            : "Erro ao enviar link de acesso.",
        },
        { status: isRateLimit ? 429 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Report access route error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

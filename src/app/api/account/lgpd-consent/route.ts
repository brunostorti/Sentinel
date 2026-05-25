import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CURRENT_VERSION = "2026-05-21";

/**
 * POST /api/account/lgpd-consent
 * Registra o consentimento LGPD do usuário com timestamp e versão do termo.
 * Art. 8º LGPD: consentimento demonstrável.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!userData) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({
      lgpd_consent_at: now,
      lgpd_consent_version: CURRENT_VERSION,
    })
    .eq("id", userData.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "consented", at: now, version: CURRENT_VERSION });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LGPD_CONSENT_VERSION } from "@/lib/lgpd";

/**
 * GET /api/account/lgpd-status
 * Retorna se o usuário logado já consentiu com a versão ATUAL do termo LGPD.
 * Usado pelo modal de consentimento no carregamento do app.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ authenticated: false, consented: false });
  }

  const { data } = await supabase
    .from("users")
    .select("lgpd_consent_at, lgpd_consent_version")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!data) {
    // Auth user sem registro em users (participante de pesquisa) — sem necessidade de modal
    return NextResponse.json({ authenticated: true, consented: true, isParticipant: true });
  }

  return NextResponse.json({
    authenticated: true,
    consented: data.lgpd_consent_at !== null && data.lgpd_consent_version === LGPD_CONSENT_VERSION,
    consented_at: data.lgpd_consent_at,
    version: data.lgpd_consent_version,
  });
}

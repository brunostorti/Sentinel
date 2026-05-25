import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/account/lgpd-status
 * Retorna se o usuário logado já consentiu com a LGPD.
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
    consented: data.lgpd_consent_at !== null,
    consented_at: data.lgpd_consent_at,
    version: data.lgpd_consent_version,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/email-link";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), "/inicio");

  // Links dos modelos de e-mail atuais: não consome o link aqui, porque verificadores de
  // e-mail corporativo abrem links sozinhos. A página pede um clique para confirmar.
  if (tokenHash && type) {
    const confirm = new URL("/confirmar-acesso", origin);
    confirm.searchParams.set("token_hash", tokenHash);
    confirm.searchParams.set("type", type);
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  // Links no formato antigo (PKCE): só funcionam no navegador que pediu o link.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/entrar?error=auth`);
}

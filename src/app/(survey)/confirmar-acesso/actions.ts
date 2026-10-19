"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEmailLinkType, safeNext } from "@/lib/auth/email-link";

/**
 * Troca o token do link por uma sessão. Roda só no clique do botão (POST), para que
 * verificadores de e-mail que abrem o link sozinhos não gastem o token.
 */
export async function confirmAccess(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = parseEmailLinkType(String(formData.get("type") ?? ""));
  if (!tokenHash || !type) redirect("/entrar?error=auth");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/entrar?error=auth");

  // Convidado de RH/Admin ainda não tem senha: cria antes de entrar no painel.
  if (type === "invite") redirect("/definir-senha");
  redirect(safeNext(String(formData.get("next") ?? ""), "/pesquisas"));
}

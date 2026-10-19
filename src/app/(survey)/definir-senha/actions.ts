"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Primeira senha de quem entrou pelo convite. Sem pedir a senha atual (o convidado não
 * tem uma), por isso vale só uma vez: depois disso, a troca é em Conta > Dados.
 */
export async function definePassword(password: string, confirmation: string) {
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };
  if (password !== confirmation) return { error: "As senhas não conferem." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Abra de novo o link do convite." };

  if (!user.invited_at || user.user_metadata?.password_defined) {
    return { error: "Sua senha já foi criada. Para trocá-la, use Conta > Dados." };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) return { error: "Conta sem acesso administrativo." };

  const { error } = await supabase.auth.updateUser({
    password,
    data: { password_defined: true },
  });
  if (error) {
    return {
      error: error.code === "weak_password"
        ? "Senha fraca. Use letras, números e símbolos."
        : "Não foi possível salvar a senha. Tente novamente.",
    };
  }

  return { success: true, redirect: userData.role === "SUPER_ADMIN" ? "/empresas" : "/inicio" };
}

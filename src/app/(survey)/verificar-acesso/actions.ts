"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { grantSecondFactor } from "@/lib/auth/second-factor-server";

const SENT_COOKIE = "sentinel_2fa_sent";
const TRIES_COOKIE = "sentinel_2fa_tries";
const RESEND_SECONDS = 60;
const MAX_TRIES = 5;

/** Sessão atual, só se for usuário da plataforma (RH, Admin, Gestor, Super Admin, Master). */
async function requirePlatformUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!data) return null;
  return { supabase, userId: user.id, email: user.email };
}

/** Cliente sem sessão: só envia e confere o código, sem trocar o login do navegador. */
function statelessClient() {
  return createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function sendEmailCode() {
  const master = await requirePlatformUser();
  if (!master) return { error: "Sessão expirada. Entre de novo." };

  const store = await cookies();
  const last = Number(store.get(SENT_COOKIE)?.value ?? 0);
  const wait = RESEND_SECONDS - Math.floor((Date.now() - last) / 1000);
  if (last && wait > 0) return { error: `Aguarde ${wait}s para pedir outro código.` };

  const { error } = await statelessClient().auth.signInWithOtp({
    email: master.email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    console.error("2fa email code error:", error.message);
    return { error: "Não foi possível enviar o código. Tente de novo em instantes." };
  }

  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  store.set(SENT_COOKIE, String(Date.now()), opts);
  store.set(TRIES_COOKIE, "0", opts);
  return { success: true };
}

export async function verifyEmailCode(code: string) {
  const master = await requirePlatformUser();
  if (!master) return { error: "Sessão expirada. Entre de novo." };

  const token = code.replace(/\s+/g, "");
  if (!/^\d{6,8}$/.test(token)) return { error: "Digite o código de 6 dígitos do e-mail." };

  const store = await cookies();
  const tries = Number(store.get(TRIES_COOKIE)?.value ?? 0);
  if (tries >= MAX_TRIES) return { error: "Muitas tentativas. Peça um novo código." };
  store.set(TRIES_COOKIE, String(tries + 1), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });

  const { data, error } = await statelessClient().auth.verifyOtp({
    email: master.email,
    token,
    type: "email",
  });
  if (error || data.user?.id !== master.userId) return { error: "Código inválido ou vencido." };

  if (!(await grantSecondFactor(master.supabase, master.userId))) {
    return { error: "Não foi possível concluir. Entre de novo." };
  }
  return { success: true };
}

export async function authenticatorFactorId(): Promise<string | null> {
  const master = await requirePlatformUser();
  if (!master) return null;
  const { data } = await master.supabase.auth.mfa.listFactors();
  return data?.totp?.[0]?.id ?? null;
}

export async function verifyAuthenticator(code: string) {
  const master = await requirePlatformUser();
  if (!master) return { error: "Sessão expirada. Entre de novo." };

  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Digite o código de 6 dígitos do app." };

  const factorId = await authenticatorFactorId();
  if (!factorId) return { error: "App autenticador ainda não configurado." };

  const { error } = await master.supabase.auth.mfa.challengeAndVerify({ factorId, code: token });
  if (error) return { error: "Código inválido ou vencido." };

  if (!(await grantSecondFactor(master.supabase, master.userId))) {
    return { error: "Não foi possível concluir. Entre de novo." };
  }
  return { success: true };
}

export async function cancelSecondFactor() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

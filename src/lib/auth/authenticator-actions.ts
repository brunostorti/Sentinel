"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSecondFactor } from "@/lib/auth/second-factor-server";
import { logAdminAction } from "@/lib/sentinel/server";

/** Usuário da plataforma que já passou pelo segundo fator (código por e-mail) neste login. */
async function requireVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("id, is_master")
    .eq("auth_id", user.id)
    .single();
  if (!data) return null;
  if (!(await hasSecondFactor(supabase, user.id))) return null;
  return { supabase, id: data.id as string, isMaster: data.is_master === true };
}

/**
 * Cadastrar o app autenticador exige já ter passado pelo código por e-mail neste login.
 * Assim, quem só descobrir a senha não consegue registrar o próprio app.
 */
export async function startAuthenticatorSetup() {
  const me = await requireVerifiedUser();
  if (!me) return { error: "Sem permissão." };

  const { data: factors } = await me.supabase.auth.mfa.listFactors();
  if ((factors?.totp?.length ?? 0) > 0) return { error: "O app autenticador já está configurado." };

  // Descarta tentativas antigas que nunca foram confirmadas.
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await me.supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await me.supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Sentinel",
  });
  if (error || !data) return { error: "Não foi possível iniciar a configuração. Tente de novo." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmAuthenticatorSetup(factorId: string, code: string) {
  const me = await requireVerifiedUser();
  if (!me) return { error: "Sem permissão." };

  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Digite o código de 6 dígitos do app." };

  const { error } = await me.supabase.auth.mfa.challengeAndVerify({ factorId, code: token });
  if (error) return { error: "Código inválido. Confira o horário do celular e tente de novo." };

  if (me.isMaster) await logAdminAction(me.id, "master.authenticator_enrolled", null, {});
  return { success: true };
}

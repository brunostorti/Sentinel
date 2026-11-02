"use server";

import { createClient } from "@/lib/supabase/server";
import { getMasterAdmin, logAdminAction } from "@/lib/sentinel/server";

/**
 * Só o Master que já passou pelo segundo fator deste login (código por e-mail) chega aqui.
 * Assim, quem só descobrir a senha não consegue cadastrar o próprio app autenticador.
 */
export async function startAuthenticatorSetup() {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if ((factors?.totp?.length ?? 0) > 0) return { error: "O app autenticador já está configurado." };

  // Descarta tentativas antigas que nunca foram confirmadas.
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Sentinel Master",
  });
  if (error || !data) return { error: "Não foi possível iniciar a configuração. Tente de novo." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmAuthenticatorSetup(factorId: string, code: string) {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Digite o código de 6 dígitos do app." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: token });
  if (error) return { error: "Código inválido. Confira o horário do celular e tente de novo." };

  await logAdminAction(admin.id, "master.authenticator_enrolled", null, {});
  return { success: true };
}

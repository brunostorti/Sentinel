"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeAlertSettings } from "@/lib/reports/alerts";

/** RH/Admin define o limite e a janela do alerta por setor (denúncias e afastamentos). */
export async function saveAlertSettings(threshold: number, windowDays: number) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();
  if (!userData?.company_id) return { error: "Sem permissão." };
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return { error: "Apenas RH e Admin podem alterar o alerta." };
  }

  const settings = normalizeAlertSettings(threshold, windowDays);
  const { error } = await supabase
    .from("companies")
    .update({
      report_alert_threshold: settings.threshold,
      report_alert_window_days: settings.windowDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.company_id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/denuncias");
  return { success: true as const, settings };
}

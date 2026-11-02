import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSecondFactor } from "@/lib/auth/second-factor-server";
import { parseOverviewRow, type CompanyOverview } from "./onboarding";

export interface SuperAdmin {
  id: string;
  name: string | null;
}

/**
 * Usuário da sessão, se for Master Admin (SUPER_ADMIN com is_master) e já tiver passado
 * pelo segundo fator neste login. Toda leitura e
 * escrita do Painel Sentinel passa por aqui.
 */
export async function getMasterAdmin(): Promise<SuperAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, name, role, is_master")
    .eq("auth_id", user.id)
    .single();
  if (!data || data.role !== "SUPER_ADMIN" || data.is_master !== true) return null;
  // Sem o segundo fator deste login, o master não passa (vale também para ações de servidor).
  if (!(await hasSecondFactor(supabase, user.id))) return null;
  return { id: data.id as string, name: (data.name as string | null) ?? null };
}

/**
 * Agregados por empresa (só contagens e datas). A função do banco só roda com o
 * service role, então o chamador precisa ter conferido o acesso com getMasterAdmin().
 */
export async function getCompanyOverviews(): Promise<Map<string, CompanyOverview>> {
  const { data, error } = await createAdminClient().rpc("sentinel_company_overview");
  if (error) {
    console.error("sentinel_company_overview error:", error);
    return new Map();
  }
  const map = new Map<string, CompanyOverview>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const o = parseOverviewRow(row);
    map.set(o.company_id, o);
  }
  return map;
}

/** Registra uma ação do super admin. Falha no registro não interrompe a ação. */
export async function logAdminAction(
  actorUserId: string,
  action: string,
  targetCompanyId: string | null,
  details: Record<string, unknown> = {}
) {
  const { error } = await createAdminClient().from("admin_audit_log").insert({
    actor_user_id: actorUserId,
    action,
    target_company_id: targetCompanyId,
    details,
  });
  if (error) console.error("admin_audit_log insert error:", error);
}

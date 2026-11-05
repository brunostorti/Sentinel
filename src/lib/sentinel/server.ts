import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSecondFactor } from "@/lib/auth/second-factor-server";
import { parseOverviewRow, type CompanyOverview } from "./onboarding";
import { parseAiUsageRow, parseAttentionRow, type AiUsageRow, type CompanyAttention } from "./attention";

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

/** Pontos de atenção por empresa (contagens). Chamador já conferiu o Master. */
export async function getCompanyAttention(): Promise<Map<string, CompanyAttention>> {
  const { data, error } = await createAdminClient().rpc("sentinel_company_attention");
  if (error) {
    console.error("sentinel_company_attention error:", error);
    return new Map();
  }
  const map = new Map<string, CompanyAttention>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const a = parseAttentionRow(row);
    map.set(a.company_id, a);
  }
  return map;
}

/** Início do mês corrente no fuso de Brasília. */
export function monthStartIso(now: Date = new Date()): string {
  const ym = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(now)
    .slice(0, 7);
  return `${ym}-01T00:00:00-03:00`;
}

/** Consumo de IA por empresa e modelo desde `since`. Chamador já conferiu o Master. */
export async function getAiUsage(since: string): Promise<Map<string, AiUsageRow[]>> {
  const { data, error } = await createAdminClient().rpc("sentinel_ai_usage", { p_since: since });
  if (error) {
    console.error("sentinel_ai_usage error:", error);
    return new Map();
  }
  const map = new Map<string, AiUsageRow[]>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const r = parseAiUsageRow(row);
    map.set(r.company_id, [...(map.get(r.company_id) ?? []), r]);
  }
  return map;
}

export interface CompanyTimeline {
  company_created_at: string | null;
  first_user_at: string | null;
  first_employee_at: string | null;
  first_document_at: string | null;
  first_survey_at: string | null;
  first_plan_approved_at: string | null;
  first_task_done_at: string | null;
}

export async function getCompanyTimeline(companyId: string): Promise<CompanyTimeline | null> {
  const { data, error } = await createAdminClient().rpc("sentinel_company_timeline", { p_company_id: companyId });
  if (error) {
    console.error("sentinel_company_timeline error:", error);
    return null;
  }
  const row = ((data ?? []) as Record<string, string | null>[])[0];
  return row ? (row as unknown as CompanyTimeline) : null;
}

import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_DEPARTMENT_SIZE } from "@/lib/feedback/constants";

export interface DepartmentOption {
  id: string;
  name: string;
  /** false quando o setor tem menos de MIN_DEPARTMENT_SIZE colaboradores (regra dos 5). */
  eligible: boolean;
}

/**
 * Setores da empresa com a marcação da regra dos 5. Usa o cliente admin: chamar só
 * no servidor, depois de saber a empresa pela sessão (nunca pelo navegador).
 * Conta colaboradores com head:true, sem trazer linhas (sem limite de 1000).
 */
export async function getDepartmentOptions(companyId: string): Promise<DepartmentOption[]> {
  const admin = createAdminClient();
  const { data: departments } = await admin
    .from("departments")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");

  const options = await Promise.all(
    (departments ?? []).map(async (d) => {
      const { count } = await admin
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("department_id", d.id);
      return { id: d.id as string, name: d.name as string, eligible: (count ?? 0) >= MIN_DEPARTMENT_SIZE };
    })
  );

  return options.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** O setor existe nesta empresa e tem 5 ou mais colaboradores? */
export async function isEligibleDepartment(companyId: string, departmentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: dept } = await admin
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!dept) return false;

  const { count } = await admin
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("department_id", departmentId);
  return (count ?? 0) >= MIN_DEPARTMENT_SIZE;
}

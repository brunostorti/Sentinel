import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_PLAN_STATUSES, MIN_DEPARTMENT_SIZE } from "./constants";

export * from "./constants";

export interface FeedbackPlan {
  id: string;
  title: string;
  /** Nome do departamento-alvo, ou null quando o plano vale para a empresa toda. */
  department: string | null;
}

export interface FeedbackCompanyOption {
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  /** false quando o departamento tem menos de MIN_DEPARTMENT_SIZE colaboradores. */
  eligible: boolean;
  plans: FeedbackPlan[];
}

/**
 * O que o colaborador pode avaliar em cada empresa em que está cadastrado.
 * Usa o cliente admin (o colaborador não tem registro em users); o filtro é o e-mail
 * verificado da sessão. A empresa e o departamento vêm do cadastro, nunca do navegador.
 */
export async function getFeedbackOptions(email: string): Promise<FeedbackCompanyOption[]> {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("employees")
    .select("company_id, department_id, companies (name), departments (name)")
    .eq("email", email.trim().toLowerCase());

  const options: FeedbackCompanyOption[] = [];
  for (const row of rows ?? []) {
    const companyName = (row.companies as unknown as { name: string } | null)?.name;
    const departmentName = (row.departments as unknown as { name: string } | null)?.name;
    if (!companyName || !departmentName || !row.department_id) continue;

    const { count } = await admin
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", row.company_id)
      .eq("department_id", row.department_id);

    const eligible = (count ?? 0) >= MIN_DEPARTMENT_SIZE;

    let plans: FeedbackPlan[] = [];
    if (eligible) {
      const { data: planRows } = await admin
        .from("action_plans")
        .select("id, ai_recommendation, target_department")
        .eq("company_id", row.company_id)
        .in("status", ACTIVE_PLAN_STATUSES)
        .in("target_department", ["all", departmentName])
        .order("created_at", { ascending: false });

      plans = (planRows ?? []).map((p) => ({
        id: p.id,
        title:
          (p.ai_recommendation as { title?: string } | null)?.title?.trim() || "Plano sem título",
        department: p.target_department === "all" ? null : p.target_department,
      }));
    }

    options.push({
      companyId: row.company_id,
      companyName,
      departmentId: row.department_id,
      departmentName,
      eligible,
      plans,
    });
  }

  return options.sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));
}

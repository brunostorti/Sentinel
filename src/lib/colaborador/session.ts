import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EmployeeCompany {
  id: string;
  name: string;
}

export interface EmployeeContext {
  userId: string;
  email: string;
  /** Empresas em que o e-mail consta no cadastro de colaboradores. */
  companies: EmployeeCompany[];
}

/**
 * Colaborador da sessão atual. A empresa vem do cadastro (employees), nunca do navegador.
 * Usa o cliente admin porque o colaborador não tem registro em users (RLS); é seguro porque
 * o filtro é o e-mail verificado da sessão. Cacheado por requisição (layout + página).
 */
export const getEmployeeContext = cache(async (): Promise<EmployeeContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const email = user.email.trim().toLowerCase();
  const { data } = await createAdminClient()
    .from("employees")
    .select("company_id, companies (id, name)")
    .eq("email", email);

  const companies = new Map<string, EmployeeCompany>();
  for (const row of data ?? []) {
    const company = row.companies as unknown as EmployeeCompany | null;
    if (company) companies.set(company.id, { id: company.id, name: company.name });
  }

  return { userId: user.id, email, companies: Array.from(companies.values()) };
});

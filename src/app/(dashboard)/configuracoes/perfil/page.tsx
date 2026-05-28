import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type CompanyBasics } from "./profile-form";
import type { CompanyProfile } from "@/lib/ai/profile/schema";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    redirect("/painel");
  }

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("*")
      .eq("company_id", userData.company_id!)
      .single(),
    supabase
      .from("companies")
      .select("id, name, cnpj, industry, employee_count, work_regime")
      .eq("id", userData.company_id!)
      .single(),
  ]);

  if (!profile || !company) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Perfil da empresa não encontrado. Contate o administrador.
      </div>
    );
  }

  const companyBasics: CompanyBasics = {
    id: company.id as string,
    name: company.name as string,
    cnpj: company.cnpj as string | null,
    industry: company.industry as string | null,
    employee_count: company.employee_count as number | null,
    work_regime: company.work_regime as string | null,
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados que alimentam o pipeline de IA. Quanto mais completo, mais
            personalizadas as recomendações.
          </p>
        </div>
        <Link
          href="/configuracoes/perfil/historico"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Histórico de ações tentadas →
        </Link>
      </div>

      <ProfileForm
        initialProfile={profile as CompanyProfile}
        initialCompany={companyBasics}
      />
    </div>
  );
}

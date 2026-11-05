import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type CompanyBasics } from "./profile-form";
import type { CompanyProfile } from "@/lib/ai/profile/schema";
import { AlertSettings } from "./alert-settings";
import { DEFAULT_ALERT_THRESHOLD, DEFAULT_ALERT_WINDOW_DAYS } from "@/lib/reports/alerts";

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
  if (!userData?.company_id) redirect("/entrar");
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    redirect("/painel");
  }

  const [profileResult, companyResult, alertResult] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("*")
      .eq("company_id", userData.company_id!)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("id, name, cnpj, industry, employee_count, work_regime")
      .eq("id", userData.company_id!)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("report_alert_threshold, report_alert_window_days")
      .eq("id", userData.company_id!)
      .maybeSingle(),
  ]);

  if (profileResult.error || companyResult.error) {
    console.error("Company settings load failed:", profileResult.error, companyResult.error);
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Não foi possível carregar as configurações da empresa. Tente novamente em instantes.
      </div>
    );
  }

  const profile = profileResult.data;
  const company = companyResult.data;

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
          href="/base-de-conhecimento/historico-acoes"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Histórico de ações tentadas →
        </Link>
      </div>

      <ProfileForm
        initialProfile={profile as CompanyProfile}
        initialCompany={companyBasics}
      />

      {alertResult.error || !alertResult.data ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold">Alerta por setor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não foi possível carregar os ajustes de alertas. As demais configurações da empresa continuam disponíveis.
          </p>
        </section>
      ) : (
        <AlertSettings
          initialThreshold={(alertResult.data.report_alert_threshold as number | null) ?? DEFAULT_ALERT_THRESHOLD}
          initialWindowDays={(alertResult.data.report_alert_window_days as number | null) ?? DEFAULT_ALERT_WINDOW_DAYS}
        />
      )}
    </div>
  );
}

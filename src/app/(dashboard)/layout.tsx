import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { DashboardFooter } from "@/components/dashboard-footer";
import { LgpdConsentModal } from "@/components/lgpd-consent-modal";

/** Rotas que precisam ocupar a área principal SEM padding e SEM max-w-7xl. */
const FULL_BLEED_PATTERNS: RegExp[] = [
  /^\/planos-acao\/[^/]+$/, // detalhe do plano
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("name, email, role, company_id, companies(name, employee_count)")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData) redirect("/entrar");
  if (userData.role === "SUPER_ADMIN") redirect("/empresas");

  const companies = userData.companies as unknown as { name: string; employee_count: number } | null;
  const companyName = companies?.name ?? "";
  const employeeCount = companies?.employee_count ?? 0;

  // Detecta rota atual via header injetado pelo middleware
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isFullBleed = FULL_BLEED_PATTERNS.some((re) => re.test(pathname));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={userData.role}
        companyName={companyName}
        employeeCount={employeeCount}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userData.name} userEmail={userData.email} />
        <main
          className={
            isFullBleed
              ? "flex flex-1 flex-col overflow-hidden"
              : "flex-1 overflow-y-auto p-6 lg:p-8"
          }
        >
          {isFullBleed ? (
            <PageTransition className="flex-1 min-h-0 flex flex-col">{children}</PageTransition>
          ) : (
            <div className="mx-auto max-w-7xl">
              <PageTransition>{children}</PageTransition>
              <DashboardFooter />
            </div>
          )}
        </main>
      </div>

      {/* Modal LGPD bloqueia o app até o usuário consentir (1º acesso) */}
      <LgpdConsentModal />
    </div>
  );
}

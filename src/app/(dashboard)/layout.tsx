import { homeForRole } from "@/lib/auth/home";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { DashboardFooter } from "@/components/dashboard-footer";
import { LgpdConsentModal } from "@/components/lgpd-consent-modal";
import { staleCutoffIso } from "@/lib/reports/stale";
import { countOverdueTasks } from "@/lib/kanban/overdue-server";

/**
 * A geração de planos (3 chamadas de IA, com modelos que raciocinam como o Opus 5.5)
 * pode passar de 2 minutos: ampliamos o tempo máximo das funções na Vercel.
 */
export const maxDuration = 300;

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
    .select("name, email, role, is_master, company_id, companies(name, employee_count)")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData) redirect("/entrar");
  if (userData.role === "SUPER_ADMIN") redirect(homeForRole("SUPER_ADMIN", userData.is_master === true));

  const companies = userData.companies as unknown as { name: string; employee_count: number } | null;
  const companyName = companies?.name ?? "";
  const employeeCount = companies?.employee_count ?? 0;

  // Feedbacks não lidos (só RH/Admin os veem; a RLS limita à empresa).
  let unreadFeedbacks = 0;
  if (userData.role === "HR" || userData.role === "ADMIN") {
    const { count } = await supabase
      .from("action_plan_feedback")
      .select("id", { count: "exact", head: true })
      .eq("status", "NEW");
    unreadFeedbacks = count ?? 0;
  }

  // Alertas do menu: denúncias aguardando há 7+ dias (RH/Admin) e tarefas atrasadas.
  let staleReports = 0;
  let overdueTasks = 0;
  if (userData.company_id) {
    const [staleRes, overdue] = await Promise.all([
      userData.role === "HR" || userData.role === "ADMIN"
        ? supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "PENDING")
            .lt("created_at", staleCutoffIso())
        : Promise.resolve({ count: 0 }),
      countOverdueTasks(supabase, userData.company_id as string),
    ]);
    staleReports = staleRes.count ?? 0;
    overdueTasks = overdue;
  }

  // Detecta rota atual via header injetado pelo middleware
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isFullBleed = FULL_BLEED_PATTERNS.some((re) => re.test(pathname));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={userData.role}
        companyName={companyName}
        employeeCount={employeeCount}
        unreadFeedbacks={unreadFeedbacks}
        staleReports={staleReports}
        overdueTasks={overdueTasks}
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

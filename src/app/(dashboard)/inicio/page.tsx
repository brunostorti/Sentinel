import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardKPIs } from "@/lib/copsoq/dashboard";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/constants";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("name, company_id, companies(name)")
    .eq("auth_id", user.id)
    .single();

  if (!userData?.company_id) redirect("/entrar");
  const companyId = userData.company_id;
  const company = userData.companies as unknown as { name: string } | null;
  const companyName = company?.name ?? "sua empresa";
  const firstName = (userData.name ?? "").split(" ")[0] || "Bem-vindo";

  // Estatísticas leves para a faixa de visão rápida
  const [kpis, pendingPlans, kanbanTasks] = await Promise.all([
    fetchDashboardKPIs(supabase, companyId),
    supabase
      .from("action_plans")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "PENDING_REVIEW"),
    supabase
      .from("kanban_tasks")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  const stats: {
    label: string;
    value: number;
    suffix?: string;
    accent: string;
  }[] = [
    { label: "Pesquisas criadas", value: kpis.totalSurveys, accent: "text-primary" },
    {
      label: "Taxa de resposta",
      value: kpis.responseRate,
      suffix: "%",
      accent: "text-primary",
    },
    { label: "Planos a revisar", value: pendingPlans.count ?? 0, accent: "text-danger" },
    { label: "Ações no Kanban", value: kanbanTasks.count ?? 0, accent: "text-success" },
  ];

  const navCards = [
    {
      title: "Pesquisas",
      description:
        "Crie e gerencie avaliações COPSOQ II personalizadas para cada setor da empresa.",
      icon: "assignment",
      href: ROUTES.DASHBOARD.SURVEYS,
      cta: "Abrir pesquisas",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      title: "Planos de Ação",
      description:
        "Revise sugestões geradas por IA para mitigar os riscos psicossociais detectados.",
      icon: "lightbulb",
      href: ROUTES.DASHBOARD.ACTION_PLANS,
      cta: "Gerenciar planos",
      iconClass: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Kanban",
      description:
        "Acompanhe a execução das ações estratégicas em um fluxo ágil e contínuo.",
      icon: "view_kanban",
      href: ROUTES.DASHBOARD.KANBAN,
      cta: "Abrir Kanban",
      iconClass: "bg-success/10 text-success",
    },
    {
      title: "Colaboradores",
      description:
        "Cadastre e organize os colaboradores por setor para direcionar as pesquisas.",
      icon: "group",
      href: ROUTES.DASHBOARD.EMPLOYEES,
      cta: "Ver colaboradores",
      iconClass: "bg-violet-500/10 text-violet-600",
    },
  ];

  const quickAccess = [
    { label: "Painel Analítico", icon: "monitoring", href: ROUTES.DASHBOARD.OVERVIEW },
    { label: "Relatórios", icon: "assessment", href: ROUTES.DASHBOARD.REPORTS },
    { label: "Certificados", icon: "verified", href: ROUTES.DASHBOARD.CERTIFICATES },
    { label: "Assistente IA", icon: "smart_toy", href: ROUTES.DASHBOARD.ASSISTANT },
    { label: "Metodologia", icon: "menu_book", href: ROUTES.DASHBOARD.METHODOLOGY },
    { label: "Configurações", icon: "settings", href: ROUTES.DASHBOARD.SETTINGS },
  ];

  const steps = [
    {
      title: "Criar pesquisa",
      description: "Escolha o instrumento e os setores que vão participar.",
    },
    {
      title: "Respostas anônimas",
      description: "Acompanhe a adesão com total garantia de privacidade.",
    },
    {
      title: "Análise de riscos",
      description: "Identificação automática dos pontos críticos por setor.",
    },
    {
      title: "Sugestão de ação",
      description: "Receba planos personalizados gerados por IA a partir dos dados.",
    },
    {
      title: "Gestão Kanban",
      description: "Acompanhamento contínuo da execução e da eficácia das ações.",
    },
  ];

  return (
    <div className="space-y-12 pb-14">
      {/* ── Hero ── */}
      <section className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-sm lg:p-12">
        {/* glows decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-success/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            <Icon name="shield" size={14} filled />
            {companyName}
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight text-foreground lg:text-5xl">
            Olá, {firstName}.
            <br />
            Bem-vindo ao
            <br />
            <span className="text-primary">Sentinel</span>.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Crie pesquisas por setor, acompanhe respostas anônimas, identifique
            riscos psicossociais e transforme diagnósticos em planos de ação
            personalizados — em conformidade com a Lei 14.831.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={ROUTES.DASHBOARD.SURVEYS}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Icon name="add_circle" size={20} filled />
              Criar nova pesquisa
            </Link>
            <Link
              href={ROUTES.DASHBOARD.OVERVIEW}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/5"
            >
              <Icon name="monitoring" size={20} />
              Ver painel analítico
            </Link>
            <Link
              href={ROUTES.DASHBOARD.ACTION_PLANS}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-primary transition-all hover:underline"
            >
              Acessar planos de ação
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Faixa de stats ── */}
      <section className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-2 text-4xl font-black tracking-tight ${stat.accent}`}>
              {stat.value}
              {stat.suffix ?? ""}
            </p>
          </div>
        ))}
      </section>

      {/* ── Cards de navegação ── */}
      <section className="stagger-children grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {navCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="card-hover group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconClass} transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon name={card.icon} size={24} filled />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              {card.cta}
              <Icon
                name="arrow_forward"
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </section>

      {/* ── Acesso rápido ── */}
      <section>
        <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Acesso Rápido
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {quickAccess.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Como Funciona ── */}
      <section>
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-black tracking-tight">Como Funciona</h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
        </div>

        <div className="relative grid gap-8 md:grid-cols-5">
          {/* linha conectora (desktop) */}
          <div className="absolute left-0 top-7 hidden h-px w-full bg-border md:block" />
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary bg-card text-lg font-black text-primary shadow-sm">
                {idx + 1}
              </div>
              <h4 className="mt-4 text-sm font-bold tracking-tight">{step.title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Banner CTA ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-10 text-center shadow-lg lg:p-14">
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h3 className="text-2xl font-black tracking-tight text-primary-foreground lg:text-3xl">
            Pronto para transformar sua cultura organizacional?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
            Comece hoje mesmo o diagnóstico preventivo e garanta o bem-estar da
            sua equipe.
          </p>
          <Link
            href={ROUTES.DASHBOARD.SURVEYS}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-card px-6 py-3 text-sm font-semibold text-primary shadow-md transition-all hover:scale-[1.02] active:scale-95"
          >
            <Icon name="rocket_launch" size={20} filled />
            Iniciar diagnóstico
          </Link>
        </div>
      </section>
    </div>
  );
}

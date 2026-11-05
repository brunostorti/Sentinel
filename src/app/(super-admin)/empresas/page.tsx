import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { CreateCompanyButton } from "./create-company-button";
import {
  getAiUsage,
  getCompanyAttention,
  getCompanyOverviews,
  getMasterAdmin,
  monthStartIso,
} from "@/lib/sentinel/server";
import {
  companyAlerts,
  formatUsd,
  summarizeAiUsage,
  type AiUsageSummary,
  type CompanyAlert,
} from "@/lib/sentinel/attention";
import { onboardingSteps, responseRate, type CompanyOverview } from "@/lib/sentinel/onboarding";

const SURVEY_STATUS: Record<string, string> = {
  ACTIVE: "Aberta",
  CLOSED: "Encerrada",
  DRAFT: "Rascunho",
};

function shortDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default async function SentinelPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");

  // Por padrão só aparecem empresas reais; dados de demonstração ficam atrás de um botão.
  const showDemo = (await searchParams).demo === "1";

  const supabase = await createClient();
  let companiesQuery = supabase
    .from("companies")
    .select("id, name, cnpj, industry, plan, is_demo, created_at")
    .order("created_at", { ascending: false });
  if (!showDemo) companiesQuery = companiesQuery.eq("is_demo", false);

  const [{ data: companies }, overviews, attention, usage, { count: demoCount }] = await Promise.all([
    companiesQuery,
    getCompanyOverviews(),
    getCompanyAttention(),
    getAiUsage(monthStartIso()),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);

  const list = companies ?? [];
  const visibleOverviews = list
    .map((c) => overviews.get(c.id as string))
    .filter((o): o is CompanyOverview => !!o);
  // Alertas e consumo de IA de cada empresa visível.
  const perCompany = new Map(
    list.map((c) => {
      const id = c.id as string;
      return [
        id,
        {
          alerts: companyAlerts(overviews.get(id) ?? null, attention.get(id) ?? null),
          ai: summarizeAiUsage(usage.get(id) ?? []),
        },
      ];
    })
  );
  const attentionList = list.flatMap((c) =>
    (perCompany.get(c.id as string)?.alerts ?? []).map((a) => ({ ...a, companyId: c.id as string, companyName: c.name as string }))
  );
  attentionList.sort((a, b) => (a.level === b.level ? 0 : a.level === "alta" ? -1 : 1));
  const aiCostMonth = [...perCompany.values()].reduce((acc, p) => acc + (p.ai.costUsd ?? 0), 0);

  const totals = visibleOverviews.reduce(
    (acc: { employees: number; reportsOpen: number; plansPending: number; leave: number }, o) => ({
      employees: acc.employees + o.employees,
      reportsOpen: acc.reportsOpen + o.reports_open,
      plansPending: acc.plansPending + o.plans_pending,
      leave: acc.leave + o.leave_cases_30d,
    }),
    { employees: 0, reportsOpen: 0, plansPending: 0, leave: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Painel Sentinel</p>
          <h1 className="text-3xl font-black tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status de cada cliente, só com contagens. Respostas, denúncias e textos nunca aparecem aqui.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/seguranca"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <Icon name="shield" size={16} />
            Segurança
          </Link>
          <CreateCompanyButton />
        </div>
      </div>

      <details className="group rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
          <Icon name="help" size={18} className="text-primary" />
          Como usar este painel
          <Icon name="expand_more" size={18} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 space-y-1.5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Quem vê:</strong> só a conta Master da equipe Sentinel. Os clientes nunca
            veem esta tela.
          </li>
          <li>
            <strong className="text-foreground">Cada card é um cliente.</strong> Clique para ver detalhes, consumo de IA,
            notas da equipe, linha do tempo e o relatório do piloto.
          </li>
          <li>
            <strong className="text-foreground">Precisa de atenção:</strong> lista o que pede contato com o cliente
            (denúncia parada, sem chave de IA, adesão baixa, plano parado, erro em documento, tarefa atrasada).
          </li>
          <li>
            <strong className="text-foreground">Nova empresa:</strong> &quot;Adicionar empresa&quot; já cria o cliente no
            banco. Todos os clientes ficam no mesmo banco, separados por empresa (cada um só enxerga o que é seu).
          </li>
          <li>
            <strong className="text-foreground">Privacidade:</strong> aqui só aparecem contagens e datas. Respostas,
            relatos e textos de documentos nunca aparecem.
          </li>
        </ul>
      </details>

      <AttentionBand items={attentionList} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Empresas" value={list.length} icon="business" />
        <Stat label="Colaboradores" value={totals.employees} icon="groups" />
        <Stat label="Planos pendentes" value={totals.plansPending} icon="pending_actions" />
        <Stat label="Denúncias abertas" value={totals.reportsOpen} icon="shield" />
        <Stat label="Afastamentos (30 dias)" value={totals.leave} icon="event_busy" />
        <Stat label="IA no mês (estimado)" value={formatUsd(aiCostMonth)} icon="toll" />
      </div>

      {(demoCount ?? 0) > 0 && (
        <div className="flex justify-end">
          <Link
            href={showDemo ? "/empresas" : "/empresas?demo=1"}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showDemo ? "Ocultar dados de demonstração" : `Mostrar dados de demonstração (${demoCount})`}
          </Link>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Icon name="business" size={48} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            Nenhuma empresa cadastrada. Use &quot;Adicionar empresa&quot; para criar a primeira.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((company) => (
            <CompanyCard
              key={company.id}
              id={company.id as string}
              name={company.name as string}
              plan={(company.plan as string | null) ?? "Piloto"}
              industry={company.industry as string | null}
              isDemo={company.is_demo === true}
              alerts={perCompany.get(company.id as string)?.alerts ?? []}
              ai={perCompany.get(company.id as string)?.ai ?? null}
              overview={overviews.get(company.id as string) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionBand({
  items,
}: {
  items: (CompanyAlert & { companyId: string; companyName: string })[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Icon name="check_circle" size={18} />
        Tudo em dia: nenhum cliente precisa de atenção agora.
      </div>
    );
  }
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <h2 className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200">
        <Icon name="warning" size={18} />
        Precisa de atenção ({items.length})
      </h2>
      <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
        {items.map((a) => (
          <li key={`${a.companyId}-${a.key}`}>
            <Link
              href={`/empresas/${a.companyId}`}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-amber-100/70 dark:hover:bg-amber-500/10"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.level === "alta" ? "bg-red-500" : "bg-amber-500"}`}
                aria-label={a.level === "alta" ? "Prioridade alta" : "Prioridade média"}
              />
              <span>
                <strong>{a.companyName}:</strong> {a.text}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon name={icon} size={18} className="text-primary" />
      </div>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function CompanyCard({
  id,
  name,
  plan,
  industry,
  isDemo,
  alerts,
  ai,
  overview,
}: {
  id: string;
  name: string;
  plan: string;
  industry: string | null;
  isDemo: boolean;
  alerts: CompanyAlert[];
  ai: AiUsageSummary | null;
  overview: CompanyOverview | null;
}) {
  const steps = overview ? onboardingSteps(overview) : [];
  const done = steps.filter((s) => s.done).length;
  const rate = overview ? responseRate(overview) : null;

  return (
    <Link
      href={`/empresas/${id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">{name}</h2>
          {industry && <p className="truncate text-xs text-muted-foreground">{industry}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {isDemo ? "Demonstração" : plan}
        </span>
      </div>

      {overview ? (
        <>
          <div className="mt-4">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">Implantação</span>
              <span className="tabular-nums text-muted-foreground">
                {done}/{steps.length}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full ${done === steps.length ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${Math.round((done / steps.length) * 100)}%` }}
              />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Metric label="Colaboradores" value={overview.employees} sub={`${overview.departments} setores`} />
            <Metric
              label="Documentos"
              value={`${overview.documents_ready}/${overview.documents}`}
              sub={overview.last_document_at ? `Atualizado ${shortDate(overview.last_document_at)}` : "Nenhum enviado"}
            />
            <Metric
              label="Última pesquisa"
              value={overview.last_survey_status ? SURVEY_STATUS[overview.last_survey_status] ?? overview.last_survey_status : "—"}
              sub={rate !== null ? `${rate}% de resposta` : shortDate(overview.last_survey_at)}
            />
            <Metric
              label="Planos"
              value={`${overview.plans_approved} aprovados`}
              sub={`${overview.plans_pending} pendentes`}
            />
            <Metric label="Denúncias abertas" value={overview.reports_open} sub={`${overview.reports_total} no total`} />
            <Metric label="Afastamentos" value={overview.leave_cases_30d} sub="últimos 30 dias" />
          </dl>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sem dados agregados.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {alerts.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-800 dark:text-amber-200">
            <Icon name="warning" size={13} />
            {alerts.length === 1 ? "1 ponto de atenção" : `${alerts.length} pontos de atenção`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
            <Icon name="check_circle" size={13} />
            Em dia
          </span>
        )}
        {ai && ai.calls > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
            <Icon name="toll" size={13} />
            IA no mês: {formatUsd(ai.costUsd)}
          </span>
        )}
      </div>

      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary">
        Abrir empresa
        <Icon name="arrow_forward" size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate font-bold tabular-nums">{value}</dd>
      {sub && <dd className="truncate text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

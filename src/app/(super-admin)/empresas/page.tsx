import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { CreateCompanyButton } from "./create-company-button";
import { getCompanyOverviews, getMasterAdmin } from "@/lib/sentinel/server";
import { onboardingSteps, responseRate, type CompanyOverview } from "@/lib/sentinel/onboarding";

const SURVEY_STATUS: Record<string, string> = {
  ACTIVE: "Aberta",
  CLOSED: "Encerrada",
  DRAFT: "Rascunho",
};

function shortDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default async function SentinelPanelPage() {
  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");

  const supabase = await createClient();
  const [{ data: companies }, overviews] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, cnpj, industry, plan, created_at")
      .order("created_at", { ascending: false }),
    getCompanyOverviews(),
  ]);

  const list = companies ?? [];
  const totals = Array.from(overviews.values()).reduce(
    (acc, o) => ({
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Empresas" value={list.length} icon="business" />
        <Stat label="Colaboradores" value={totals.employees} icon="groups" />
        <Stat label="Planos pendentes" value={totals.plansPending} icon="pending_actions" />
        <Stat label="Denúncias abertas" value={totals.reportsOpen} icon="shield" />
        <Stat label="Afastamentos (30 dias)" value={totals.leave} icon="event_busy" />
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Icon name="business" size={48} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Nenhuma empresa cadastrada.</p>
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
              overview={overviews.get(company.id as string) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
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
  overview,
}: {
  id: string;
  name: string;
  plan: string;
  industry: string | null;
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
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{plan}</span>
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

      <span className="mt-4 flex items-center gap-1 text-xs font-bold text-primary">
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

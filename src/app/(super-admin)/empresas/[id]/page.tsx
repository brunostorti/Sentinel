import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import { getCompanyOverviews, getSuperAdmin } from "@/lib/sentinel/server";
import { onboardingSteps, responseRate } from "@/lib/sentinel/onboarding";
import { CommercialForm } from "./commercial-form";

const TABS = [
  { key: "visao", label: "Visão geral", icon: "dashboard" },
  { key: "documentos", label: "Documentos", icon: "description" },
  { key: "configuracao", label: "Configuração", icon: "settings" },
  { key: "usuarios", label: "Usuários", icon: "group" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", HR: "RH", MANAGER: "Gestor", SUPER_ADMIN: "Sentinel" };
const ACTION_LABEL: Record<string, string> = {
  "company.create": "Empresa criada",
  "company.update_commercial": "Plano ou e-mails alterados",
};

function fmt(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export default async function CompanyDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ aba?: string }>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === searchParams?.aba)?.key ?? "visao") as TabKey;

  const admin = await getSuperAdmin();
  if (!admin) redirect("/inicio");

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, cnpj, industry, employee_count, work_regime, plan, sender_name, reply_to_email, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const overview = (await getCompanyOverviews()).get(id) ?? null;
  const steps = overview ? onboardingSteps(overview) : [];
  const rate = overview ? responseRate(overview) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/empresas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          Painel Sentinel
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">{company.name}</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{company.plan}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[company.cnpj, company.industry, `Cliente desde ${fmt(company.created_at as string)}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Seções da empresa">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "visao" ? `/empresas/${id}` : `/empresas/${id}?aba=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "visao" && overview && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Tile label="Colaboradores" value={overview.employees} sub={`${overview.departments} setores`} />
            <Tile label="Usuários da plataforma" value={overview.platform_users} sub="RH, administradores e gestores" />
            <Tile label="Documentos prontos" value={`${overview.documents_ready}/${overview.documents}`} sub={`Última atualização ${fmt(overview.last_document_at)}`} />
            <Tile
              label="Última pesquisa"
              value={overview.last_survey_title ?? "Nenhuma"}
              sub={overview.last_survey_at ? `${fmt(overview.last_survey_at)}${rate !== null ? ` · ${rate}% de resposta` : ""}` : undefined}
            />
            <Tile label="Planos de ação" value={`${overview.plans_approved} aprovados`} sub={`${overview.plans_pending} aguardando revisão`} />
            <Tile label="Tarefas abertas" value={overview.kanban_open} sub="no Kanban" />
            <Tile label="Denúncias abertas" value={overview.reports_open} sub={`${overview.reports_total} no total`} />
            <Tile label="Afastamentos" value={overview.leave_cases_30d} sub="informados nos últimos 30 dias" />
            <Tile label="Chave de IA" value={overview.ai_key_configured ? "Cadastrada" : "Não cadastrada"} />
          </div>
          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">Checklist de implantação</h2>
              <ul className="mt-3 space-y-2">
                {steps.map((s) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    <Icon
                      name={s.done ? "check_circle" : "radio_button_unchecked"}
                      size={18}
                      className={s.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
                    />
                    <span className={s.done ? "" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </section>
            <AuditLog companyId={id} />
          </aside>
        </div>
      )}

      {tab === "documentos" && <DocumentsTab companyId={id} />}

      {tab === "configuracao" && (
        <CommercialForm
          companyId={id}
          initial={{
            plan: (company.plan as string | null) ?? "Piloto",
            senderName: (company.sender_name as string | null) ?? "",
            replyToEmail: (company.reply_to_email as string | null) ?? "",
          }}
        />
      )}

      {tab === "usuarios" && <UsersTab companyId={id} />}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-black tabular-nums">{value}</p>
      {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Lista só metadados dos documentos (nunca o conteúdo). */
async function DocumentsTab({ companyId }: { companyId: string }) {
  const { data: docs } = await createAdminClient()
    .from("kb_documents")
    .select("id, title, file_name, status, chunk_count, flagged_chunk_count, created_at, updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!docs?.length) {
    return <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum documento enviado.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Documento</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Trechos</th>
            <th className="px-4 py-3 font-semibold">Enviado</th>
            <th className="px-4 py-3 font-semibold">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-border/60 last:border-0">
              <td className="max-w-xs truncate px-4 py-2.5 font-medium">{(d.title as string) || (d.file_name as string)}</td>
              <td className="px-4 py-2.5">{d.status === "ready" ? "Pronto" : String(d.status)}</td>
              <td className="px-4 py-2.5 tabular-nums">
                {d.chunk_count ?? 0}
                {(d.flagged_chunk_count as number) > 0 && (
                  <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">({d.flagged_chunk_count} sinalizados)</span>
                )}
              </td>
              <td className="px-4 py-2.5">{fmt(d.created_at as string)}</td>
              <td className="px-4 py-2.5">{fmt(d.updated_at as string)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function UsersTab({ companyId }: { companyId: string }) {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("company_id", companyId)
    .order("name");
  if (!users?.length) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhum usuário. Crie o primeiro RH em <Link href="/usuarios" className="font-semibold text-primary hover:underline">Usuários</Link>.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Nome</th>
            <th className="px-4 py-3 font-semibold">E-mail</th>
            <th className="px-4 py-3 font-semibold">Papel</th>
            <th className="px-4 py-3 font-semibold">Desde</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 font-medium">{u.name}</td>
              <td className="px-4 py-2.5">{u.email}</td>
              <td className="px-4 py-2.5">{ROLE_LABEL[u.role as string] ?? u.role}</td>
              <td className="px-4 py-2.5">{fmt(u.created_at as string)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function AuditLog({ companyId }: { companyId: string }) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("admin_audit_log")
    .select("id, action, created_at, users (name)")
    .eq("target_company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">Atividade do Sentinel</h2>
      {!rows?.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Nenhuma ação registrada.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="text-xs">
              <span className="font-semibold">{ACTION_LABEL[r.action as string] ?? r.action}</span>
              <span className="block text-muted-foreground">
                {(r.users as unknown as { name: string } | null)?.name ?? "—"} · {new Date(r.created_at as string).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

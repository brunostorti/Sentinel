import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import {
  getCompanyAttention,
  getCompanyOverviews,
  getCompanyTimeline,
  getMasterAdmin,
  monthStartIso,
  type CompanyTimeline,
} from "@/lib/sentinel/server";
import { companyAlerts, formatTokens, formatUsd, summarizeAiUsage, type AiUsageRow } from "@/lib/sentinel/attention";
import { modelLabel } from "@/lib/ai/models";
import { AiKeyTest } from "./ai-key-test";
import { adminActionLabel } from "@/lib/sentinel/audit-labels";
import { NotesPanel, type CompanyNote } from "./notes-panel";
import { onboardingSteps, responseRate } from "@/lib/sentinel/onboarding";
import { CommercialForm } from "./commercial-form";

const TABS = [
  { key: "visao", label: "Visão geral", icon: "dashboard" },
  { key: "documentos", label: "Documentos", icon: "description" },
  { key: "ia", label: "Consumo de IA", icon: "toll" },
  { key: "acompanhamento", label: "Notas e linha do tempo", icon: "timeline" },
  { key: "configuracao", label: "Configuração", icon: "settings" },
  { key: "usuarios", label: "Usuários", icon: "group" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", HR: "RH", MANAGER: "Gestor", SUPER_ADMIN: "Sentinel" };

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

  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, cnpj, industry, employee_count, work_regime, plan, sender_name, reply_to_email, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const [overviews, attentionMap] = await Promise.all([getCompanyOverviews(), getCompanyAttention()]);
  const overview = overviews.get(id) ?? null;
  const alerts = companyAlerts(overview, attentionMap.get(id) ?? null);
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
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {[company.cnpj, company.industry, `Cliente desde ${fmt(company.created_at as string)}`].filter(Boolean).join(" · ")}
          </p>
          <Link
            href={`/relatorio-piloto/${id}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <Icon name="picture_as_pdf" size={16} />
            Relatório do piloto
          </Link>
        </div>
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

      {tab === "visao" && alerts.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <h2 className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200">
            <Icon name="warning" size={18} />
            Precisa de atenção
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.key} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${a.level === "alta" ? "bg-red-500" : "bg-amber-500"}`} />
                {a.text}
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {tab === "ia" && (
        <div className="space-y-6">
          <AiUsageTab companyId={id} />
          <AiKeyTest companyId={id} hasKey={overview?.ai_key_configured ?? false} />
        </div>
      )}

      {tab === "acompanhamento" && <FollowUpTab companyId={id} />}

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
    .is("deleted_at", null)
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
              <span className="font-semibold">{adminActionLabel(r.action as string)}</span>
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

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

/** Consumo de IA da empresa: mês atual e os dois anteriores, por modelo. */
async function AiUsageTab({ companyId }: { companyId: string }) {
  const start = new Date(monthStartIso());
  start.setUTCMonth(start.getUTCMonth() - 2);
  const { data } = await createAdminClient()
    .from("ai_usage_events")
    .select("model, source, input_tokens, output_tokens, created_at")
    .eq("company_id", companyId)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false })
    .limit(20000);

  const months = new Map<string, Map<string, AiUsageRow>>();
  for (const r of data ?? []) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
      .format(new Date(r.created_at as string))
      .slice(0, 7);
    const byModel = months.get(key) ?? new Map<string, AiUsageRow>();
    const row = byModel.get(r.model as string) ?? {
      company_id: companyId,
      model: r.model as string,
      calls: 0,
      input_tokens: 0,
      output_tokens: 0,
    };
    row.calls += 1;
    row.input_tokens += (r.input_tokens as number) ?? 0;
    row.output_tokens += (r.output_tokens as number) ?? 0;
    byModel.set(row.model, row);
    months.set(key, byModel);
  }

  if (months.size === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhum uso de IA registrado nos últimos 3 meses. O registro começa a contar a partir desta versão.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {[...months.entries()].map(([key, byModel]) => {
        const rows = [...byModel.values()];
        const total = summarizeAiUsage(rows);
        return (
          <section key={key} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-bold capitalize">{MONTH_LABEL.format(new Date(`${key}-15T12:00:00Z`))}</h2>
              <p className="text-sm">
                <span className="font-black">{formatUsd(total.costUsd)}</span>{" "}
                <span className="text-muted-foreground">
                  estimado · {total.calls} chamadas · {formatTokens(total.inputTokens + total.outputTokens)} tokens
                </span>
              </p>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-semibold">Modelo</th>
                  <th className="py-1 text-right font-semibold">Chamadas</th>
                  <th className="py-1 text-right font-semibold">Entrada</th>
                  <th className="py-1 text-right font-semibold">Saída</th>
                  <th className="py-1 text-right font-semibold">Custo estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.model}>
                    <td className="py-1.5">{modelLabel(r.model)}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.calls}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatTokens(r.input_tokens)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatTokens(r.output_tokens)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatUsd(summarizeAiUsage([r]).costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total.partial && (
              <p className="mt-2 text-xs text-muted-foreground">Há modelo sem preço de referência: o custo pode estar abaixo do real.</p>
            )}
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Estimativa pelos preços de referência do Sentinel (respostas do chat e geração de planos). O valor cobrado de
        fato está no painel do provedor da empresa.
      </p>
    </div>
  );
}

const MILESTONES: { key: keyof CompanyTimeline; label: string }[] = [
  { key: "company_created_at", label: "Empresa criada" },
  { key: "first_user_at", label: "Primeiro usuário (RH ou administrador)" },
  { key: "first_employee_at", label: "Colaboradores importados" },
  { key: "first_document_at", label: "Primeiro documento enviado" },
  { key: "first_survey_at", label: "Primeira pesquisa aberta" },
  { key: "first_plan_approved_at", label: "Primeiro plano de ação aprovado" },
  { key: "first_task_done_at", label: "Primeira tarefa concluída no Kanban" },
];

/** Linha do tempo da implantação e notas internas da equipe. */
async function FollowUpTab({ companyId }: { companyId: string }) {
  const [timeline, { data: notes }] = await Promise.all([
    getCompanyTimeline(companyId),
    createAdminClient()
      .from("company_notes")
      .select("id, body, created_at, users(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const noteList: CompanyNote[] = (notes ?? []).map((n) => ({
    id: n.id as string,
    body: n.body as string,
    created_at: n.created_at as string,
    author: (n.users as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold">Linha do tempo da implantação</h2>
        <ol className="mt-4 space-y-0">
          {MILESTONES.map((m, i) => {
            const date = timeline?.[m.key] ?? null;
            return (
              <li key={m.key} className="relative flex gap-3 pb-4">
                {i < MILESTONES.length - 1 && (
                  <span className="absolute left-[9px] top-5 h-full w-px bg-border" aria-hidden />
                )}
                <Icon
                  name={date ? "check_circle" : "radio_button_unchecked"}
                  size={20}
                  className={`relative shrink-0 bg-card ${date ? "text-emerald-600" : "text-muted-foreground"}`}
                />
                <div>
                  <p className={`text-sm ${date ? "font-semibold" : "text-muted-foreground"}`}>{m.label}</p>
                  <p className="text-xs text-muted-foreground">{date ? fmt(date) : "Ainda não"}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <NotesPanel companyId={companyId} notes={noteList} />
    </div>
  );
}

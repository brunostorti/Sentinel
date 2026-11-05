import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyTimeline, getMasterAdmin, logAdminAction } from "@/lib/sentinel/server";
import { todayInBrazil } from "@/lib/reports/alerts";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Relatório do piloto · Sentinel" };

const SURVEY_STATUS: Record<string, string> = { ACTIVE: "Aberta", CLOSED: "Encerrada", DRAFT: "Rascunho" };
const DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" });
const fmt = (iso: string | null | undefined) => (iso ? DATE.format(new Date(iso)) : "—");
const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "—");

/**
 * Relatório do piloto para apresentar ao cliente ou à banca: só números agregados
 * (adesão, planos, tarefas, canal de denúncia em contagens). Imprime ou salva em PDF.
 */
export default async function PilotReportPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");
  const { id } = await params;
  const db = createAdminClient();

  const { data: company } = await db.from("companies").select("id, name, plan, created_at").eq("id", id).maybeSingle();
  if (!company) notFound();

  const today = todayInBrazil();
  // Mesmo dia, um ano antes (AAAA-MM-DD).
  const since12m = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  const [{ data: surveys }, { data: plans }, { data: lastColumn }, { data: tasks }, { data: reports }, { count: leaveCount }, { count: employees }, timeline] =
    await Promise.all([
      db.from("surveys").select("id, title, status, created_at").eq("company_id", id).neq("status", "DRAFT").order("created_at"),
      db.from("action_plans").select("status").eq("company_id", id),
      db.from("kanban_columns").select("id").eq("company_id", id).order("order_index", { ascending: false }).limit(1).maybeSingle(),
      db.from("kanban_tasks").select("column_id, due_date").eq("company_id", id),
      db.from("reports").select("status").eq("company_id", id),
      db.from("leave_cases").select("id", { count: "exact", head: true }).eq("company_id", id).gte("created_on", since12m),
      db.from("employees").select("id", { count: "exact", head: true }).eq("company_id", id),
      getCompanyTimeline(id),
    ]);

  const surveyRows = await Promise.all(
    (surveys ?? []).map(async (s) => {
      const [{ count: invited }, { count: answered }] = await Promise.all([
        db.from("survey_participants").select("id", { count: "exact", head: true }).eq("survey_id", s.id),
        db.from("survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", s.id),
      ]);
      return { ...s, invited: invited ?? 0, answered: answered ?? 0 };
    })
  );

  const planCount = (st: string[]) => (plans ?? []).filter((p) => st.includes(p.status as string)).length;
  const doneId = lastColumn?.id ?? null;
  const taskTotal = tasks?.length ?? 0;
  const taskDone = (tasks ?? []).filter((t) => t.column_id === doneId).length;
  const taskLate = (tasks ?? []).filter((t) => t.column_id !== doneId && t.due_date && (t.due_date as string) < today).length;
  const reportCount = (st: string) => (reports ?? []).filter((r) => r.status === st).length;

  await logAdminAction(admin.id, "company.report_view", id, {});

  const milestones: [string, string | null | undefined][] = [
    ["Início da parceria", timeline?.company_created_at],
    ["Colaboradores cadastrados", timeline?.first_employee_at],
    ["Documentos da empresa enviados", timeline?.first_document_at],
    ["Primeira pesquisa aberta", timeline?.first_survey_at],
    ["Primeiro plano de ação aprovado", timeline?.first_plan_approved_at],
    ["Primeira ação concluída", timeline?.first_task_done_at],
  ];

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-[#1a1d23] print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; } @media print { body { background: #fff !important; } }`}</style>
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-500">Confira os números e use o botão para salvar em PDF.</p>
        <PrintButton />
      </div>

      <header className="border-b-2 border-[#1968e6] pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1968e6]">Sentinel · Relatório do piloto</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{company.name as string}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plano {(company.plan as string | null) ?? "Piloto"} · gerado em {fmt(new Date().toISOString())} · somente
          números agregados, sem respostas individuais nem relatos.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Colaboradores" value={String(employees ?? 0)} />
        <Kpi label="Pesquisas realizadas" value={String(surveyRows.length)} />
        <Kpi label="Planos aprovados" value={String(planCount(["APPROVED", "COMPLETED"]))} />
        <Kpi label="Ações concluídas" value={`${taskDone}/${taskTotal}`} />
      </section>

      <h2 className="mt-8 border-b border-slate-200 pb-1 text-lg font-black">Adesão às pesquisas</h2>
      {surveyRows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">Nenhuma pesquisa aberta ainda.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1">Pesquisa</th>
              <th className="py-1">Abertura</th>
              <th className="py-1">Situação</th>
              <th className="py-1 text-right">Convidados</th>
              <th className="py-1 text-right">Respostas</th>
              <th className="py-1 text-right">Adesão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {surveyRows.map((s) => (
              <tr key={s.id as string}>
                <td className="py-1.5">{s.title as string}</td>
                <td className="py-1.5">{fmt(s.created_at as string)}</td>
                <td className="py-1.5">{SURVEY_STATUS[s.status as string] ?? (s.status as string)}</td>
                <td className="py-1.5 text-right tabular-nums">{s.invited}</td>
                <td className="py-1.5 text-right tabular-nums">{s.answered}</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{pct(s.answered, s.invited)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="border-b border-slate-200 pb-1 text-lg font-black">Planos de ação</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Aprovados ou concluídos" value={planCount(["APPROVED", "COMPLETED"])} />
            <Row label="Aguardando revisão" value={planCount(["PENDING_REVIEW"])} />
            <Row label="Rejeitados" value={planCount(["REJECTED"])} />
          </dl>
        </section>
        <section>
          <h2 className="border-b border-slate-200 pb-1 text-lg font-black">Execução (Kanban)</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Tarefas criadas" value={taskTotal} />
            <Row label="Concluídas" value={`${taskDone} (${pct(taskDone, taskTotal)})`} />
            <Row label="Atrasadas hoje" value={taskLate} />
          </dl>
        </section>
        <section>
          <h2 className="border-b border-slate-200 pb-1 text-lg font-black">Canal de denúncia</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Recebidas" value={reports?.length ?? 0} />
            <Row label="Em andamento" value={reportCount("IN_PROGRESS")} />
            <Row label="Concluídas" value={reportCount("RESOLVED")} />
            <Row label="Aguardando" value={reportCount("PENDING")} />
          </dl>
          <p className="mt-1 text-xs text-slate-500">Só contagens: o conteúdo dos relatos nunca sai do canal.</p>
        </section>
        <section>
          <h2 className="border-b border-slate-200 pb-1 text-lg font-black">Afastamentos informados</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Últimos 12 meses" value={leaveCount ?? 0} />
          </dl>
          <p className="mt-1 text-xs text-slate-500">Informados de forma anônima pelos colaboradores; não verificados.</p>
        </section>
      </div>

      <h2 className="mt-8 border-b border-slate-200 pb-1 text-lg font-black">Linha do tempo</h2>
      <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {milestones.map(([label, date]) => (
          <li key={label} className="flex justify-between gap-3 border-b border-dotted border-slate-200 py-1">
            <span className={date ? "" : "text-slate-400"}>{label}</span>
            <span className="tabular-nums">{date ? fmt(date) : "—"}</span>
          </li>
        ))}
      </ol>

      <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-500">
        Sentinel · gestão de riscos psicossociais (NR-1). Números calculados em {fmt(new Date().toISOString())} a partir
        dos dados da plataforma.
      </footer>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

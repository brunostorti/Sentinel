import { Icon } from "@/components/icon";
import { LEAVE_REASONS, formatMonth, isLeaveReason } from "@/lib/leave-cases/constants";

export interface LeaveCaseRow {
  id: string;
  reference_month: string;
  reason_code: string;
  department_name: string | null;
}

function reasonLabel(code: string): string {
  return isLeaveReason(code) ? LEAVE_REASONS[code].label : code;
}

function countBy<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}

/** Afastamentos informados por colaboradores (não verificados). Só agregados e lista sem nomes. */
export function LeaveCasesPanel({ rows }: { rows: LeaveCaseRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon name="event_busy" size={32} className="text-muted-foreground" />
        </div>
        <p className="text-xl font-bold">Nenhum afastamento informado</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Os colaboradores podem informar afastamentos pela área deles, sem nome e só com o mês,
          o motivo e o setor.
        </p>
      </div>
    );
  }

  const byReason = countBy(rows, (r) => reasonLabel(r.reason_code));
  const bySector = countBy(rows, (r) => r.department_name ?? "Setor não informado");

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
        <Icon name="info" size={16} className="mt-0.5 shrink-0" />
        Informado por colaboradores, de forma anônima e não verificada. Use como sinal para
        investigar, não como registro oficial de afastamentos.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary title="Total informado" icon="event_busy">
          <p className="text-3xl font-black">{rows.length}</p>
        </Summary>
        <Summary title="Por motivo" icon="category">
          <Bars items={byReason} total={rows.length} />
        </Summary>
        <Summary title="Por setor" icon="apartment">
          <Bars items={bySector} total={rows.length} />
        </Summary>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Mês</th>
              <th className="px-4 py-3 font-semibold">Setor</th>
              <th className="px-4 py-3 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 capitalize">{formatMonth(r.reference_month)}</td>
                <td className="px-4 py-2.5">{r.department_name ?? <span className="text-muted-foreground">Não informado</span>}</td>
                <td className="px-4 py-2.5">{reasonLabel(r.reason_code)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <Icon name={icon} size={18} className="text-primary" />
      </div>
      {children}
    </section>
  );
}

function Bars({ items, total }: { items: [string, number][]; total: number }) {
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 5).map(([label, count]) => (
        <li key={label} className="text-xs">
          <div className="flex justify-between gap-2">
            <span className="truncate">{label}</span>
            <span className="font-bold tabular-nums">{count}</span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round((count / total) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

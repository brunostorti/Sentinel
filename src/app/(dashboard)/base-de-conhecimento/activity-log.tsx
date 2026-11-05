"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { DOCUMENT_EVENT_LABELS } from "@/lib/rag/document-usage";
import {
  describeEventDetails,
  filterToQuery,
  RECENT_EVENTS_LIMIT,
  type EventsFilter,
  type ExportableEvent,
} from "@/lib/rag/document-events-filter";

interface EventRow extends ExportableEvent {
  id: string;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function todayParts() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return { today, year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** Registro de atividades dos documentos: cartão recolhido que expande na própria página, com filtro e CSV. */
export function ActivityLog() {
  const { today, year: thisYear, month: thisMonth } = todayParts();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EventsFilter["mode"]>("recent");
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);

  const filter: EventsFilter =
    mode === "month" ? { mode, year, month } : mode === "period" ? { mode, from, to } : { mode: "recent" };
  const query = filterToQuery(filter);
  const periodInvalid = mode === "period" && (!from || !to || from > to);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/documents/events?${query}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Falha ao carregar o registro.");
        return;
      }
      setEvents(json.events);
      setTruncated(json.truncated === true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (open && !periodInvalid) void load();
  }, [open, load, periodInvalid]);

  const years = Array.from({ length: 4 }, (_, i) => thisYear - i);
  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <Card className="rounded-xl border-slate-200 p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="fact_check" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight">Registro de atividades dos documentos</h2>
          <p className="text-sm text-muted-foreground">
            Quem enviou, baixou, mudou o uso, mandou para a lixeira, restaurou ou excluiu cada documento, e quando.
            Visível só para RH e administradores.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 self-center text-xs font-bold text-primary">
          {open ? "Recolher" : "Expandir"}
          <Icon name={open ? "expand_less" : "expand_more"} size={20} />
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-lg bg-muted p-1">
              <button type="button" className={tab(mode === "recent")} onClick={() => setMode("recent")}>
                Últimos {RECENT_EVENTS_LIMIT}
              </button>
              <button type="button" className={tab(mode === "month")} onClick={() => setMode("month")}>
                Por mês
              </button>
              <button type="button" className={tab(mode === "period")} onClick={() => setMode("period")}>
                Período
              </button>
            </div>

            {mode === "month" && (
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  aria-label="Mês"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  aria-label="Ano"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "period" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  De
                  <input
                    type="date"
                    value={from}
                    max={today}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 rounded-md border border-border bg-card px-2"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  até
                  <input
                    type="date"
                    value={to}
                    max={today}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 rounded-md border border-border bg-card px-2"
                  />
                </label>
              </div>
            )}

            <a
              href={periodInvalid ? undefined : `/api/knowledge/documents/events?${query}&format=csv`}
              aria-disabled={periodInvalid}
              className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 ${
                periodInvalid ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Icon name="download" size={16} />
              Baixar CSV
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Filtre por mês ou por período e baixe em CSV (abre no Excel). O registro não é apagado.
          </p>

          {periodInvalid && <p className="text-xs text-destructive">A data inicial precisa ser antes da final.</p>}

          <div className="max-h-[420px] min-h-[120px] overflow-y-auto rounded-lg border border-border">
            {loading || events === null ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
            ) : events.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma atividade neste período.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {events.map((e) => {
                  const detail = describeEventDetails(e);
                  return (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
                      <span className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">
                          {e.actor ?? (e.details?.auto ? "Sistema" : "Usuário removido")}
                        </span>{" "}
                        {DOCUMENT_EVENT_LABELS[e.action] ?? e.action}{" "}
                        <span className="font-semibold">&quot;{e.document_title}&quot;</span>
                        {detail && (
                          <span className={e.action === "upload" ? "text-amber-700" : "text-muted-foreground"}>
                            {" "}
                            ({detail})
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {events && events.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {events.length} {events.length === 1 ? "registro" : "registros"}
              {truncated ? " (limite atingido: reduza o período)" : ""}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

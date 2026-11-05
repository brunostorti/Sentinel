/* Filtro de período e exportação CSV do registro de atividades dos documentos. Puro. */

import { DOCUMENT_EVENT_LABELS, type DocumentEventAction } from "./document-usage";

export const RECENT_EVENTS_LIMIT = 50;
export const MAX_EVENTS_PER_QUERY = 5000;

export type EventsFilter =
  | { mode: "recent" }
  | { mode: "month"; year: number; month: number } // month 1-12
  | { mode: "period"; from: string; to: string }; // AAAA-MM-DD, inclusivos

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o filtro da URL; qualquer coisa inválida volta para "últimos 50". */
export function parseEventsFilter(params: URLSearchParams): EventsFilter {
  const mode = params.get("mode");
  if (mode === "month") {
    const year = Number(params.get("year"));
    const month = Number(params.get("month"));
    if (Number.isInteger(year) && year >= 2020 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12) {
      return { mode: "month", year, month };
    }
  }
  if (mode === "period") {
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (DAY.test(from) && DAY.test(to) && from <= to) return { mode: "period", from, to };
  }
  return { mode: "recent" };
}

function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Intervalo [início, fim) em horário de Brasília, ou null para "últimos 50". */
export function eventsRange(filter: EventsFilter): { from: string; to: string } | null {
  if (filter.mode === "recent") return null;
  if (filter.mode === "month") {
    const m = String(filter.month).padStart(2, "0");
    const next = filter.month === 12 ? `${filter.year + 1}-01` : `${filter.year}-${String(filter.month + 1).padStart(2, "0")}`;
    return { from: `${filter.year}-${m}-01T00:00:00-03:00`, to: `${next}-01T00:00:00-03:00` };
  }
  return { from: `${filter.from}T00:00:00-03:00`, to: `${nextDay(filter.to)}T00:00:00-03:00` };
}

export function filterToQuery(filter: EventsFilter): string {
  const p = new URLSearchParams({ mode: filter.mode });
  if (filter.mode === "month") {
    p.set("year", String(filter.year));
    p.set("month", String(filter.month));
  } else if (filter.mode === "period") {
    p.set("from", filter.from);
    p.set("to", filter.to);
  }
  return p.toString();
}

export interface ExportableEvent {
  created_at: string;
  actor: string | null;
  action: DocumentEventAction;
  document_title: string;
  details: Record<string, unknown> | null;
}

export function describeEventDetails(e: ExportableEvent): string {
  const d = e.details ?? {};
  if (e.action === "usage_change" && d.to) return `${String(d.from ?? "")} → ${String(d.to)}`;
  if (e.action === "blocked_upload") return "continha CPF";
  if (e.action === "delete" && d.auto) return "automático após 30 dias na lixeira";
  if (e.action === "upload" && Array.isArray(d.personal_data) && d.personal_data.length) {
    return `aviso de dados pessoais: ${d.personal_data.join(", ")}`;
  }
  return "";
}

const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

function cell(value: string): string {
  // Ponto e vírgula: separador padrão do Excel em português. Evita fórmula injetada.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV com BOM (acentos corretos no Excel). */
export function eventsToCsv(events: ExportableEvent[]): string {
  const header = ["Data e hora", "Usuário", "Ação", "Documento", "Detalhes"];
  const rows = events.map((e) => [
    DATE_TIME.format(new Date(e.created_at)),
    e.actor ?? (e.details?.auto ? "Sistema" : "Usuário removido"),
    DOCUMENT_EVENT_LABELS[e.action] ?? e.action,
    e.document_title,
    describeEventDetails(e),
  ]);
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

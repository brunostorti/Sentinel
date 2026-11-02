/* Alerta por setor do canal de denúncia e dos afastamentos. Seguro para o navegador. */

export const DEFAULT_ALERT_THRESHOLD = 3;
export const DEFAULT_ALERT_WINDOW_DAYS = 90;
export const ALERT_THRESHOLD_RANGE = { min: 2, max: 50 } as const;
export const ALERT_WINDOW_RANGE = { min: 7, max: 365 } as const;

export interface AlertSettings {
  threshold: number;
  windowDays: number;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Limite e janela dentro das faixas aceitas pelo banco. */
export function normalizeAlertSettings(threshold: unknown, windowDays: unknown): AlertSettings {
  return {
    threshold: clampInt(threshold, ALERT_THRESHOLD_RANGE.min, ALERT_THRESHOLD_RANGE.max, DEFAULT_ALERT_THRESHOLD),
    windowDays: clampInt(windowDays, ALERT_WINDOW_RANGE.min, ALERT_WINDOW_RANGE.max, DEFAULT_ALERT_WINDOW_DAYS),
  };
}

export interface AlertCase {
  departmentId: string | null;
  /** Tipo da ocorrência (denúncia) ou "Afastamento". */
  category: string;
  /** Data do caso (ISO, só o dia importa). */
  date: string;
}

export interface SectorAlert {
  departmentId: string;
  category: string;
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(iso: string): number {
  // Usa só AAAA-MM-DD: o banco já guarda o dia, sem hora.
  const d = iso.slice(0, 10);
  return Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY_MS);
}

/**
 * Setores que atingiram o limite de casos da mesma categoria dentro da janela.
 * Casos sem setor nunca geram alerta. `today` em AAAA-MM-DD (fuso de Brasília).
 */
export function computeSectorAlerts(
  cases: AlertCase[],
  settings: AlertSettings,
  today: string
): SectorAlert[] {
  const end = dayNumber(today);
  const start = end - settings.windowDays + 1;
  const counts = new Map<string, SectorAlert>();

  for (const c of cases) {
    if (!c.departmentId) continue;
    const day = dayNumber(c.date);
    if (!Number.isFinite(day) || day < start || day > end) continue;
    const key = `${c.departmentId}|${c.category}`;
    const current = counts.get(key);
    if (current) current.count++;
    else counts.set(key, { departmentId: c.departmentId, category: c.category, count: 1 });
  }

  return Array.from(counts.values())
    .filter((a) => a.count >= settings.threshold)
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "pt-BR"));
}

/** Primeiro dia da janela (AAAA-MM-DD), para filtrar a consulta no banco. */
export function windowStart(today: string, windowDays: number): string {
  const end = dayNumber(today);
  return new Date((end - windowDays + 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Hoje em Brasília (AAAA-MM-DD), o mesmo dia que o banco grava. */
export function todayInBrazil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

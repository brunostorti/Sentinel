/* Denúncia parada: chegou e ninguém começou a tratar. Seguro para o navegador. */

export const REPORT_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && (REPORT_STATUSES as readonly string[]).includes(value);
}

/** Rótulos da tela do RH (o colaborador vê outros, em format.ts). */
export const REPORT_STATUS_RH: Record<ReportStatus, string> = {
  PENDING: "Aguardando",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Concluída",
};

/** Dias sem tratamento até a denúncia ser marcada como parada. */
export const STALE_REPORT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dias inteiros desde o recebimento (a data gravada já é só o dia). */
export function reportAgeDays(createdAt: string, now: Date = new Date()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
}

/** Parada = ainda "Aguardando" depois de 7 dias. Em andamento ou concluída não conta. */
export function isStaleReport(status: string, createdAt: string, now: Date = new Date()): boolean {
  return status === "PENDING" && reportAgeDays(createdAt, now) >= STALE_REPORT_DAYS;
}

/** Data de corte para consultar paradas no banco (created_at anterior a ela). */
export function staleCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - STALE_REPORT_DAYS * DAY_MS).toISOString();
}

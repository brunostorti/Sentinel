/**
 * Protocolos que o colaborador enviou NESTE aparelho (localStorage), por usuário.
 * O servidor nunca liga a denúncia à pessoa; é o próprio aparelho que lembra os protocolos
 * para mostrar o andamento. A lista continua depois de sair da conta, mas cada usuário só
 * vê a sua.
 */

import { notifyLocalStore } from "@/lib/local-store";

const REPORTS_PREFIX = "sentinel:denuncias:";
const MAX_SAVED = 50;

export interface SavedReport {
  protocol: string;
  type: string;
  /** Só o dia do envio (AAAA-MM-DD), como no banco. */
  sentOn: string;
}

export function savedReportsKey(userId: string): string {
  return `${REPORTS_PREFIX}${userId}`;
}

export function parseSavedReports(raw: string | null): SavedReport[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (r): r is SavedReport =>
          !!r &&
          typeof r.protocol === "string" &&
          typeof r.type === "string" &&
          typeof r.sentOn === "string"
      )
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedReports(userId: string): SavedReport[] {
  try {
    return parseSavedReports(storage()?.getItem(savedReportsKey(userId)) ?? null);
  } catch {
    return [];
  }
}

function writeSavedReports(userId: string, reports: SavedReport[]): void {
  try {
    storage()?.setItem(savedReportsKey(userId), JSON.stringify(reports.slice(0, MAX_SAVED)));
  } catch {
    // ignora
  }
  notifyLocalStore();
}

export function addSavedReport(userId: string, report: SavedReport): void {
  const current = readSavedReports(userId).filter((r) => r.protocol !== report.protocol);
  writeSavedReports(userId, [report, ...current]);
}

export function removeSavedReport(userId: string, protocol: string): void {
  writeSavedReports(
    userId,
    readSavedReports(userId).filter((r) => r.protocol !== protocol)
  );
}

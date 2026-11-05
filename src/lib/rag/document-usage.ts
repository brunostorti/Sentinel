/* Onde cada documento da empresa pode ser consultado. Seguro para o navegador. */

export const DOCUMENT_USAGES = ["all", "plans", "chat"] as const;
export type DocumentUsage = (typeof DOCUMENT_USAGES)[number];

export const DOCUMENT_USAGE_LABELS: Record<DocumentUsage, string> = {
  all: "Chat e planos de ação",
  plans: "Somente planos de ação",
  chat: "Somente chat",
};

export function isDocumentUsage(value: unknown): value is DocumentUsage {
  return typeof value === "string" && (DOCUMENT_USAGES as readonly string[]).includes(value);
}

export type DocumentEventAction =
  | "upload"
  | "download"
  | "usage_change"
  | "trash"
  | "restore"
  | "delete"
  | "blocked_upload";

/** Dias na lixeira antes da exclusão definitiva automática. */
export const TRASH_RETENTION_DAYS = 30;

/** Dias que faltam para o documento sair da lixeira de vez. */
export function trashDaysLeft(deletedAt: string, now: Date = new Date()): number {
  const elapsed = Math.floor((now.getTime() - new Date(deletedAt).getTime()) / 86_400_000);
  return Math.max(0, TRASH_RETENTION_DAYS - elapsed);
}

export const DOCUMENT_EVENT_LABELS: Record<DocumentEventAction, string> = {
  upload: "enviou",
  download: "baixou",
  usage_change: "mudou o uso de",
  trash: "moveu para a lixeira",
  restore: "restaurou",
  delete: "excluiu definitivamente",
  blocked_upload: "teve o envio bloqueado de",
};

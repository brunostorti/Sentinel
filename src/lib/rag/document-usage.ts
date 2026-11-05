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

export type DocumentEventAction = "upload" | "download" | "usage_change" | "delete" | "blocked_upload";

export const DOCUMENT_EVENT_LABELS: Record<DocumentEventAction, string> = {
  upload: "enviou",
  download: "baixou",
  usage_change: "mudou o uso de",
  delete: "excluiu",
  blocked_upload: "teve o envio bloqueado de",
};

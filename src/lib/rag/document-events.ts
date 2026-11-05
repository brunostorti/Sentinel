import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentEventAction } from "./document-usage";

/**
 * Registro de auditoria dos documentos da empresa. Grava com o service role; falha no
 * registro não interrompe a ação (só vai para o log do servidor).
 */
export async function logDocumentEvent(
  admin: SupabaseClient,
  event: {
    companyId: string;
    documentId: string | null;
    documentTitle: string;
    actorUserId: string | null;
    action: DocumentEventAction;
    details?: Record<string, unknown>;
  }
) {
  const { error } = await admin.from("kb_document_events").insert({
    company_id: event.companyId,
    document_id: event.documentId,
    document_title: event.documentTitle.slice(0, 200),
    actor_user_id: event.actorUserId,
    action: event.action,
    details: event.details ?? {},
  });
  if (error) console.error("kb_document_events insert error:", error);
}

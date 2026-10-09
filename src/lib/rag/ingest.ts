/**
 * Ingestão: páginas de texto → trechos com embeddings em kb_chunks.
 * Usado pelo script da base global (scripts/rag/ingest-global.ts) e pelo upload de
 * documentos da empresa.
 */

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkDocument } from "./chunking";
import { EMBEDDING_MODEL_ID, type KbSourceType } from "./config";
import { embedTexts } from "./embeddings";
import { screenDocumentChunks } from "./screening";

export interface IngestResult {
  chunkCount: number;
  flaggedCount: number;
  flaggedReasons: string[];
}

export function contentHash(pages: string[]): string {
  return createHash("sha256").update(pages.join("\f")).digest("hex");
}

/**
 * Substitui os trechos de um documento já registrado em kb_documents e o marca como
 * pronto. Em caso de erro, grava o status "error" com a mensagem e relança.
 */
export async function ingestPages(
  admin: SupabaseClient,
  doc: { id: string; title: string },
  pages: string[],
  opts: { paged?: boolean } = {}
): Promise<IngestResult> {
  // Texto sem paginação real (HTML, TXT, referências): não grava número de página.
  const paged = opts.paged ?? true;
  try {
    const chunks = chunkDocument(pages);
    if (chunks.length === 0) throw new Error("Nenhum texto aproveitável foi encontrado no documento.");

    const units = screenDocumentChunks(chunks);
    // Só o texto do trecho: prefixar "Documento/Seção" piorou a busca na avaliação de
    // 09/10 (MRR 0,68 → 0,58), porque aproxima trechos diferentes da mesma seção.
    const embeddings = await embedTexts(units.map((u) => u.content));

    const { error: delError } = await admin.from("kb_chunks").delete().eq("document_id", doc.id);
    if (delError) throw new Error(`Falha ao limpar trechos antigos: ${delError.message}`);

    const rows = units.map((unit, i) => ({
      document_id: doc.id,
      chunk_index: i,
      section: unit.section,
      page_start: paged ? unit.pageStart : null,
      page_end: paged ? unit.pageEnd : null,
      content: unit.content,
      embedding: JSON.stringify(embeddings[i]),
      flagged: unit.flagged,
      flag_reason: unit.reason,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await admin.from("kb_chunks").insert(rows.slice(i, i + 100));
      if (error) throw new Error(`Falha ao gravar trechos: ${error.message}`);
    }

    const flagged = units.filter((u) => u.flagged);
    const { error: updError } = await admin
      .from("kb_documents")
      .update({
        status: "ready",
        error_message: null,
        chunk_count: units.length - flagged.length,
        flagged_chunk_count: flagged.length,
        content_hash: contentHash(pages),
        embedding_model: EMBEDDING_MODEL_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);
    if (updError) throw new Error(`Falha ao concluir o documento: ${updError.message}`);

    return {
      chunkCount: units.length - flagged.length,
      flaggedCount: flagged.length,
      flaggedReasons: [...new Set(flagged.map((f) => f.reason!))],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("kb_documents")
      .update({ status: "error", error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", doc.id);
    throw err;
  }
}

export interface GlobalDocumentMeta {
  slug: string;
  title: string;
  sourceType: Exclude<KbSourceType, "documento_empresa">;
  publisher: string | null;
  year: number | null;
  url: string | null;
  citation: string | null;
  /** Planos de exemplo: empresa de origem (a busca não devolve o exemplo a ela). */
  originCompanyId?: string | null;
}

/**
 * Cria/atualiza um documento global pelo slug. Pula o reprocessamento se o texto e o
 * modelo de embeddings não mudaram (a menos que `force`).
 */
export async function upsertGlobalDocument(
  admin: SupabaseClient,
  meta: GlobalDocumentMeta,
  pages: string[],
  opts: { force?: boolean; paged?: boolean } = {}
): Promise<IngestResult & { skipped: boolean }> {
  const hash = contentHash(pages);
  const { data: existing, error: findError } = await admin
    .from("kb_documents")
    .select("id, content_hash, status, embedding_model, chunk_count, flagged_chunk_count")
    .eq("slug", meta.slug)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  const fields = {
    slug: meta.slug,
    title: meta.title,
    source_type: meta.sourceType,
    publisher: meta.publisher,
    year: meta.year,
    url: meta.url,
    citation: meta.citation,
    company_id: null,
    origin_company_id: meta.originCompanyId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (
    existing &&
    !opts.force &&
    existing.content_hash === hash &&
    existing.status === "ready" &&
    existing.embedding_model === EMBEDDING_MODEL_ID
  ) {
    // Só os metadados podem ter mudado (título, citação…).
    await admin.from("kb_documents").update(fields).eq("id", existing.id);
    return { chunkCount: existing.chunk_count, flaggedCount: existing.flagged_chunk_count, flaggedReasons: [], skipped: true };
  }

  let id = existing?.id as string | undefined;
  if (id) {
    const { error } = await admin
      .from("kb_documents")
      .update({ ...fields, status: "processing", embedding_model: EMBEDDING_MODEL_ID })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await admin
      .from("kb_documents")
      .insert({ ...fields, status: "processing", embedding_model: EMBEDDING_MODEL_ID })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Falha ao criar o documento.");
    id = data.id as string;
  }

  const result = await ingestPages(admin, { id, title: meta.title }, pages, { paged: opts.paged });
  return { ...result, skipped: false };
}

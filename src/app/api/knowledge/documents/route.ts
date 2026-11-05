import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMBEDDING_MODEL_ID, KB_BUCKET, KB_MAX_FILE_BYTES } from "@/lib/rag/config";
import { isEmbeddingConfigured } from "@/lib/rag/embeddings";
import { extractPdfPages, hasUsefulText } from "@/lib/rag/extract";
import { ingestPages } from "@/lib/rag/ingest";
import { logDocumentEvent } from "@/lib/rag/document-events";
import { TRASH_RETENTION_DAYS } from "@/lib/rag/document-usage";
import { describeKinds, findPersonalData } from "@/lib/privacy/personal-data";

/**
 * Base de conhecimento da empresa (RAG).
 *
 * GET  — documentos da empresa (com avisos da triagem anti-injeção) + lista da base global.
 * POST — envia um documento (PDF, TXT ou MD; até 10 MB): guarda no bucket privado,
 *        extrai o texto, divide em trechos e gera os embeddings.
 *
 * Leitura: ADMIN, RH e gestores da empresa (RLS). Envio e exclusão: ADMIN e RH.
 * A empresa vem sempre da sessão, nunca do navegador.
 */

export const maxDuration = 120;

const MAX_DOCUMENTS = 50;
const MAX_PAGES = 300;
const EXTENSIONS: Record<string, string> = { pdf: "application/pdf", txt: "text/plain", md: "text/markdown" };

async function getCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("id, company_id, role").eq("auth_id", user.id).single();
  if (!data?.company_id) return null;
  return {
    supabase,
    userId: data.id as string,
    companyId: data.company_id as string,
    canEdit: data.role === "HR" || data.role === "ADMIN",
  };
}

/** Apaga de vez o que está na lixeira há mais de 30 dias (arquivo, registro e trechos). */
async function purgeExpiredTrash(companyId: string) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000).toISOString();
  const { data: expired } = await admin
    .from("kb_documents")
    .select("id, title, storage_path")
    .eq("company_id", companyId)
    .lt("deleted_at", cutoff);
  for (const doc of expired ?? []) {
    if (doc.storage_path) await admin.storage.from(KB_BUCKET).remove([doc.storage_path]);
    const { error } = await admin.from("kb_documents").delete().eq("id", doc.id);
    if (!error) {
      await logDocumentEvent(admin, {
        companyId,
        documentId: doc.id,
        documentTitle: doc.title,
        actorUserId: null,
        action: "delete",
        details: { auto: true },
      });
    }
  }
}

export async function GET() {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { supabase, companyId } = caller;

  await purgeExpiredTrash(companyId);

  const [{ data: companyDocs, error }, { data: globalDocs }, { data: trashDocs }] = await Promise.all([
    supabase
      .from("kb_documents")
      .select(
        "id, title, file_name, status, error_message, chunk_count, flagged_chunk_count, usage, personal_data_kinds, created_at, users:users!kb_documents_uploaded_by_fkey(name)"
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("kb_documents")
      .select("id, title, source_type, publisher, year, url, chunk_count")
      .is("company_id", null)
      .eq("status", "ready")
      .order("source_type"),
    supabase
      .from("kb_documents")
      .select("id, title, file_name, deleted_at, deleter:users!kb_documents_deleted_by_fkey(name)")
      .eq("company_id", companyId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trechos que a triagem tirou da busca, para o RH ver o porquê.
  const flaggedIds = (companyDocs ?? []).filter((d) => d.flagged_chunk_count > 0).map((d) => d.id);
  const { data: flagged } = flaggedIds.length
    ? await supabase
        .from("kb_chunks")
        .select("document_id, chunk_index, flag_reason, content, page_start")
        .in("document_id", flaggedIds)
        .eq("flagged", true)
        .order("chunk_index")
    : { data: [] };

  // Registro de auditoria: só ADMIN e RH (a RLS também limita).
  const { data: events } = caller.canEdit
    ? await supabase
        .from("kb_document_events")
        .select("id, document_title, action, details, created_at, users(name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return NextResponse.json({
    canEdit: caller.canEdit,
    events: (events ?? []).map((e) => ({
      id: e.id,
      document_title: e.document_title,
      action: e.action,
      details: e.details,
      created_at: e.created_at,
      actor: (e.users as unknown as { name: string } | null)?.name ?? null,
    })),
    searchEnabled: isEmbeddingConfigured(),
    documents: (companyDocs ?? []).map((d) => ({
      ...d,
      uploaded_by: (d.users as unknown as { name: string } | null)?.name ?? null,
      users: undefined,
      flagged: (flagged ?? [])
        .filter((f) => f.document_id === d.id)
        .map((f) => ({ reason: f.flag_reason, page: f.page_start, excerpt: f.content.slice(0, 240) })),
    })),
    global: globalDocs ?? [],
    trash: (trashDocs ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      file_name: d.file_name,
      deleted_at: d.deleted_at,
      deleted_by: (d.deleter as unknown as { name: string } | null)?.name ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!caller.canEdit) return NextResponse.json({ error: "Só RH e administradores enviam documentos." }, { status: 403 });
  if (!isEmbeddingConfigured()) {
    return NextResponse.json({ error: "A busca em documentos está desativada neste servidor." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo." }, { status: 400 });
  if (file.size === 0 || file.size > KB_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "O arquivo deve ter até 10 MB." }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXTENSIONS[ext];
  if (!contentType) return NextResponse.json({ error: "Formatos aceitos: PDF, TXT ou MD." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = ext === "pdf";
  if (isPdf && new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "O arquivo não é um PDF válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("kb_documents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", caller.companyId)
    .is("deleted_at", null);
  if ((count ?? 0) >= MAX_DOCUMENTS) {
    return NextResponse.json({ error: `Limite de ${MAX_DOCUMENTS} documentos por empresa.` }, { status: 400 });
  }

  const rawTitle = String(form?.get("title") ?? "").trim();
  const title = (rawTitle || file.name.replace(/\.[^.]+$/, "")).slice(0, 200);
  const { data: doc, error: insertError } = await admin
    .from("kb_documents")
    .insert({
      company_id: caller.companyId,
      title,
      source_type: "documento_empresa",
      file_name: file.name.slice(0, 200),
      status: "processing",
      embedding_model: EMBEDDING_MODEL_ID,
      uploaded_by: caller.userId,
    })
    .select("id")
    .single();
  if (insertError || !doc) return NextResponse.json({ error: "Falha ao registrar o documento." }, { status: 500 });

  const fail = async (message: string, status: number) => {
    await admin.from("kb_documents").update({ status: "error", error_message: message }).eq("id", doc.id);
    return NextResponse.json({ error: message, documentId: doc.id }, { status });
  };

  const safeName = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-100);
  const storagePath = `${caller.companyId}/${doc.id}/${safeName}`;
  const { error: uploadError } = await admin.storage.from(KB_BUCKET).upload(storagePath, bytes, { contentType });
  if (uploadError) return fail("Falha ao guardar o arquivo.", 500);
  await admin.from("kb_documents").update({ storage_path: storagePath }).eq("id", doc.id);

  let pages: string[];
  try {
    pages = isPdf ? await extractPdfPages(bytes) : [new TextDecoder().decode(bytes)];
  } catch {
    return fail("Não foi possível ler o arquivo.", 422);
  }
  if (pages.length > MAX_PAGES) return fail(`O documento tem mais de ${MAX_PAGES} páginas.`, 422);
  if (!hasUsefulText(pages)) {
    return fail("Não encontramos texto no arquivo. PDFs escaneados (só imagem) ainda não são aceitos.", 422);
  }

  // Dados pessoais: CPF bloqueia antes de qualquer envio à OpenAI (o arquivo é apagado);
  // e-mail e telefone (comuns em contatos institucionais) só geram aviso no documento.
  const personal = findPersonalData(pages.join("\n"));
  if (personal.counts.cpf > 0) {
    await admin.storage.from(KB_BUCKET).remove([storagePath]);
    await admin.from("kb_documents").delete().eq("id", doc.id);
    await logDocumentEvent(admin, {
      companyId: caller.companyId,
      documentId: null,
      documentTitle: title,
      actorUserId: caller.userId,
      action: "blocked_upload",
      details: { reason: "cpf", count: personal.counts.cpf },
    });
    return NextResponse.json(
      {
        error: `Encontramos ${personal.counts.cpf === 1 ? "um CPF" : `${personal.counts.cpf} CPFs`} no documento. Para proteger os colaboradores, remova os CPFs e envie de novo. O arquivo não foi guardado.`,
      },
      { status: 422 }
    );
  }
  const warnKinds = personal.kinds.filter((k) => k !== "cpf");
  if (warnKinds.length) {
    await admin.from("kb_documents").update({ personal_data_kinds: warnKinds }).eq("id", doc.id);
  }

  try {
    const result = await ingestPages(admin, { id: doc.id, title }, pages, { paged: isPdf });
    await logDocumentEvent(admin, {
      companyId: caller.companyId,
      documentId: doc.id,
      documentTitle: title,
      actorUserId: caller.userId,
      action: "upload",
      details: { file_name: file.name.slice(0, 200), ...(warnKinds.length ? { personal_data: warnKinds } : {}) },
    });
    return NextResponse.json({
      documentId: doc.id,
      ...result,
      personalDataWarning: warnKinds.length ? describeKinds(warnKinds) : null,
    });
  } catch (err) {
    console.error("rag: ingestão falhou:", err);
    // ingestPages já gravou status "error" com a mensagem.
    return NextResponse.json({ error: "Falha ao processar o documento.", documentId: doc.id }, { status: 500 });
  }
}

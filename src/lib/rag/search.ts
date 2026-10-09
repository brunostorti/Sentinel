/**
 * Busca híbrida na base de conhecimento (função kb_search no banco: vetor + texto
 * completo, combinados por RRF). Docs: docs/rag/2026-10-09-design-rag.md, seção 6.
 *
 * `companyId` deve vir SEMPRE da sessão no servidor: a função só é executável pelo
 * service role e devolve documentos globais + os dessa empresa.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { EMBEDDING_MODEL_ID, type KbSourceType } from "./config";
import { embedQuery, isEmbeddingConfigured } from "./embeddings";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  sourceType: KbSourceType;
  publisher: string | null;
  year: number | null;
  url: string | null;
  citation: string | null;
  section: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  content: string;
  similarity: number;
  vectorRank: number | null;
  textRank: number | null;
  score: number;
}

/**
 * Semelhança mínima (cosseno) para um trecho ser usado. Abaixo disso, o trecho só
 * apareceu por coincidência de palavras e a IA tenderia a "citar por citar".
 * Calibrado com scripts/rag/evaluate.ts em 09/10: o acerto menos parecido teve 0,47 e
 * a pergunta fora do escopo mais parecida, 0,35 (docs/rag/avaliacao/).
 */
export const MIN_SIMILARITY = 0.4;

export async function searchKnowledge(
  admin: SupabaseClient,
  args: {
    companyId: string | null;
    query: string;
    matchCount?: number;
    sourceTypes?: KbSourceType[];
    minSimilarity?: number;
  }
): Promise<RetrievedChunk[]> {
  const query = args.query.trim().slice(0, 2000);
  if (!query || !isEmbeddingConfigured()) return [];

  try {
    const embedding = await embedQuery(query);
    const { data, error } = await admin.rpc("kb_search", {
      p_company_id: args.companyId,
      p_embedding_model: EMBEDDING_MODEL_ID,
      p_query_embedding: JSON.stringify(embedding),
      p_query_text: query,
      p_match_count: args.matchCount ?? 6,
      p_source_types: args.sourceTypes ?? null,
    });
    if (error) throw new Error(error.message);

    const min = args.minSimilarity ?? MIN_SIMILARITY;
    return ((data ?? []) as Record<string, unknown>[])
      .map(
        (r): RetrievedChunk => ({
          chunkId: r.chunk_id as string,
          documentId: r.document_id as string,
          title: r.title as string,
          sourceType: r.source_type as KbSourceType,
          publisher: (r.publisher as string | null) ?? null,
          year: (r.year as number | null) ?? null,
          url: (r.url as string | null) ?? null,
          citation: (r.citation as string | null) ?? null,
          section: (r.section as string | null) ?? null,
          pageStart: (r.page_start as number | null) ?? null,
          pageEnd: (r.page_end as number | null) ?? null,
          content: r.content as string,
          similarity: Number(r.similarity),
          vectorRank: (r.vector_rank as number | null) ?? null,
          textRank: (r.text_rank as number | null) ?? null,
          score: Number(r.score),
        })
      )
      .filter((c) => c.similarity >= min);
  } catch (err) {
    // A busca é um complemento: se falhar, a IA responde sem documentos.
    console.error("rag: busca falhou:", err instanceof Error ? err.message : err);
    return [];
  }
}

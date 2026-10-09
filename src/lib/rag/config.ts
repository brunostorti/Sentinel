/**
 * Configuração fixa do RAG (docs/rag/2026-10-09-design-rag.md).
 *
 * O modelo de embeddings é da plataforma, igual para todas as empresas, e fica
 * registrado em cada documento (kb_documents.embedding_model): trocar de modelo
 * exige reprocessar a base, e a busca só compara vetores do mesmo modelo.
 */

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL_ID = `${EMBEDDING_MODEL}@${EMBEDDING_DIMENSIONS}`;

/**
 * Tamanho dos trechos, em palavras (~1,4 token por palavra em português).
 * Escolhido na avaliação de 09/10 (docs/rag/avaliacao/): com 31 perguntas, trechos de
 * até 120 palavras acertaram no top-5 em 28 (MRR 0,68), contra 25 (MRR 0,55) com 300.
 */
export const CHUNK_MAX_WORDS = 120;
/** Um título novo só abre trecho novo se o atual já tiver ao menos isto. */
export const CHUNK_MIN_WORDS_AT_HEADING = 40;

/** Upload de documentos da empresa. */
export const KB_BUCKET = "kb-documents";
export const KB_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const KB_ALLOWED_MIME = ["application/pdf", "text/plain", "text/markdown"] as const;

export type KbSourceType =
  | "norma"
  | "lei"
  | "guia_oficial"
  | "manual_tecnico"
  | "instrumento"
  | "referencia_cientifica"
  | "plano_exemplo"
  | "documento_empresa";

export const SOURCE_TYPE_LABELS: Record<KbSourceType, string> = {
  norma: "Norma",
  lei: "Lei",
  guia_oficial: "Guia oficial",
  manual_tecnico: "Manual técnico",
  instrumento: "Instrumento",
  referencia_cientifica: "Referência científica",
  plano_exemplo: "Plano de exemplo (anonimizado)",
  documento_empresa: "Documento da empresa",
};

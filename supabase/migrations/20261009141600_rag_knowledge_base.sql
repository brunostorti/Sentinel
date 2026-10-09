-- RAG: base de conhecimento com busca híbrida (vetor + texto completo).
-- Desenho em docs/rag/2026-10-09-design-rag.md.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Texto completo em português, sem acentos ("avaliação" = "avaliacao").
CREATE TEXT SEARCH CONFIGURATION public.pt_unaccent (COPY = pg_catalog.portuguese);
ALTER TEXT SEARCH CONFIGURATION public.pt_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH extensions.unaccent, pg_catalog.portuguese_stem;

-- ── Documentos ──────────────────────────────────────────────────────────
CREATE TABLE public.kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = base global
  slug text UNIQUE, -- identificador estável dos documentos globais (docs/rag/fontes.json)
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'norma', 'lei', 'guia_oficial', 'manual_tecnico', 'instrumento',
    'referencia_cientifica', 'plano_exemplo', 'documento_empresa')),
  publisher text,
  year integer,
  url text,
  citation text, -- referência exibida nas fontes
  storage_path text, -- arquivo enviado pela empresa (bucket kb-documents)
  file_name text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message text,
  embedding_model text NOT NULL,
  content_hash text, -- sha256 do texto extraído
  chunk_count integer NOT NULL DEFAULT 0,
  flagged_chunk_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_type = 'documento_empresa') = (company_id IS NOT NULL))
);
CREATE INDEX kb_documents_company_idx ON public.kb_documents (company_id);

-- ── Trechos ─────────────────────────────────────────────────────────────
CREATE TABLE public.kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, -- copiado do documento (trigger)
  chunk_index integer NOT NULL,
  section text,
  page_start integer,
  page_end integer,
  content text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  flagged boolean NOT NULL DEFAULT false, -- triagem anti-injeção: fora da busca
  flag_reason text,
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('public.pt_unaccent'::regconfig, coalesce(section, '')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent'::regconfig, content), 'B')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX kb_chunks_fts_idx ON public.kb_chunks USING gin (fts);
CREATE INDEX kb_chunks_company_idx ON public.kb_chunks (company_id);
-- Sem índice HNSW na v1: busca exata (poucos milhares de trechos) e sem perda com o filtro por empresa.

CREATE OR REPLACE FUNCTION public.kb_chunks_set_company()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.company_id := (SELECT company_id FROM public.kb_documents WHERE id = NEW.document_id);
  RETURN NEW;
END $$;
CREATE TRIGGER kb_chunks_set_company BEFORE INSERT OR UPDATE OF document_id ON public.kb_chunks
  FOR EACH ROW EXECUTE FUNCTION public.kb_chunks_set_company();

-- ── RLS: leitura global para autenticados; da empresa só para a própria equipe.
--    Gravação apenas pelo servidor (service role), depois de conferir o papel. ──
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY kb_documents_select ON public.kb_documents FOR SELECT TO authenticated USING (
  company_id IS NULL
  OR get_my_role() = 'SUPER_ADMIN'
  OR (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER'))
);
CREATE POLICY kb_chunks_select ON public.kb_chunks FOR SELECT TO authenticated USING (
  company_id IS NULL
  OR get_my_role() = 'SUPER_ADMIN'
  OR (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER'))
);
REVOKE ALL ON public.kb_documents, public.kb_chunks FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.kb_documents, public.kb_chunks FROM authenticated;

-- ── Busca híbrida (RRF, k = 60) ─────────────────────────────────────────
-- Termos da pergunta combinados com OU (websearch_to_tsquery exigiria todos).
CREATE OR REPLACE FUNCTION public.kb_or_tsquery(p_text text)
RETURNS tsquery LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(array_to_string(array(
    SELECT quote_literal(lexeme)
    FROM unnest(tsvector_to_array(to_tsvector('public.pt_unaccent'::regconfig, coalesce(p_text, '')))) AS lexeme
  ), ' | '), '')::tsquery
$$;

CREATE OR REPLACE FUNCTION public.kb_search(
  p_company_id uuid,
  p_embedding_model text,
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_match_count integer DEFAULT 6,
  p_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  title text,
  source_type text,
  publisher text,
  year integer,
  url text,
  citation text,
  section text,
  page_start integer,
  page_end integer,
  content text,
  similarity double precision,
  vector_rank integer,
  text_rank integer,
  score double precision
)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  WITH eligible AS (
    SELECT c.id, c.embedding, c.fts
    FROM public.kb_chunks c
    JOIN public.kb_documents d ON d.id = c.document_id
    WHERE d.status = 'ready'
      AND d.embedding_model = p_embedding_model
      AND (d.company_id IS NULL OR d.company_id = p_company_id)
      AND NOT c.flagged
      AND (p_source_types IS NULL OR d.source_type = ANY (p_source_types))
  ),
  vec AS (
    SELECT id, 1 - (embedding <=> p_query_embedding) AS similarity,
           row_number() OVER (ORDER BY embedding <=> p_query_embedding)::integer AS rnk
    FROM eligible
    ORDER BY embedding <=> p_query_embedding
    LIMIT 40
  ),
  q AS (SELECT public.kb_or_tsquery(p_query_text) AS tsq),
  lex AS (
    SELECT e.id, row_number() OVER (ORDER BY ts_rank_cd(e.fts, q.tsq) DESC)::integer AS rnk
    FROM eligible e, q
    WHERE q.tsq IS NOT NULL AND e.fts @@ q.tsq
    ORDER BY ts_rank_cd(e.fts, q.tsq) DESC
    LIMIT 40
  ),
  fused AS (
    SELECT coalesce(vec.id, lex.id) AS id, vec.similarity, vec.rnk AS vector_rank, lex.rnk AS text_rank,
           (coalesce(1.0 / (60 + vec.rnk), 0) + coalesce(1.0 / (60 + lex.rnk), 0))::double precision AS score
    FROM vec FULL OUTER JOIN lex ON lex.id = vec.id
  )
  SELECT c.id, d.id, d.title, d.source_type, d.publisher, d.year, d.url, d.citation,
         c.section, c.page_start, c.page_end, c.content,
         coalesce(f.similarity, 1 - (c.embedding <=> p_query_embedding)),
         f.vector_rank, f.text_rank, f.score
  FROM fused f
  JOIN public.kb_chunks c ON c.id = f.id
  JOIN public.kb_documents d ON d.id = c.document_id
  ORDER BY f.score DESC
  LIMIT greatest(1, least(p_match_count, 20))
$$;

-- A empresa da busca vem da sessão no servidor: só o service role executa.
REVOKE ALL ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[]) TO service_role;
REVOKE ALL ON FUNCTION public.kb_chunks_set_company() FROM PUBLIC, anon, authenticated;

-- ── Arquivos enviados pelas empresas (privado; acesso só pelo servidor) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kb-documents', 'kb-documents', false, 10485760, ARRAY['application/pdf', 'text/plain', 'text/markdown'])
ON CONFLICT (id) DO NOTHING;

-- Documentos da empresa: onde cada um pode ser usado, aviso de dados pessoais e
-- registro de auditoria (envio, download, mudança de uso, exclusão).

-- 1) Uso do documento: 'all' (chat e planos, padrão), 'chat' ou 'plans'.
ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS usage text NOT NULL DEFAULT 'all';
ALTER TABLE public.kb_documents DROP CONSTRAINT IF EXISTS kb_documents_usage_check;
ALTER TABLE public.kb_documents
  ADD CONSTRAINT kb_documents_usage_check CHECK (usage IN ('all', 'chat', 'plans'));

-- 2) Tipos de dado pessoal encontrados no envio (e-mail, telefone); só para aviso.
ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS personal_data_kinds text[] NOT NULL DEFAULT '{}';

-- 3) Busca respeita o uso: p_purpose = 'chat' | 'plans' | NULL (sem filtro).
DROP FUNCTION IF EXISTS public.kb_search(uuid, text, extensions.vector, text, integer, text[], double precision);

CREATE FUNCTION public.kb_search(
  p_company_id uuid,
  p_embedding_model text,
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_match_count integer DEFAULT 6,
  p_source_types text[] DEFAULT NULL,
  p_text_weight double precision DEFAULT 0.5,
  p_purpose text DEFAULT NULL
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
  WITH eligible AS MATERIALIZED (
    SELECT c.id, c.embedding, c.fts
    FROM public.kb_chunks c
    JOIN public.kb_documents d ON d.id = c.document_id
    WHERE d.status = 'ready'
      AND d.embedding_model = p_embedding_model
      AND (d.company_id IS NULL OR d.company_id = p_company_id)
      AND (d.origin_company_id IS NULL OR d.origin_company_id IS DISTINCT FROM p_company_id)
      AND NOT c.flagged
      AND (p_source_types IS NULL OR d.source_type = ANY (p_source_types))
      AND (p_purpose IS NULL OR d.usage = 'all' OR d.usage = p_purpose)
  ),
  vec AS (
    SELECT id, 1 - (embedding <=> p_query_embedding) AS similarity,
           row_number() OVER (ORDER BY embedding <=> p_query_embedding)::integer AS rnk
    FROM eligible
    ORDER BY embedding <=> p_query_embedding
    LIMIT 40
  ),
  terms AS (
    SELECT DISTINCT quote_literal(lexeme)::tsquery AS tsq
    FROM unnest(tsvector_to_array(to_tsvector('public.pt_unaccent'::regconfig, coalesce(p_query_text, '')))) AS lexeme
  ),
  total AS (SELECT count(*)::double precision AS n FROM eligible),
  idf AS (
    SELECT t.tsq, ln(1 + (total.n - count(e.id) + 0.5) / (count(e.id) + 0.5)) AS w
    FROM terms t
    CROSS JOIN total
    JOIN eligible e ON e.fts @@ t.tsq
    GROUP BY t.tsq, total.n
  ),
  lex AS (
    SELECT e.id, row_number() OVER (ORDER BY sum(i.w) DESC, e.id)::integer AS rnk
    FROM eligible e
    JOIN idf i ON e.fts @@ i.tsq
    GROUP BY e.id
    ORDER BY sum(i.w) DESC, e.id
    LIMIT 40
  ),
  fused AS (
    SELECT coalesce(vec.id, lex.id) AS id, vec.similarity, vec.rnk AS vector_rank, lex.rnk AS text_rank,
           (coalesce(1.0 / (60 + vec.rnk), 0) + coalesce(p_text_weight / (60 + lex.rnk), 0))::double precision AS score
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

REVOKE ALL ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[], double precision, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[], double precision, text) TO service_role;

-- 4) Registro de auditoria dos documentos. Sem FK para o documento: o registro
-- continua depois que o documento é apagado (guarda o título da época).
CREATE TABLE IF NOT EXISTS public.kb_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid,
  document_title text NOT NULL,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('upload', 'download', 'usage_change', 'delete', 'blocked_upload')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_document_events_company_idx
  ON public.kb_document_events (company_id, created_at DESC);

ALTER TABLE public.kb_document_events ENABLE ROW LEVEL SECURITY;

-- Leitura: ADMIN e RH da mesma empresa. Gravação só pelo servidor (service role).
DROP POLICY IF EXISTS kb_document_events_select ON public.kb_document_events;
CREATE POLICY kb_document_events_select ON public.kb_document_events
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR'));

REVOKE ALL ON public.kb_document_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.kb_document_events FROM authenticated;

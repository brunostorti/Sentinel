-- RAG: planos de exemplo entre empresas (docs/rag/2026-10-09-design-rag.md, seção 3).
--
-- Planos aprovados de empresas marcadas com share_plans_as_examples (na v1, só empresas
-- de exemplo com dados sintéticos) entram na base global anonimizados. A empresa de
-- origem fica em origin_company_id, que:
--   • nunca é lida pelo navegador (planos de exemplo ficam fora da RLS de leitura);
--   • serve para a busca não devolver a uma empresa o seu próprio plano como "exemplo".

ALTER TABLE public.companies ADD COLUMN share_plans_as_examples boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.companies.share_plans_as_examples IS
  'Planos aprovados desta empresa podem virar exemplos anonimizados para outras empresas (scripts/rag/index-example-plans.ts). Só com autorização expressa; na v1, empresas de exemplo.';

ALTER TABLE public.kb_documents
  ADD COLUMN origin_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Leitura pelo navegador: planos de exemplo não aparecem (só o servidor os usa).
DROP POLICY kb_documents_select ON public.kb_documents;
CREATE POLICY kb_documents_select ON public.kb_documents FOR SELECT TO authenticated USING (
  (company_id IS NULL AND source_type <> 'plano_exemplo')
  OR get_my_role() = 'SUPER_ADMIN'
  OR (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER'))
);
DROP POLICY kb_chunks_select ON public.kb_chunks;
CREATE POLICY kb_chunks_select ON public.kb_chunks FOR SELECT TO authenticated USING (
  (company_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.kb_documents d WHERE d.id = kb_chunks.document_id AND d.source_type = 'plano_exemplo'))
  OR get_my_role() = 'SUPER_ADMIN'
  OR (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER'))
);

-- Busca: mesma da migração 20261009180416, sem os exemplos vindos da própria empresa.
CREATE OR REPLACE FUNCTION public.kb_search(
  p_company_id uuid,
  p_embedding_model text,
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_match_count integer DEFAULT 6,
  p_source_types text[] DEFAULT NULL,
  p_text_weight double precision DEFAULT 0.5
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

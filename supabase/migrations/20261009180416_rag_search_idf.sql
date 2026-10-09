-- Busca híbrida, ajuste após a avaliação de 09/10 (docs/rag/avaliacao/).
--
-- 1. Parte por palavras: soma do IDF dos termos da pergunta presentes no trecho, em vez
--    de ts_rank_cd. Sem IDF, palavras presentes em quase todo trecho ("trabalho", "risco",
--    "psicossocial") dominavam o ranking.
-- 2. Peso da parte por palavras na fusão (RRF) passa a ser parâmetro, padrão 0,5: com 36
--    perguntas, deu o melhor top-5 (31/36) e acertou as 5 perguntas com termo exato
--    ("item 1.5.5.2.2", "AEP", "Art. 5º"), que a busca só por vetor perdia.

DROP FUNCTION IF EXISTS public.kb_search(uuid, text, extensions.vector, text, integer, text[]);
DROP FUNCTION IF EXISTS public.kb_or_tsquery(text);

CREATE FUNCTION public.kb_search(
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

-- A empresa da busca vem da sessão no servidor: só o service role executa.
REVOKE ALL ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[], double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kb_search(uuid, text, extensions.vector, text, integer, text[], double precision) TO service_role;

-- Migration 025: médias calculadas no banco + regra de 5 com supressão complementar
--
-- Antes, o servidor baixava todas as respostas e calculava as médias em código:
-- (1) a API devolve no máximo 1.000 linhas por consulta, então pesquisas grandes eram
--     calculadas com uma parte aleatória das respostas;
-- (2) com a média da empresa e as médias dos setores visíveis, dava para descobrir por
--     subtração a média de um setor escondido com menos de 5 respostas.
--
-- Agora o banco calcula tudo e só devolve médias agregadas. Respostas individuais
-- nunca saem do banco.
--
-- Regra de 5 com supressão complementar: um setor com menos de 5 respostas fica oculto.
-- Se os setores ocultos somarem menos de 5 respostas, o menor setor visível também é
-- ocultado — assim qualquer subtração (empresa − setores visíveis) revela, no máximo, a
-- média de um grupo com 5 ou mais pessoas.

-- Quem pode consultar uma pesquisa: usuários da própria empresa, SUPER_ADMIN e o
-- servidor (service_role, usado pelo pipeline de IA).
CREATE OR REPLACE FUNCTION public.assert_survey_access(p_survey_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.surveys WHERE id = p_survey_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Pesquisa não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN;
  END IF;
  IF public.get_my_role() = 'SUPER_ADMIN' THEN
    RETURN;
  END IF;
  IF public.get_my_company_id() IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'Sem acesso a esta pesquisa.' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Visibilidade de cada setor numa pesquisa (regra de 5 + supressão complementar).
CREATE OR REPLACE FUNCTION public.survey_department_visibility(p_survey_id uuid)
RETURNS TABLE (department_id uuid, responses integer, suppressed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $$
  WITH counts AS (
    SELECT r.department_id, count(*)::int AS n
    FROM public.survey_responses r
    WHERE r.survey_id = p_survey_id
    GROUP BY r.department_id
  ),
  hidden AS (
    SELECT coalesce(sum(n), 0)::int AS total FROM counts WHERE n < 5
  ),
  ranked AS (
    -- entre os setores visíveis, do menor para o maior
    SELECT c.department_id, c.n, c.n < 5 AS below,
           row_number() OVER (PARTITION BY c.n < 5 ORDER BY c.n, c.department_id NULLS FIRST) AS pos
    FROM counts c
  )
  SELECT r.department_id, r.n,
         r.below OR (h.total > 0 AND h.total < 5 AND NOT r.below AND r.pos = 1)
  FROM ranked r CROSS JOIN hidden h;
$$;

-- Médias por dimensão: empresa inteira (scope = 'company') e por setor.
-- mean_score fica na escala 0–100, com inversão aplicada, média por respondente;
-- vem NULL quando o grupo está oculto pela regra de 5.
CREATE OR REPLACE FUNCTION public.survey_dimension_scores(p_survey_id uuid)
RETURNS TABLE (
  scope text,
  department_id uuid,
  dimension_id uuid,
  respondents integer,
  mean_score numeric,
  suppressed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  PERFORM public.assert_survey_access(p_survey_id);

  RETURN QUERY
  WITH vis AS (
    SELECT * FROM public.survey_department_visibility(p_survey_id)
  ),
  total AS (
    SELECT coalesce(sum(v.responses), 0)::int AS n FROM vis v
  ),
  per_response AS (
    SELECT r.id AS response_id, r.department_id, i.dimension_id,
           avg(CASE WHEN i.is_inverted THEN 100 - a.score ELSE a.score END)::numeric AS m
    FROM public.survey_responses r
    JOIN public.survey_answers a ON a.survey_response_id = r.id
    JOIN public.questionnaire_items i ON i.id = a.question_id
    WHERE r.survey_id = p_survey_id
    GROUP BY r.id, r.department_id, i.dimension_id
  ),
  company AS (
    SELECT 'company'::text AS scope, NULL::uuid AS department_id, pr.dimension_id,
           count(*)::int AS respondents, avg(pr.m) AS mean,
           (SELECT n FROM total) < 5 AS suppressed
    FROM per_response pr
    GROUP BY pr.dimension_id
  ),
  dept AS (
    SELECT 'department'::text AS scope, pr.department_id, pr.dimension_id,
           count(*)::int AS respondents, avg(pr.m) AS mean, v.suppressed
    FROM per_response pr
    JOIN vis v ON v.department_id IS NOT DISTINCT FROM pr.department_id
    GROUP BY pr.department_id, pr.dimension_id, v.suppressed
  )
  SELECT g.scope, g.department_id, g.dimension_id, g.respondents,
         CASE WHEN g.suppressed THEN NULL ELSE round(g.mean, 2) END,
         g.suppressed
  FROM (SELECT * FROM company UNION ALL SELECT * FROM dept) g;
END;
$$;

-- Estatísticas por pergunta de uma dimensão (para a IA apontar as perguntas mais
-- críticas). Vazio quando o grupo pedido está oculto pela regra de 5.
-- high_count / low_count: quantos responderam >= 75 / <= 25 (após inversão).
CREATE OR REPLACE FUNCTION public.survey_item_stats(
  p_survey_id uuid,
  p_dimension_id uuid,
  p_department_id uuid DEFAULT NULL
)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  respondents integer,
  mean_score numeric,
  high_count integer,
  low_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_hidden boolean;
BEGIN
  PERFORM public.assert_survey_access(p_survey_id);

  IF p_department_id IS NULL THEN
    SELECT coalesce(sum(v.responses), 0) < 5 INTO v_hidden
    FROM public.survey_department_visibility(p_survey_id) v;
  ELSE
    SELECT coalesce(bool_or(v.suppressed), true) INTO v_hidden
    FROM public.survey_department_visibility(p_survey_id) v
    WHERE v.department_id = p_department_id;
  END IF;

  IF v_hidden THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH adjusted AS (
    SELECT i.id, i.text, i.order_index,
           CASE WHEN i.is_inverted THEN 100 - a.score ELSE a.score END AS s
    FROM public.survey_responses r
    JOIN public.survey_answers a ON a.survey_response_id = r.id
    JOIN public.questionnaire_items i ON i.id = a.question_id
    WHERE r.survey_id = p_survey_id
      AND i.dimension_id = p_dimension_id
      AND (p_department_id IS NULL OR r.department_id = p_department_id)
  )
  SELECT ad.id, ad.text, count(*)::int, round(avg(ad.s), 2),
         (count(*) FILTER (WHERE ad.s >= 75))::int,
         (count(*) FILTER (WHERE ad.s <= 25))::int
  FROM adjusted ad
  GROUP BY ad.id, ad.text, ad.order_index
  ORDER BY ad.order_index;
END;
$$;

-- Permissões: as funções auxiliares não ficam expostas na API.
REVOKE ALL ON FUNCTION public.assert_survey_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.survey_department_visibility(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.survey_dimension_scores(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survey_item_stats(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.survey_dimension_scores(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.survey_item_stats(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_survey_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.survey_department_visibility(uuid) TO service_role;


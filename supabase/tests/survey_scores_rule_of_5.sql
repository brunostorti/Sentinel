-- Teste das funções de escores no banco (migração 025).
-- Cria dados sintéticos, confere os resultados e desfaz tudo (ROLLBACK) — nada fica gravado.
-- Rode no SQL Editor do Supabase. Se algo falhar, aparece uma exceção "FALHOU: ...".
--
-- Cenário: pesquisa COPSOQ II média com 3 setores e todas as respostas iguais dentro de
-- cada setor — A: 3 respostas (100), B: 6 respostas (50), C: 10 respostas (0).
-- Esperado: A oculto (< 5); B oculto por supressão complementar (A sozinho tem < 5);
-- C visível; empresa = (3·100 + 6·50 + 10·0) / 19 = 31,58.

BEGIN;

CREATE TEMP TABLE t_ctx ON COMMIT DROP AS
SELECT c.id AS company_id,
       (SELECT s.cycle_id FROM public.surveys s WHERE s.company_id = c.id AND s.cycle_id IS NOT NULL LIMIT 1) AS cycle_id,
       (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_ii') AS inst,
       gen_random_uuid() AS survey_id
FROM public.companies c
WHERE c.id = (SELECT company_id FROM public.surveys WHERE cycle_id IS NOT NULL LIMIT 1);

CREATE TEMP TABLE t_dep ON COMMIT DROP AS
SELECT gen_random_uuid() AS id, v.name, v.n, v.score
FROM (VALUES ('TESTE-A', 3, 100), ('TESTE-B', 6, 50), ('TESTE-C', 10, 0)) AS v(name, n, score);

INSERT INTO public.departments (id, company_id, name) SELECT d.id, (SELECT company_id FROM t_ctx), d.name FROM t_dep d;
INSERT INTO public.surveys (id, company_id, title, status, version, instrument_id, cycle_id)
SELECT survey_id, company_id, 'TESTE-025', 'CLOSED', 'MEDIUM', inst, cycle_id FROM t_ctx;

CREATE TEMP TABLE t_resp ON COMMIT DROP AS
SELECT gen_random_uuid() AS id, d.id AS dept, d.score FROM t_dep d, generate_series(1, d.n);
INSERT INTO public.survey_responses (id, survey_id, department_id) SELECT r.id, (SELECT survey_id FROM t_ctx), r.dept FROM t_resp r;
INSERT INTO public.survey_answers (survey_response_id, question_id, score)
SELECT r.id, i.id, r.score FROM t_resp r CROSS JOIN public.questionnaire_items i
WHERE i.instrument_id = (SELECT inst FROM t_ctx) AND i.medium_version;

-- 1. Usuário de outra empresa é bloqueado
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub',
  (SELECT u.auth_id FROM public.users u
   WHERE u.company_id IS DISTINCT FROM (SELECT company_id FROM t_ctx)
     AND u.role <> 'SUPER_ADMIN' AND u.auth_id IS NOT NULL LIMIT 1))::text, true);
DO $t$ BEGIN
  PERFORM * FROM public.survey_dimension_scores((SELECT survey_id FROM t_ctx));
  RAISE EXCEPTION 'FALHOU: usuário de outra empresa conseguiu ler os escores';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $t$;

-- 2. Escores, visibilidade e inversão (como o servidor)
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $t$
DECLARE
  sid uuid := (SELECT survey_id FROM t_ctx);
  inst uuid := (SELECT inst FROM t_ctx);
  v record;
  quant_company numeric; quant_c numeric; conf_company numeric; conf_c numeric;
  n_hidden_items int;
BEGIN
  FOR v IN SELECT d.name, vis.suppressed FROM public.survey_department_visibility(sid) vis JOIN t_dep d ON d.id = vis.department_id LOOP
    IF (v.name = 'TESTE-C') = v.suppressed THEN
      RAISE EXCEPTION 'FALHOU: visibilidade do setor % (oculto = %)', v.name, v.suppressed;
    END IF;
  END LOOP;

  SELECT s.mean_score INTO quant_company FROM public.survey_dimension_scores(sid) s
    JOIN public.questionnaire_scales q ON q.id = s.dimension_id
   WHERE s.scope = 'company' AND q.instrument_id = inst AND q.name = 'Exigências quantitativas';
  SELECT s.mean_score INTO quant_c FROM public.survey_dimension_scores(sid) s
    JOIN public.questionnaire_scales q ON q.id = s.dimension_id JOIN t_dep d ON d.id = s.department_id
   WHERE d.name = 'TESTE-C' AND q.instrument_id = inst AND q.name = 'Exigências quantitativas';
  IF quant_company <> 31.58 OR quant_c <> 0 THEN
    RAISE EXCEPTION 'FALHOU: Exigências quantitativas empresa = %, setor C = % (esperado 31.58 e 0)', quant_company, quant_c;
  END IF;

  -- Confiança horizontal: 2 perguntas normais + 1 invertida ("confiam uns nos outros")
  SELECT s.mean_score INTO conf_company FROM public.survey_dimension_scores(sid) s
    JOIN public.questionnaire_scales q ON q.id = s.dimension_id
   WHERE s.scope = 'company' AND q.instrument_id = inst AND q.name = 'Confiança horizontal';
  SELECT s.mean_score INTO conf_c FROM public.survey_dimension_scores(sid) s
    JOIN public.questionnaire_scales q ON q.id = s.dimension_id JOIN t_dep d ON d.id = s.department_id
   WHERE d.name = 'TESTE-C' AND q.instrument_id = inst AND q.name = 'Confiança horizontal';
  IF conf_company <> 43.86 OR conf_c <> 33.33 THEN
    RAISE EXCEPTION 'FALHOU: Confiança horizontal empresa = %, setor C = % (esperado 43.86 e 33.33)', conf_company, conf_c;
  END IF;

  -- Médias de setores ocultos nunca saem do banco
  IF EXISTS (SELECT 1 FROM public.survey_dimension_scores(sid) s WHERE s.suppressed AND s.mean_score IS NOT NULL) THEN
    RAISE EXCEPTION 'FALHOU: grupo oculto devolveu média';
  END IF;

  -- Estatísticas por pergunta de um setor oculto: nada
  SELECT count(*) INTO n_hidden_items FROM public.survey_item_stats(sid,
    (SELECT id FROM public.questionnaire_scales WHERE instrument_id = inst AND name = 'Confiança horizontal'),
    (SELECT id FROM t_dep WHERE name = 'TESTE-B'));
  IF n_hidden_items <> 0 THEN
    RAISE EXCEPTION 'FALHOU: setor oculto devolveu % perguntas', n_hidden_items;
  END IF;
END $t$;

SELECT 'OK: todas as verificações passaram' AS resultado;
ROLLBACK;

-- Ciclo de aprendizado: o plano passa a guardar a intervenção do catálogo que o originou.
-- Antes, plano e resultado (action_outcomes) eram ligados só pela dimensão; com dois
-- planos na mesma dimensão, os dois resultados apontavam para o mesmo plano.

ALTER TABLE public.action_plans ADD COLUMN intervention_id text;

-- Preenche os planos existentes a partir dos resultados já gravados.
UPDATE public.action_plans p
SET intervention_id = o.intervention_id
FROM (
  SELECT DISTINCT ON (action_plan_id) action_plan_id, intervention_id
  FROM public.action_outcomes
  WHERE action_plan_id IS NOT NULL
  ORDER BY action_plan_id, created_at
) o
WHERE o.action_plan_id = p.id AND p.intervention_id IS NULL;

CREATE INDEX action_plans_intervention_idx ON public.action_plans (company_id, intervention_id);

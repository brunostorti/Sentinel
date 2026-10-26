-- Feedback anônimo dos colaboradores sobre os planos de ação.
-- Mesmas proteções da denúncia: nenhuma identidade é gravada e só o DIA do envio fica.
-- O envio só é liberado quando o departamento tem 5+ colaboradores (regra dos 5 / LGPD),
-- checado na API; o department_id aqui serve para o RH saber a área.
CREATE TABLE IF NOT EXISTS public.action_plan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_plan_id uuid REFERENCES public.action_plans(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  rating text NOT NULL CHECK (rating IN ('FUNCIONANDO', 'AJUSTAR', 'NAO_FUNCIONA')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'READ')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_plan_feedback_company_idx
  ON public.action_plan_feedback (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.action_plan_feedback_day_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.created_at := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
                    AT TIME ZONE 'America/Sao_Paulo';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_plan_feedback_day_only ON public.action_plan_feedback;
CREATE TRIGGER trg_action_plan_feedback_day_only
  BEFORE INSERT ON public.action_plan_feedback
  FOR EACH ROW EXECUTE FUNCTION public.action_plan_feedback_day_only();

ALTER TABLE public.action_plan_feedback ENABLE ROW LEVEL SECURITY;

-- Só RH/Admin da empresa leem e marcam como lido. O envio passa pela API (service role).
DROP POLICY IF EXISTS action_plan_feedback_select_hr ON public.action_plan_feedback;
CREATE POLICY action_plan_feedback_select_hr ON public.action_plan_feedback
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() = ANY (ARRAY['ADMIN', 'HR']));

DROP POLICY IF EXISTS action_plan_feedback_update_hr ON public.action_plan_feedback;
CREATE POLICY action_plan_feedback_update_hr ON public.action_plan_feedback
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() = ANY (ARRAY['ADMIN', 'HR']))
  WITH CHECK (company_id = get_my_company_id());

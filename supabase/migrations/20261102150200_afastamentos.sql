-- Afastamentos informados por colaboradores (anônimos e não verificáveis).
-- Minimização (LGPD, dado de saúde): sem nome, sem e-mail, sem texto livre, sem CID,
-- sem dia exato (só o mês de referência). Setor só com 5+ colaboradores (validado na rota).
-- Leitura: RH/Admin da empresa. Inserção: apenas pela rota do servidor (service role).

CREATE TABLE IF NOT EXISTS public.leave_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  reference_month date NOT NULL CHECK (EXTRACT(DAY FROM reference_month) = 1),
  reason_code text NOT NULL CHECK (reason_code IN (
    'acidente_de_trabalho',
    'doenca_ocupacional',
    'doenca_comum',
    'saude_mental',
    'outros',
    'prefiro_nao_informar'
  )),
  -- Só o dia do envio, no fuso de Brasília (como nas denúncias).
  created_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date)
);

CREATE INDEX IF NOT EXISTS leave_cases_company_month_idx
  ON public.leave_cases (company_id, reference_month);
CREATE INDEX IF NOT EXISTS leave_cases_company_department_idx
  ON public.leave_cases (company_id, department_id);

ALTER TABLE public.leave_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.leave_cases FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.leave_cases FROM authenticated;

CREATE POLICY leave_cases_select_hr ON public.leave_cases
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR'));

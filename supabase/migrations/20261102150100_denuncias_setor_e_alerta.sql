-- Denúncia com setor (opcional, escolhido por quem denuncia) e alerta por setor.
-- O setor só é aceito pelo servidor quando tem 5 ou mais colaboradores (regra dos 5);
-- a coluna continua opcional para as denúncias antigas e para quem prefere não informar.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS department_id uuid
    REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reports_company_department_idx
  ON public.reports (company_id, department_id, created_at);

-- Alerta: N casos do mesmo tipo no mesmo setor dentro da janela (padrão 3 em 90 dias).
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS report_alert_threshold integer NOT NULL DEFAULT 3
    CHECK (report_alert_threshold BETWEEN 2 AND 50),
  ADD COLUMN IF NOT EXISTS report_alert_window_days integer NOT NULL DEFAULT 90
    CHECK (report_alert_window_days BETWEEN 7 AND 365);

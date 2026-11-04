-- Dados de demonstração: as empresas criadas antes do piloto são de teste e saem da
-- lista do Painel Sentinel (continuam no banco para QA). Empresas novas entram como
-- reais (is_demo = false) e aparecem direto nos cards.
-- Só o servidor altera a coluna: authenticated recebe apenas SELECT nela.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE public.companies
SET is_demo = true
WHERE created_at < TIMESTAMPTZ '2026-11-04 00:00:00-03';

GRANT SELECT (is_demo) ON public.companies TO authenticated;

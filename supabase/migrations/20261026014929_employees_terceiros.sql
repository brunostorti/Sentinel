-- Colaboradores terceirizados: marcação "Terceiro" e, opcionalmente, a empresa prestadora.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_third_party boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_company text;

-- Empresa prestadora só faz sentido para terceiros.
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_third_party_company_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_third_party_company_check
  CHECK (is_third_party OR third_party_company IS NULL);

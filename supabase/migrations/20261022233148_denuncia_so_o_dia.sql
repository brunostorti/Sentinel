-- Denúncia guarda só o DIA do envio (mesma proteção das respostas de pesquisa, migração
-- 20261008211953_security_hotfix). Aprovada pelo usuário em 22/10/2026, inclusive para as
-- denúncias já gravadas (irreversível: a hora original não volta).
--
-- Antes: created_at e updated_at eram gravados no instante exato do envio e o RH via
-- "Recebido em 22/10 às 14:32"; quem soubesse quem estava no computador naquela hora podia
-- deduzir o autor. Agora os dois ficam com a meia-noite do dia em Brasília (assim a data
-- exibida é a mesma em UTC e no fuso do Brasil).
--
-- O updated_at continua mudando quando o RH altera o status (ação do RH, não do autor).
-- is_anonymous: o sistema nunca guardou identidade do autor; a caixa "anônimo" saiu do
-- formulário e todas as denúncias passam a ser marcadas como anônimas.

CREATE OR REPLACE FUNCTION public.reports_day_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  today timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
                       AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  NEW.created_at := today;
  NEW.updated_at := today;
  NEW.is_anonymous := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_day_only ON public.reports;
CREATE TRIGGER trg_reports_day_only
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_day_only();

UPDATE public.reports
SET created_at = date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
                 AT TIME ZONE 'America/Sao_Paulo',
    updated_at = date_trunc('day', updated_at AT TIME ZONE 'America/Sao_Paulo')
                 AT TIME ZONE 'America/Sao_Paulo',
    is_anonymous = true;

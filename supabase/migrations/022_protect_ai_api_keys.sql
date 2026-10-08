-- Migration 022: Chaves de IA das empresas fora do alcance do navegador
--
-- Antes: companies.ai_api_keys (chaves OpenAI/Anthropic/Google em texto) era lida e
-- gravada pelo navegador com a sessão do usuário — qualquer papel da empresa,
-- inclusive gestor, via com a chave completa e podia trocá-la.
-- Agora: a coluna só é acessada pelo servidor (service role) na rota
-- /api/company/ai-settings, que devolve apenas os 4 últimos caracteres e só deixa
-- RH/Admin alterarem. Para isso o acesso por coluna foi restrito:
--   • SELECT: todas as colunas, exceto ai_api_keys;
--   • UPDATE: só os dados cadastrais que a aplicação edita (nome, setor, porte,
--     regime) — modelo e chaves passam pela rota do servidor.
-- As policies RLS de companies não mudam.

BEGIN;

REVOKE SELECT, UPDATE ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id, name, cnpj, industry, logo_url, created_at, updated_at,
  employee_count, work_regime, ai_model
) ON public.companies TO authenticated;

GRANT UPDATE (
  name, industry, logo_url, employee_count, work_regime, updated_at
) ON public.companies TO authenticated;

COMMIT;

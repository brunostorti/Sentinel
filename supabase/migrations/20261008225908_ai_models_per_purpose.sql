-- Migration 023: Modelo de IA por finalidade (planos × chat)
--
-- Decisão de 08/10/2026: cada empresa escolhe um modelo para GERAR PLANOS e outro
-- para o CHAT. Padrões: planos = Claude Opus 5.5 (qualidade importa, geração
-- rara); chat = IA da Mauá (gratuita, infraestrutura acadêmica). Sem chave do
-- provedor escolhido, o chat cai para a Mauá; planos usam só provedores externos e
-- exigem a chave (src/lib/ai/provider-factory.ts).
--
-- A coluna antiga ai_model fica como legado (não é mais lida pelo código) e pode
-- ser removida depois que o deploy do código novo estiver no ar. Todas as empresas
-- existentes (dados de teste) recebem os novos padrões — o padrão antigo
-- (claude-3-5-sonnet-20240620) foi descontinuado pela Anthropic.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ai_plan_model TEXT NOT NULL DEFAULT 'claude-opus-5-5',
  ADD COLUMN IF NOT EXISTS ai_chat_model TEXT NOT NULL DEFAULT 'maua';

COMMENT ON COLUMN public.companies.ai_plan_model IS
  'Modelo de IA usado para gerar planos de ação (ex.: claude-opus-5-5, gpt-6.1-sol, gemini-3.8-flash, maua).';
COMMENT ON COLUMN public.companies.ai_chat_model IS
  'Modelo de IA usado no chat do assistente (ex.: maua, claude-haiku-5-5).';
COMMENT ON COLUMN public.companies.ai_model IS
  'LEGADO (substituída por ai_plan_model e ai_chat_model em 08/10/2026). Não é mais lida.';

-- A migração 022 restringiu o acesso por coluna: as novas colunas precisam ser
-- liberadas para leitura (a escrita continua só pela rota do servidor).
GRANT SELECT (ai_plan_model, ai_chat_model) ON public.companies TO authenticated;


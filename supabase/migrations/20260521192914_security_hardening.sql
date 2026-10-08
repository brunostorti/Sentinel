-- [Reconstruída em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260521192914
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 21/05/2026,
-- recuperado de schema_migrations.statements. Antes este arquivo só tinha comentários.
--
-- Issues do Database Linter NÃO corrigidos nesta migration (anotados em 21/05/2026):
--  7. Storage bucket reports com policy SELECT pública (TODO: signed URLs)
--  8. Leaked Password Protection (TODO: habilitar no Supabase Auth dashboard)
-- Observação (auditoria 2026-10-07): o REVOKE EXECUTE ... FROM anon no fim não
-- tem efeito prático, porque anon herda EXECUTE do grant padrão a PUBLIC.
-- ===== SQL original (não editar) =====
-- Migration 014: Hardening de segurança (advisors do Supabase)
-- Corrige issues encontrados pelo Database Linter em 21/05/2026.

-- ═════ 1. FIX: certificates INSERT policy era WITH CHECK (true)
DROP POLICY IF EXISTS "Auth users can insert certificates" ON public.certificates;
CREATE POLICY "certificates_insert_company" ON public.certificates
  FOR INSERT WITH CHECK (
    get_my_role() = 'SUPER_ADMIN' OR (
      company_id = get_my_company_id()
      AND get_my_role() IN ('ADMIN', 'HR')
    )
  );

-- ═════ 2. FIX: reports INSERT policy era WITH CHECK (true)
-- Mantemos permissão de anônimo (denúncia pode ser sem login), MAS validamos
-- que a company_id referencia uma empresa real (FK garante isso) e que o
-- protocolo nao foi inflado. Anon precisa criar; demais checks ficam em endpoint.
DROP POLICY IF EXISTS "Public can insert reports" ON public.reports;
CREATE POLICY "reports_insert_public_with_company" ON public.reports
  FOR INSERT WITH CHECK (
    -- Aceita anônimo, mas company_id deve estar definido (FK valida existência)
    company_id IS NOT NULL
    -- Bloqueia auto-injection de status pre-set
    AND (status IS NULL OR status = 'PENDING')
  );

-- ═════ 3. FIX: survey_progress sem policies
-- A tabela armazena rascunhos de respostas pseudonimizados por token_hash.
-- Acesso DEVE ser via service_role (admin) apenas — RLS true bloqueia tudo
-- e a aplicação usa createAdminClient(). Documentamos isso explicitamente.
DROP POLICY IF EXISTS "survey_progress_locked" ON public.survey_progress;
CREATE POLICY "survey_progress_no_direct_access" ON public.survey_progress
  FOR ALL USING (false) WITH CHECK (false);
COMMENT ON TABLE public.survey_progress IS
  'Rascunhos de respostas em progresso. Acesso APENAS via service_role (createAdminClient). RLS bloqueia acesso direto via anon/authenticated.';

-- ═════ 5. FIX: search_path mutável em 3 funções
-- Risco de search_path hijacking quando função SECURITY DEFINER é executada.
ALTER FUNCTION public.get_my_role() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_my_company_id() SET search_path = public, pg_catalog;

-- Tenta update_updated_at (pode não existir com esse nome exato — algumas
-- migrations usam touch_updated_at). Faz silencioso se não houver.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_catalog';
  END IF;
END $$;

-- ═════ 6. Hardening: REVOKE SELECT FROM anon em tabelas sensíveis
-- Tabelas que NUNCA devem ser lidas sem autenticação:
REVOKE SELECT ON public.users FROM anon;
REVOKE SELECT ON public.survey_responses FROM anon;
REVOKE SELECT ON public.survey_answers FROM anon;
REVOKE SELECT ON public.survey_tokens FROM anon;
REVOKE SELECT ON public.survey_participants FROM anon;
REVOKE SELECT ON public.survey_target_departments FROM anon;
REVOKE SELECT ON public.employees FROM anon;
REVOKE SELECT ON public.action_plans FROM anon;
REVOKE SELECT ON public.action_outcomes FROM anon;
REVOKE SELECT ON public.company_profiles FROM anon;
REVOKE SELECT ON public.company_actions_taken FROM anon;
REVOKE SELECT ON public.profile_events FROM anon;
REVOKE SELECT ON public.chat_threads FROM anon;
REVOKE SELECT ON public.chat_messages FROM anon;
REVOKE SELECT ON public.kanban_tasks FROM anon;
REVOKE SELECT ON public.kanban_columns FROM anon;
REVOKE SELECT ON public.kanban_comments FROM anon;
REVOKE SELECT ON public.companies FROM anon;
REVOKE SELECT ON public.departments FROM anon;

-- Tabelas que DEVEM permanecer públicas (sem mexer):
--   kb_references, kb_intervention_references     -- metodologia pública
--   universal_categories, questionnaire_instruments, questionnaire_items,
--   questionnaire_scales, response_formats        -- catálogos
--   certificates (SELECT por hash)                -- validação pública
--   reports (SELECT por protocolo)                -- acompanhamento anônimo

-- ═════ Funções RPC: REVOKE EXECUTE FROM anon
-- get_my_role / get_my_company_id só fazem sentido para auth users.
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_company_id() FROM anon;

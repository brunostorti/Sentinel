-- [Reconstruída em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260520230533
-- Nome no banco: 008b_lock_function_search_path
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 20/05/2026,
-- recuperado de schema_migrations.statements (o arquivo nunca tinha sido versionado).
-- O 20260520230255_personalized_plans_pipeline.sql já define o search_path nas
-- próprias funções, então aqui é no-op num banco novo — mantido como registro histórico.
-- ===== SQL original (não editar) =====
-- Fix advisory WARN: function_search_path_mutable
ALTER FUNCTION public.create_company_profile_on_company_insert() SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_catalog;

-- [Reconstruída em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260825145139
-- Nome no banco: kanban_source_survey_index
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 25/08/2026,
-- recuperado de schema_migrations.statements (o arquivo nunca tinha sido versionado).
-- ATENÇÃO (auditoria 2026-10-07): apesar de registrada como aplicada, o índice
-- idx_kanban_tasks_source_survey NÃO existia em produção (sentinel-v2).
-- Recriado pela 20261008184914_reconcile_drift em 2026-10-08.
-- ===== SQL original (não editar) =====
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_source_survey
ON kanban_tasks(source_survey_id);

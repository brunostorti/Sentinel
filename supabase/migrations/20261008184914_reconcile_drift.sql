-- Migration 019: Reconciliação de drift (auditoria de 2026-10-07)
-- Nome de arquivo PROVISÓRIO (ver tasks/migration-drift.md).
--
-- Objetivo: fazer com que rodar todas as migrações do zero produza o mesmo
-- schema que existe em produção (sentinel-v2). Cada bloco é idempotente:
-- em produção só o item 3 (índice) muda algo; os itens 1 e 2 já estão assim lá.

-- 1. Policy criada direto no banco (fora de qualquer migração).
--    Permite a ADMIN/HR remover participantes de pesquisas da própria empresa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'survey_participants'
      AND policyname = 'survey_participants_delete'
  ) THEN
    CREATE POLICY "survey_participants_delete" ON public.survey_participants
      FOR DELETE TO authenticated
      USING (
        get_my_role() IN ('ADMIN', 'HR')
        AND EXISTS (
          SELECT 1 FROM public.surveys s
          WHERE s.id = survey_participants.survey_id
            AND s.company_id = get_my_company_id()
        )
      );
  END IF;
END $$;

-- 2. Policy criada pela 004 e removida direto no banco: causava recursão de RLS
--    (surveys -> survey_participants -> surveys). Ver 003_fix_rls_recursion.sql.
DROP POLICY IF EXISTS "participant_surveys_select" ON public.surveys;

-- 3. Índice registrado como aplicado em 25/08/2026 (017b_kanban_source_survey_index)
--    mas ausente em produção. Usado nos filtros por source_survey_id do Kanban,
--    certificados e detalhe de pesquisa.
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_source_survey
  ON public.kanban_tasks(source_survey_id);

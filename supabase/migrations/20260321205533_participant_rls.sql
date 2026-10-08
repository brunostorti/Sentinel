-- [Nota da auditoria de 2026-10-08]
-- Versão no banco: 20260321205533 (nome no banco: fix_participant_survey_rls)
-- ATENÇÃO: este arquivo NÃO é idêntico ao SQL registrado nessa versão.
-- O registro só cria participant_surveys_select. A policy participant_self_select
-- (abaixo) foi criada à mão e existe em produção, por isso é mantida aqui.
-- A participant_surveys_select foi removida depois, também à mão, porque causava
-- recursão de RLS; a remoção está em 20261008184914_reconcile_drift.

-- Allow OTP-authenticated employees to see their own participations
CREATE POLICY "participant_self_select" ON survey_participants
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
  );

-- Allow OTP-authenticated employees to see surveys they participate in
CREATE POLICY "participant_surveys_select" ON surveys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survey_participants sp
      WHERE sp.survey_id = surveys.id
        AND sp.email = (auth.jwt() ->> 'email')
    )
  );

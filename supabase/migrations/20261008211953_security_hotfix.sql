-- Migration 020: Correções urgentes de segurança (diagnóstico de 08/10/2026)
-- Aprovada pelo usuário em 08/10/2026 (opção A: inclui a alteração irreversível
-- dos horários já gravados, para proteger também as respostas existentes).
--
-- S1. Escalada de privilégio: a policy users_update permitia ao usuário alterar o
--     próprio registro inteiro, incluindo role e company_id (qualquer gestor podia
--     virar SUPER_ADMIN). Agora o usuário só altera nome e consentimento LGPD.
--     Mudanças de papel/empresa passam a ser exclusivas do servidor (service role).
--
-- S2. Anonimato: survey_responses.submitted_at e survey_participants.updated_at eram
--     gravados no mesmo instante e legíveis por qualquer usuário da empresa,
--     permitindo ligar a resposta ao e-mail do colaborador. Agora:
--       • o participante não registra mais o horário em que respondeu;
--       • a resposta guarda só o DIA do envio;
--       • as respostas brutas (survey_answers) só são lidas pelo servidor; a
--         aplicação exibe apenas agregados com a regra de 5.
--     Nenhum código usa esses dois horários (verificado em 08/10/2026).
--
-- S4 (parte do banco). Denúncias: só RH/Admin da empresa leem e atualizam
--     (o gestor pode ser o denunciado). Inserção direta pela API foi fechada —
--     a rota /api/reports/submit valida o colaborador e grava com service role.

-- ═══ S1. users: só nome e consentimento são editáveis pelo próprio usuário ═══
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (name, lgpd_consent_at, lgpd_consent_version, updated_at)
  ON public.users TO authenticated;

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE
  USING (get_my_role() = 'SUPER_ADMIN' OR auth_id = (SELECT auth.uid()))
  WITH CHECK (get_my_role() = 'SUPER_ADMIN' OR auth_id = (SELECT auth.uid()));

-- ═══ S2. Anonimato das respostas ═══
-- (a) O participante deixa de registrar o instante em que respondeu.
DROP TRIGGER IF EXISTS trg_survey_participants_updated ON public.survey_participants;
UPDATE public.survey_participants SET updated_at = invited_at;

-- (b) A resposta guarda só o dia do envio (inclusive as já existentes).
UPDATE public.survey_responses SET submitted_at = date_trunc('day', submitted_at);

CREATE OR REPLACE FUNCTION public.truncate_response_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.submitted_at := date_trunc('day', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_survey_responses_day_only ON public.survey_responses;
CREATE TRIGGER trg_survey_responses_day_only
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.truncate_response_submitted_at();

-- (c) Respostas brutas: nenhum acesso direto (só service role, que ignora RLS).
DROP POLICY IF EXISTS survey_answers_select ON public.survey_answers;
CREATE POLICY survey_answers_no_direct_access ON public.survey_answers
  FOR SELECT USING (false);

-- ═══ S4. Denúncias: RH/Admin apenas; sem inserção direta ═══
DROP POLICY IF EXISTS reports_insert_public_with_company ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can view company reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can update company reports" ON public.reports;

CREATE POLICY reports_select_hr ON public.reports FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR'));

CREATE POLICY reports_update_hr ON public.reports FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR'))
  WITH CHECK (company_id = get_my_company_id());


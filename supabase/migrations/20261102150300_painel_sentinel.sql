-- Painel Sentinel (super admin): plano e remetente por empresa, registro de ações
-- e uma função que devolve SÓ agregados por empresa (nunca respostas, denúncias ou textos).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'Piloto'
    CHECK (char_length(btrim(plan)) BETWEEN 1 AND 40),
  ADD COLUMN IF NOT EXISTS sender_name text
    CHECK (sender_name IS NULL OR char_length(sender_name) <= 80),
  ADD COLUMN IF NOT EXISTS reply_to_email text
    CHECK (reply_to_email IS NULL OR char_length(reply_to_email) <= 200);

-- Registro das ações do super admin (quem, o quê, quando). Gravado pelo servidor.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) <= 80),
  target_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM authenticated;

CREATE POLICY admin_audit_log_select ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (get_my_role() = 'SUPER_ADMIN');

-- Visão geral por empresa: só contagens e datas. Executável apenas pelo service role
-- (o servidor confere antes que quem pediu é SUPER_ADMIN).
CREATE OR REPLACE FUNCTION public.sentinel_company_overview()
RETURNS TABLE (
  company_id uuid,
  employees bigint,
  departments bigint,
  platform_users bigint,
  documents bigint,
  documents_ready bigint,
  last_document_at timestamptz,
  surveys bigint,
  last_survey_title text,
  last_survey_status text,
  last_survey_at timestamptz,
  last_survey_participants bigint,
  last_survey_responses bigint,
  plans_approved bigint,
  plans_pending bigint,
  reports_open bigint,
  reports_total bigint,
  leave_cases_30d bigint,
  kanban_open bigint,
  ai_key_configured boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    (SELECT count(*) FROM employees e WHERE e.company_id = c.id),
    (SELECT count(*) FROM departments d WHERE d.company_id = c.id),
    (SELECT count(*) FROM users u WHERE u.company_id = c.id),
    (SELECT count(*) FROM kb_documents k WHERE k.company_id = c.id),
    (SELECT count(*) FROM kb_documents k WHERE k.company_id = c.id AND k.status = 'ready'),
    (SELECT max(k.updated_at) FROM kb_documents k WHERE k.company_id = c.id),
    (SELECT count(*) FROM surveys s WHERE s.company_id = c.id),
    ls.title,
    ls.status::text,
    ls.created_at,
    (SELECT count(*) FROM survey_participants p WHERE p.survey_id = ls.id),
    (SELECT count(*) FROM survey_responses r WHERE r.survey_id = ls.id),
    (SELECT count(*) FROM action_plans a WHERE a.company_id = c.id AND a.status IN ('APPROVED', 'COMPLETED')),
    (SELECT count(*) FROM action_plans a WHERE a.company_id = c.id AND a.status = 'PENDING_REVIEW'),
    (SELECT count(*) FROM reports rp WHERE rp.company_id = c.id AND rp.status = 'PENDING'),
    (SELECT count(*) FROM reports rp WHERE rp.company_id = c.id),
    (SELECT count(*) FROM leave_cases l
       WHERE l.company_id = c.id
         AND l.created_on >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 30)),
    (SELECT count(*) FROM kanban_tasks t
       WHERE t.company_id = c.id
         AND t.column_id IS DISTINCT FROM (
           SELECT kc.id FROM kanban_columns kc
           WHERE kc.company_id = c.id ORDER BY kc.order_index DESC LIMIT 1)),
    COALESCE(c.ai_api_keys, '{}'::jsonb) <> '{}'::jsonb
      AND EXISTS (SELECT 1 FROM jsonb_each_text(c.ai_api_keys) kv WHERE btrim(kv.value) <> '')
  FROM companies c
  LEFT JOIN LATERAL (
    SELECT s.id, s.title, s.status, s.created_at
    FROM surveys s
    WHERE s.company_id = c.id
    ORDER BY s.created_at DESC
    LIMIT 1
  ) ls ON true;
$$;

REVOKE ALL ON FUNCTION public.sentinel_company_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sentinel_company_overview() TO service_role;

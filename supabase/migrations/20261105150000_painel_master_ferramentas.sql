-- Painel Master: alertas de atenção, consumo de IA, notas internas e linha do tempo.
-- Tudo só pelo servidor (service role), depois de conferir o Master Admin.

-- 1) Consumo de IA por empresa (tokens por chamada; sem conteúdo).
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'planos')),
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_events_company_idx ON public.ai_usage_events (company_id, created_at DESC);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM anon, authenticated;

-- 2) Notas internas da equipe Sentinel sobre cada cliente.
CREATE TABLE IF NOT EXISTS public.company_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_notes_company_idx ON public.company_notes (company_id, created_at DESC);
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_notes FROM anon, authenticated;

-- 3) Pontos de atenção por empresa (só contagens e datas).
CREATE OR REPLACE FUNCTION public.sentinel_company_attention()
RETURNS TABLE (
  company_id uuid,
  reports_stale bigint,
  plans_pending_oldest_at timestamptz,
  documents_error bigint,
  tasks_overdue bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    (SELECT count(*) FROM reports rp
       WHERE rp.company_id = c.id AND rp.status = 'PENDING' AND rp.created_at < now() - interval '7 days'),
    (SELECT min(a.created_at) FROM action_plans a WHERE a.company_id = c.id AND a.status = 'PENDING_REVIEW'),
    (SELECT count(*) FROM kb_documents k
       WHERE k.company_id = c.id AND k.status = 'error' AND k.deleted_at IS NULL),
    (SELECT count(*) FROM kanban_tasks t
       WHERE t.company_id = c.id
         AND t.due_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
         AND t.column_id IS DISTINCT FROM (
           SELECT kc.id FROM kanban_columns kc
           WHERE kc.company_id = c.id ORDER BY kc.order_index DESC LIMIT 1))
  FROM companies c;
$$;
REVOKE ALL ON FUNCTION public.sentinel_company_attention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sentinel_company_attention() TO service_role;

-- 4) Consumo de IA agregado por empresa e modelo desde uma data.
CREATE OR REPLACE FUNCTION public.sentinel_ai_usage(p_since timestamptz)
RETURNS TABLE (company_id uuid, model text, calls bigint, input_tokens bigint, output_tokens bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id, u.model, count(*), sum(u.input_tokens), sum(u.output_tokens)
  FROM ai_usage_events u
  WHERE u.created_at >= p_since
  GROUP BY u.company_id, u.model;
$$;
REVOKE ALL ON FUNCTION public.sentinel_ai_usage(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sentinel_ai_usage(timestamptz) TO service_role;

-- 5) Linha do tempo da implantação (primeira vez de cada etapa).
CREATE OR REPLACE FUNCTION public.sentinel_company_timeline(p_company_id uuid)
RETURNS TABLE (
  company_created_at timestamptz,
  first_user_at timestamptz,
  first_employee_at timestamptz,
  first_document_at timestamptz,
  first_survey_at timestamptz,
  first_plan_approved_at timestamptz,
  first_task_done_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.created_at,
    (SELECT min(u.created_at) FROM users u WHERE u.company_id = c.id),
    (SELECT min(e.created_at) FROM employees e WHERE e.company_id = c.id),
    (SELECT min(k.created_at) FROM kb_documents k WHERE k.company_id = c.id),
    (SELECT min(s.created_at) FROM surveys s WHERE s.company_id = c.id AND s.status::text <> 'DRAFT'),
    (SELECT min(a.updated_at) FROM action_plans a WHERE a.company_id = c.id AND a.status IN ('APPROVED', 'COMPLETED')),
    (SELECT min(t.updated_at) FROM kanban_tasks t
       WHERE t.company_id = c.id
         AND t.column_id = (
           SELECT kc.id FROM kanban_columns kc
           WHERE kc.company_id = c.id ORDER BY kc.order_index DESC LIMIT 1))
  FROM companies c
  WHERE c.id = p_company_id;
$$;
REVOKE ALL ON FUNCTION public.sentinel_company_timeline(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sentinel_company_timeline(uuid) TO service_role;

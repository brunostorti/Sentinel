-- Kanban: responsável externo (prestadora, consultoria de SST, medicina do trabalho).
-- Regra de negócio: a tarefa tem sempre um dono interno (assigned_to, opcional como antes)
-- e pode ter, além dele, um executor externo. Externos não têm login.

CREATE TABLE IF NOT EXISTS public.external_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  organization text CHECK (organization IS NULL OR char_length(organization) <= 120),
  kind text NOT NULL DEFAULT 'outro'
    CHECK (kind IN ('prestadora', 'consultoria_sst', 'medicina_trabalho', 'outro')),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 200),
  contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_assignees_company_idx ON public.external_assignees (company_id);

ALTER TABLE public.external_assignees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.external_assignees FROM anon;

CREATE POLICY external_assignees_select ON public.external_assignees
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY external_assignees_insert ON public.external_assignees
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND get_my_role() IN ('HR', 'ADMIN'));

CREATE POLICY external_assignees_update ON public.external_assignees
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('HR', 'ADMIN'))
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY external_assignees_delete ON public.external_assignees
  FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND get_my_role() IN ('HR', 'ADMIN'));

ALTER TABLE public.kanban_tasks
  ADD COLUMN IF NOT EXISTS external_assignee_id uuid
    REFERENCES public.external_assignees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kanban_tasks_external_assignee_idx
  ON public.kanban_tasks (external_assignee_id);

-- O executor externo precisa ser da mesma empresa da tarefa (defesa no banco,
-- além da checagem na server action).
CREATE OR REPLACE FUNCTION public.kanban_tasks_external_same_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.external_assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.external_assignees ea
    WHERE ea.id = NEW.external_assignee_id AND ea.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Responsável externo não pertence a esta empresa.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.kanban_tasks_external_same_company() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS kanban_tasks_external_same_company ON public.kanban_tasks;
CREATE TRIGGER kanban_tasks_external_same_company
  BEFORE INSERT OR UPDATE OF external_assignee_id, company_id ON public.kanban_tasks
  FOR EACH ROW EXECUTE FUNCTION public.kanban_tasks_external_same_company();

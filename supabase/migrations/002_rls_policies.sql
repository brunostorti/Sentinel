-- Sentinel Platform — Row Level Security Policies
-- Spec: docs/superpowers/specs/2026-03-16-sentinel-platform-design.md §13

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE copsoq_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE copsoq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comments ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role and company
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- COPSOQ II QUESTION BANK (read-only for all authenticated)
-- ============================================

CREATE POLICY "copsoq_dimensions_read" ON copsoq_dimensions
  FOR SELECT USING (true);

CREATE POLICY "copsoq_questions_read" ON copsoq_questions
  FOR SELECT USING (true);

-- ============================================
-- COMPANIES
-- ============================================

-- Super admin sees all, others see own company
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR id = get_user_company_id()
);

CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (
  get_user_role() = 'SUPER_ADMIN'
);

CREATE POLICY "companies_update" ON companies FOR UPDATE USING (
  get_user_role() = 'SUPER_ADMIN' OR (
    id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
  )
);

-- ============================================
-- DEPARTMENTS
-- ============================================

CREATE POLICY "departments_select" ON departments FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR company_id = get_user_company_id()
);

CREATE POLICY "departments_insert" ON departments FOR INSERT WITH CHECK (
  get_user_role() = 'SUPER_ADMIN' OR (
    company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
  )
);

CREATE POLICY "departments_update" ON departments FOR UPDATE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- USERS
-- ============================================

CREATE POLICY "users_select" ON users FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR company_id = get_user_company_id()
);

CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  get_user_role() = 'SUPER_ADMIN'
);

CREATE POLICY "users_update" ON users FOR UPDATE USING (
  get_user_role() = 'SUPER_ADMIN' OR auth_id = auth.uid()
);

-- ============================================
-- SURVEYS
-- ============================================

CREATE POLICY "surveys_select" ON surveys FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR company_id = get_user_company_id()
);

CREATE POLICY "surveys_insert" ON surveys FOR INSERT WITH CHECK (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "surveys_update" ON surveys FOR UPDATE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- SURVEY PARTICIPANTS (HR/Admin only)
-- ============================================

CREATE POLICY "survey_participants_select" ON survey_participants FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_user_company_id()
  )
);

CREATE POLICY "survey_participants_insert" ON survey_participants FOR INSERT WITH CHECK (
  get_user_role() IN ('ADMIN', 'HR') AND EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_user_company_id()
  )
);

-- ============================================
-- SURVEY TOKENS (employees access via service role in API routes)
-- ============================================

CREATE POLICY "survey_tokens_select" ON survey_tokens FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR (
    get_user_role() IN ('ADMIN', 'HR') AND EXISTS (
      SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_user_company_id()
    )
  )
);

-- ============================================
-- SURVEY RESPONSES (read for dashboard, write via service role)
-- ============================================

CREATE POLICY "survey_responses_select" ON survey_responses FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_user_company_id()
  )
);

-- ============================================
-- SURVEY ANSWERS (read for dashboard via responses)
-- ============================================

CREATE POLICY "survey_answers_select" ON survey_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON s.id = sr.survey_id
    WHERE sr.id = survey_response_id
    AND (get_user_role() = 'SUPER_ADMIN' OR s.company_id = get_user_company_id())
  )
);

-- ============================================
-- SURVEY PROGRESS — HR/Admin CANNOT read this (spec §13)
-- Only service role can read/write during survey-taking
-- ============================================

-- No SELECT policy for authenticated users = HR cannot query this
-- All access via service_role in API routes

-- ============================================
-- ACTION PLANS
-- ============================================

CREATE POLICY "action_plans_select" ON action_plans FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR company_id = get_user_company_id()
);

CREATE POLICY "action_plans_update" ON action_plans FOR UPDATE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- KANBAN
-- ============================================

CREATE POLICY "kanban_columns_select" ON kanban_columns FOR SELECT USING (
  get_user_role() = 'SUPER_ADMIN' OR company_id = get_user_company_id()
);

CREATE POLICY "kanban_columns_insert" ON kanban_columns FOR INSERT WITH CHECK (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_columns_update" ON kanban_columns FOR UPDATE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_columns_delete" ON kanban_columns FOR DELETE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_tasks_select" ON kanban_tasks FOR SELECT USING (
  company_id = get_user_company_id()
);

CREATE POLICY "kanban_tasks_insert" ON kanban_tasks FOR INSERT WITH CHECK (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_tasks_update" ON kanban_tasks FOR UPDATE USING (
  company_id = get_user_company_id() AND (
    get_user_role() IN ('ADMIN', 'HR') OR assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);

CREATE POLICY "kanban_tasks_delete" ON kanban_tasks FOR DELETE USING (
  company_id = get_user_company_id() AND get_user_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_comments_select" ON kanban_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM kanban_tasks t WHERE t.id = task_id AND t.company_id = get_user_company_id()
  )
);

CREATE POLICY "kanban_comments_insert" ON kanban_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM kanban_tasks t WHERE t.id = task_id AND t.company_id = get_user_company_id()
  )
);

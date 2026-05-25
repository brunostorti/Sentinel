-- Fix: infinite recursion in RLS policies
-- Root cause: get_user_role() / get_user_company_id() queried `users` table
-- which had RLS policies calling those same functions → infinite loop.
-- Also: `participant_surveys_select` on surveys referenced survey_participants
-- which referenced surveys → circular dependency.
--
-- Solution:
-- 1. Drop all existing policies + old helper functions
-- 2. Create new helpers with SET row_security = off (bypasses RLS inside function)
-- 3. Recreate all policies using safe helper functions
-- 4. Drop rogue `participant_surveys_select` policy

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "copsoq_dimensions_read" ON copsoq_dimensions;
DROP POLICY IF EXISTS "copsoq_questions_read" ON copsoq_questions;

DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;

DROP POLICY IF EXISTS "departments_select" ON departments;
DROP POLICY IF EXISTS "departments_insert" ON departments;
DROP POLICY IF EXISTS "departments_update" ON departments;

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_self_select" ON users;
DROP POLICY IF EXISTS "users_company_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

DROP POLICY IF EXISTS "surveys_select" ON surveys;
DROP POLICY IF EXISTS "surveys_insert" ON surveys;
DROP POLICY IF EXISTS "surveys_update" ON surveys;
DROP POLICY IF EXISTS "participant_surveys_select" ON surveys;

DROP POLICY IF EXISTS "survey_participants_select" ON survey_participants;
DROP POLICY IF EXISTS "survey_participants_insert" ON survey_participants;

DROP POLICY IF EXISTS "survey_tokens_select" ON survey_tokens;

DROP POLICY IF EXISTS "survey_responses_select" ON survey_responses;

DROP POLICY IF EXISTS "survey_answers_select" ON survey_answers;

DROP POLICY IF EXISTS "action_plans_select" ON action_plans;
DROP POLICY IF EXISTS "action_plans_update" ON action_plans;

DROP POLICY IF EXISTS "kanban_columns_select" ON kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_insert" ON kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_update" ON kanban_columns;
DROP POLICY IF EXISTS "kanban_columns_delete" ON kanban_columns;

DROP POLICY IF EXISTS "kanban_tasks_select" ON kanban_tasks;
DROP POLICY IF EXISTS "kanban_tasks_insert" ON kanban_tasks;
DROP POLICY IF EXISTS "kanban_tasks_update" ON kanban_tasks;
DROP POLICY IF EXISTS "kanban_tasks_delete" ON kanban_tasks;

DROP POLICY IF EXISTS "kanban_comments_select" ON kanban_comments;
DROP POLICY IF EXISTS "kanban_comments_insert" ON kanban_comments;

-- ============================================
-- DROP OLD HELPER FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_company_id();

-- ============================================
-- NEW HELPER FUNCTIONS (SET row_security = off bypasses RLS)
-- ============================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role::text FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off STABLE;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off STABLE;

-- ============================================
-- USERS
-- ============================================

CREATE POLICY "users_select" ON users FOR SELECT USING (
  auth_id = auth.uid()
  OR get_my_role() = 'SUPER_ADMIN'
  OR company_id = get_my_company_id()
);

CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN'
);

CREATE POLICY "users_update" ON users FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN'
  OR auth_id = auth.uid()
);

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

CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR id = get_my_company_id()
);

CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN'
);

CREATE POLICY "companies_update" ON companies FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);

-- ============================================
-- DEPARTMENTS
-- ============================================

CREATE POLICY "departments_select" ON departments FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "departments_insert" ON departments FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);

CREATE POLICY "departments_update" ON departments FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- SURVEYS
-- ============================================

CREATE POLICY "surveys_select" ON surveys FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "surveys_insert" ON surveys FOR INSERT WITH CHECK (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "surveys_update" ON surveys FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- SURVEY PARTICIPANTS
-- ============================================

-- Employee self-select (kept from existing)
-- CREATE POLICY "participant_self_select" ON survey_participants FOR SELECT USING (
--   email = (auth.jwt() ->> 'email')
-- );

CREATE POLICY "survey_participants_select" ON survey_participants FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

CREATE POLICY "survey_participants_insert" ON survey_participants FOR INSERT WITH CHECK (
  get_my_role() IN ('ADMIN', 'HR') AND EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

-- ============================================
-- SURVEY TOKENS
-- ============================================

CREATE POLICY "survey_tokens_select" ON survey_tokens FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    get_my_role() IN ('ADMIN', 'HR') AND EXISTS (
      SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
    )
  )
);

-- ============================================
-- SURVEY RESPONSES
-- ============================================

CREATE POLICY "survey_responses_select" ON survey_responses FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

-- ============================================
-- SURVEY ANSWERS
-- ============================================

CREATE POLICY "survey_answers_select" ON survey_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON s.id = sr.survey_id
    WHERE sr.id = survey_response_id
    AND (get_my_role() = 'SUPER_ADMIN' OR s.company_id = get_my_company_id())
  )
);

-- ============================================
-- ACTION PLANS
-- ============================================

CREATE POLICY "action_plans_select" ON action_plans FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "action_plans_update" ON action_plans FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- KANBAN COLUMNS
-- ============================================

CREATE POLICY "kanban_columns_select" ON kanban_columns FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "kanban_columns_insert" ON kanban_columns FOR INSERT WITH CHECK (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_columns_update" ON kanban_columns FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_columns_delete" ON kanban_columns FOR DELETE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- KANBAN TASKS
-- ============================================

CREATE POLICY "kanban_tasks_select" ON kanban_tasks FOR SELECT USING (
  company_id = get_my_company_id()
);

CREATE POLICY "kanban_tasks_insert" ON kanban_tasks FOR INSERT WITH CHECK (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "kanban_tasks_update" ON kanban_tasks FOR UPDATE USING (
  company_id = get_my_company_id() AND (
    get_my_role() IN ('ADMIN', 'HR')
    OR assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);

CREATE POLICY "kanban_tasks_delete" ON kanban_tasks FOR DELETE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- ============================================
-- KANBAN COMMENTS
-- ============================================

CREATE POLICY "kanban_comments_select" ON kanban_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM kanban_tasks t WHERE t.id = task_id AND t.company_id = get_my_company_id()
  )
);

CREATE POLICY "kanban_comments_insert" ON kanban_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM kanban_tasks t WHERE t.id = task_id AND t.company_id = get_my_company_id()
  )
);

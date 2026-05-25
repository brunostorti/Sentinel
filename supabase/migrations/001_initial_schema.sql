-- Sentinel Platform — Initial Schema
-- Spec: docs/superpowers/specs/2026-03-16-sentinel-platform-design.md §4

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER');
CREATE TYPE survey_version AS ENUM ('SHORT', 'MEDIUM', 'LONG');
CREATE TYPE survey_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE scoring_direction AS ENUM ('HIGH_IS_RISK', 'HIGH_IS_FAVORABLE');
CREATE TYPE risk_level AS ENUM ('RED', 'YELLOW');
CREATE TYPE action_plan_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- ============================================
-- CORE ENTITIES
-- ============================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- links to Supabase auth.users
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SUPER_ADMIN has no company_id
-- All other roles require company_id
ALTER TABLE users ADD CONSTRAINT users_company_check
  CHECK (
    (role = 'SUPER_ADMIN' AND company_id IS NULL) OR
    (role != 'SUPER_ADMIN' AND company_id IS NOT NULL)
  );

-- ============================================
-- COPSOQ II QUESTION BANK
-- ============================================

CREATE TABLE copsoq_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  scoring_direction scoring_direction NOT NULL,
  short_version BOOLEAN NOT NULL DEFAULT false,
  medium_version BOOLEAN NOT NULL DEFAULT false,
  long_version BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE copsoq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id UUID NOT NULL REFERENCES copsoq_dimensions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_inverted BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL,
  short_version BOOLEAN NOT NULL DEFAULT false,
  medium_version BOOLEAN NOT NULL DEFAULT false,
  long_version BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- SURVEY ADMINISTRATION
-- ============================================

CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version survey_version NOT NULL,
  status survey_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE survey_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  has_accessed BOOLEAN NOT NULL DEFAULT false,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, email)
);

CREATE TABLE survey_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false
  -- NO participant_id — anonymity critical (spec §4, §13)
);

-- ============================================
-- ANONYMITY-PRESERVING RESPONSES
-- ============================================

CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO email, session ID, IP, or token reference (spec §4)
);

CREATE TABLE survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES copsoq_questions(id),
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5)
);

CREATE TABLE survey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  last_question_index INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}', -- AES-256-GCM encrypted at app layer
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Deleted on submission (spec §4)
);

-- ============================================
-- AI ACTION PLANS
-- ============================================

CREATE TABLE action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES copsoq_dimensions(id),
  risk_level risk_level NOT NULL,
  ai_recommendation JSONB NOT NULL, -- {title, rationale, suggested_role, estimated_impact}
  status action_plan_status NOT NULL DEFAULT 'PENDING_REVIEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- KANBAN BOARD
-- ============================================

CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id),
  title TEXT NOT NULL,
  description TEXT,
  dimension_id UUID REFERENCES copsoq_dimensions(id),
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  source_survey_id UUID REFERENCES surveys(id),
  action_plan_id UUID REFERENCES action_plans(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kanban_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_auth ON users(auth_id);
CREATE INDEX idx_surveys_company ON surveys(company_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_survey_participants_survey ON survey_participants(survey_id);
CREATE INDEX idx_survey_participants_email ON survey_participants(email);
CREATE INDEX idx_survey_tokens_survey ON survey_tokens(survey_id);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_department ON survey_responses(department_id);
CREATE INDEX idx_survey_answers_response ON survey_answers(survey_response_id);
CREATE INDEX idx_survey_progress_token ON survey_progress(token_hash);
CREATE INDEX idx_action_plans_survey ON action_plans(survey_id);
CREATE INDEX idx_kanban_tasks_company ON kanban_tasks(company_id);
CREATE INDEX idx_kanban_tasks_column ON kanban_tasks(column_id);
CREATE INDEX idx_kanban_tasks_assigned ON kanban_tasks(assigned_to);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_surveys_updated BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_survey_participants_updated BEFORE UPDATE ON survey_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_survey_progress_updated BEFORE UPDATE ON survey_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_action_plans_updated BEFORE UPDATE ON action_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_kanban_columns_updated BEFORE UPDATE ON kanban_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_kanban_tasks_updated BEFORE UPDATE ON kanban_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

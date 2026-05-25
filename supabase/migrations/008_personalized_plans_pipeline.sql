-- ============================================
-- Migration 008: Pipeline de Planos Personalizados
-- Spec: docs/superpowers/specs/2026-05-20-pipeline-de-planos-personalizados-design.md
-- ============================================

-- ═══════════════════════════════════════════
-- 0. Limpeza de planos antigos (autorizado pelo usuário — app em testes, sem casos reais)
-- ═══════════════════════════════════════════

DELETE FROM kanban_comments WHERE task_id IN (
  SELECT id FROM kanban_tasks WHERE action_plan_id IS NOT NULL
);
DELETE FROM kanban_tasks WHERE action_plan_id IS NOT NULL;
DELETE FROM action_plans;

-- ═══════════════════════════════════════════
-- 1. action_plan_status: adicionar AI_GENERATION_FAILED
-- ═══════════════════════════════════════════

ALTER TYPE action_plan_status ADD VALUE IF NOT EXISTS 'AI_GENERATION_FAILED';

-- ═══════════════════════════════════════════
-- 2. surveys: colunas de orquestração do pipeline IA
-- ═══════════════════════════════════════════

ALTER TABLE surveys
  ADD COLUMN ai_generation_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (ai_generation_status IN ('not_started', 'queued', 'running', 'completed', 'failed', 'cancelled')),
  ADD COLUMN ai_generation_run_id UUID,
  ADD COLUMN ai_generation_started_at TIMESTAMPTZ,
  ADD COLUMN ai_generation_finished_at TIMESTAMPTZ,
  ADD COLUMN ai_generation_error TEXT;

-- ═══════════════════════════════════════════
-- 3. company_profiles  (1:1 com companies)
-- ═══════════════════════════════════════════

CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Orçamento
  annual_budget_brl NUMERIC,
  budget_per_employee_year_brl NUMERIC,
  budget_horizon TEXT CHECK (budget_horizon IN ('ano_corrente', '12_meses', 'bienio') OR budget_horizon IS NULL),
  budget_flexibility TEXT CHECK (budget_flexibility IN ('rigid', 'flexible', 'unlocked_for_critical') OR budget_flexibility IS NULL),
  existing_wellbeing_spend_brl NUMERIC,

  -- Estrutura/maturidade do RH
  hr_team_size INTEGER,
  has_dedicated_hr BOOLEAN,
  has_internal_training BOOLEAN,
  has_occupational_health BOOLEAN,
  has_compliance_officer BOOLEAN,
  decision_speed TEXT CHECK (decision_speed IN ('fast', 'normal', 'slow') OR decision_speed IS NULL),
  culture_type TEXT CHECK (culture_type IN ('startup', 'family', 'corporate', 'public', 'multinational', 'other') OR culture_type IS NULL),
  declared_values TEXT[],

  -- Colaboradores + região
  workforce_composition JSONB,
  predominant_role_type TEXT CHECK (predominant_role_type IN ('office', 'industrial', 'field', 'mixed', 'remote') OR predominant_role_type IS NULL),
  regions TEXT[],
  has_remote BOOLEAN,
  has_shift_workers BOOLEAN,
  has_unionized_workers BOOLEAN,

  -- Restrições/preferências
  constraints TEXT[],
  preferred_modalities TEXT[],
  avoid_modalities TEXT[],

  -- Flags "HR já revisou este campo" (mesmo se ficou vazio)
  regions_reviewed_at TIMESTAMPTZ,
  constraints_reviewed_at TIMESTAMPTZ,
  preferred_modalities_reviewed_at TIMESTAMPTZ,
  workforce_composition_reviewed_at TIMESTAMPTZ,

  setup_completeness NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_profiles_completeness ON company_profiles(setup_completeness);

-- Trigger: cria company_profile vazio quando company é criada
CREATE OR REPLACE FUNCTION create_company_profile_on_company_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO company_profiles (company_id) VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_profile_autocreate
AFTER INSERT ON companies
FOR EACH ROW EXECUTE FUNCTION create_company_profile_on_company_insert();

-- Backfill: cria profiles vazios para empresas existentes
INSERT INTO company_profiles (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- ═══════════════════════════════════════════
-- 4. company_actions_taken  (histórico de ações)
-- ═══════════════════════════════════════════

CREATE TABLE company_actions_taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  universal_category_id UUID REFERENCES universal_categories(id),
  year_started INTEGER,
  year_ended INTEGER,
  outcome TEXT CHECK (outcome IN ('successful', 'partial', 'unsuccessful', 'abandoned', 'in_progress', 'unknown') OR outcome IS NULL),
  outcome_notes TEXT,
  source TEXT NOT NULL CHECK (source IN ('manual_entry', 'sentinel_kanban', 'sentinel_outcome')),
  linked_action_plan_id UUID REFERENCES action_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_actions_company_category ON company_actions_taken(company_id, universal_category_id);
CREATE INDEX idx_company_actions_company_outcome ON company_actions_taken(company_id, outcome);

-- ═══════════════════════════════════════════
-- 5. chat_threads
-- ═══════════════════════════════════════════

CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'company')),
  resource_id UUID,                          -- action_plans.id se kind='plan'
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  summary TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_threads_company_kind ON chat_threads(company_id, kind, resource_id);
CREATE INDEX idx_chat_threads_last_message ON chat_threads(company_id, last_message_at DESC);

-- ═══════════════════════════════════════════
-- 6. chat_messages
-- ═══════════════════════════════════════════

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_thread_time ON chat_messages(thread_id, created_at);

-- ═══════════════════════════════════════════
-- 7. action_outcomes  (loop de eficácia)
-- Sobrevive a DELETE do plano (ON DELETE SET NULL) para preservar aprendizado
-- ═══════════════════════════════════════════

CREATE TABLE action_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_plan_id UUID REFERENCES action_plans(id) ON DELETE SET NULL,

  -- Identificação da intervenção independente do FK do plano
  intervention_id TEXT NOT NULL,
  universal_category_id UUID REFERENCES universal_categories(id),

  dimension_id UUID NOT NULL REFERENCES questionnaire_scales(id),

  survey_id_before UUID NOT NULL REFERENCES surveys(id),
  score_before NUMERIC NOT NULL,

  survey_id_after UUID REFERENCES surveys(id),
  score_after NUMERIC,
  delta NUMERIC,
  delta_computed_at TIMESTAMPTZ,

  outcome_status TEXT CHECK (outcome_status IN ('pending', 'computed', 'unmeasurable', 'anonymity_blocked') OR outcome_status IS NULL),

  hr_attribution TEXT CHECK (hr_attribution IN ('high', 'medium', 'low', 'none', 'cannot_tell') OR hr_attribution IS NULL),
  hr_notes TEXT,
  attribution_collected_at TIMESTAMPTZ,
  attribution_user_id UUID REFERENCES users(id),
  attribution_skip_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicidade: um outcome por (plano vivo, dimensão); planos deletados (NULL) podem coexistir
CREATE UNIQUE INDEX action_outcomes_alive_unique
  ON action_outcomes(action_plan_id, dimension_id)
  WHERE action_plan_id IS NOT NULL;

CREATE INDEX idx_outcomes_company_intervention ON action_outcomes(company_id, intervention_id);
CREATE INDEX idx_outcomes_company_category ON action_outcomes(company_id, universal_category_id);
CREATE INDEX idx_outcomes_pending_after ON action_outcomes(survey_id_after) WHERE survey_id_after IS NULL;
CREATE INDEX idx_outcomes_pending_attribution ON action_outcomes(company_id) WHERE hr_attribution IS NULL AND delta_computed_at IS NOT NULL;

-- ═══════════════════════════════════════════
-- 8. profile_events  (timeline de enriquecimento)
-- ═══════════════════════════════════════════

CREATE TABLE profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  source_context TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low') OR confidence IS NULL),
  confirmed_by_user_id UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_events_pending ON profile_events(company_id, created_at DESC)
  WHERE confirmed_at IS NULL AND rejected_at IS NULL;
CREATE INDEX idx_profile_events_company_field ON profile_events(company_id, field_path);

-- ═══════════════════════════════════════════
-- 9. updated_at triggers para tabelas com updated_at
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_profiles_touch_updated_at
BEFORE UPDATE ON company_profiles
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER action_outcomes_touch_updated_at
BEFORE UPDATE ON action_outcomes
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ═══════════════════════════════════════════
-- 10. RLS — Row Level Security
-- ═══════════════════════════════════════════

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_actions_taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_events ENABLE ROW LEVEL SECURITY;

-- company_profiles
CREATE POLICY "company_profiles_select" ON company_profiles FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);
CREATE POLICY "company_profiles_update" ON company_profiles FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);
CREATE POLICY "company_profiles_insert" ON company_profiles FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN'
);

-- company_actions_taken
CREATE POLICY "company_actions_select" ON company_actions_taken FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);
CREATE POLICY "company_actions_insert" ON company_actions_taken FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);
CREATE POLICY "company_actions_update" ON company_actions_taken FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);
CREATE POLICY "company_actions_delete" ON company_actions_taken FOR DELETE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);

-- chat_threads
CREATE POLICY "chat_threads_select" ON chat_threads FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);
CREATE POLICY "chat_threads_insert" ON chat_threads FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER')
  )
);
CREATE POLICY "chat_threads_update" ON chat_threads FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER')
  )
);

-- chat_messages (company_id indireto via thread)
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_threads t
    WHERE t.id = chat_messages.thread_id
      AND (get_my_role() = 'SUPER_ADMIN' OR t.company_id = get_my_company_id())
  )
);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_threads t
    WHERE t.id = chat_messages.thread_id
      AND (get_my_role() = 'SUPER_ADMIN' OR (
        t.company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR', 'MANAGER')
      ))
  )
);

-- action_outcomes (atribuição: ADMIN/HR; leitura: todos da empresa)
CREATE POLICY "action_outcomes_select" ON action_outcomes FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);
CREATE POLICY "action_outcomes_insert" ON action_outcomes FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN'
);
CREATE POLICY "action_outcomes_update" ON action_outcomes FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);

-- profile_events (ADMIN/HR confirma/rejeita; MANAGER read-only)
CREATE POLICY "profile_events_select" ON profile_events FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);
CREATE POLICY "profile_events_insert" ON profile_events FOR INSERT WITH CHECK (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);
CREATE POLICY "profile_events_update" ON profile_events FOR UPDATE USING (
  get_my_role() = 'SUPER_ADMIN' OR (
    company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
  )
);

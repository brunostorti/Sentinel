-- ============================================
-- Migration 006: Multi-Instrument Architecture
-- Supports COPSOQ II, COPSOQ III, JSS, OLBI
-- ============================================

-- ═══════════════════════════════════════════
-- 1. NEW TABLES
-- ═══════════════════════════════════════════

-- Universal categories (meta-categories across all instruments)
CREATE TABLE universal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT
);

-- Questionnaire instruments
CREATE TABLE questionnaire_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version_label TEXT,
  source TEXT,
  total_questions INTEGER,
  estimated_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Response format definitions
CREATE TABLE response_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  options JSONB NOT NULL
);

-- ═══════════════════════════════════════════
-- 2. SEED: Universal categories
-- ═══════════════════════════════════════════

INSERT INTO universal_categories (code, name, description, display_order, icon) VALUES
  ('workload',      'Carga de Trabalho',           'Volume, ritmo e demandas cognitivas/emocionais do trabalho',       1,  'work'),
  ('leadership',    'Liderança e Supervisão',       'Qualidade da chefia e apoio do supervisor direto',                 2,  'supervisor_account'),
  ('social',        'Relações Sociais',             'Relacionamento com colegas, comunidade e confiança entre pares',   3,  'group'),
  ('recognition',   'Reconhecimento e Recompensas', 'Salário, benefícios, reconhecimento e valorização profissional',   4,  'emoji_events'),
  ('autonomy',      'Autonomia e Desenvolvimento',  'Influência nas decisões, crescimento profissional e controle',     5,  'trending_up'),
  ('meaning',       'Significado e Engajamento',    'Propósito no trabalho, compromisso e motivação',                   6,  'lightbulb'),
  ('burnout',       'Burnout e Saúde',              'Exaustão, stress, saúde geral e qualidade do sono',                7,  'health_and_safety'),
  ('communication', 'Comunicação e Transparência',  'Previsibilidade, clareza de papel e fluxo de informação',          8,  'forum'),
  ('security',      'Segurança e Estabilidade',     'Insegurança laboral, perspectivas de promoção e condições',        9,  'shield'),
  ('offensive',     'Comportamentos Ofensivos',     'Assédio, bullying, violência e discriminação no ambiente',          10, 'warning');

-- ═══════════════════════════════════════════
-- 3. SEED: Response formats
-- ═══════════════════════════════════════════

INSERT INTO response_formats (code, name, options) VALUES
  ('likert_frequency_5', 'Frequência (5 pontos)',
   '[{"label":"Nunca/Quase nunca","value":0},{"label":"Raramente","value":25},{"label":"Às vezes","value":50},{"label":"Frequentemente","value":75},{"label":"Sempre","value":100}]'),

  ('likert_extent_5', 'Extensão (5 pontos)',
   '[{"label":"Nada/Quase nada","value":0},{"label":"Um pouco","value":25},{"label":"Moderadamente","value":50},{"label":"Muito","value":75},{"label":"Extremamente","value":100}]'),

  ('likert_agree_6', 'Concordância (6 pontos)',
   '[{"label":"Discordo muito","value":0},{"label":"Discordo moderadamente","value":20},{"label":"Discordo pouco","value":40},{"label":"Concordo pouco","value":60},{"label":"Concordo moderadamente","value":80},{"label":"Concordo muito","value":100}]'),

  ('likert_agree_4', 'Concordância (4 pontos)',
   '[{"label":"Discordo totalmente","value":0},{"label":"Discordo","value":33},{"label":"Concordo","value":67},{"label":"Concordo totalmente","value":100}]'),

  ('copsoq3_satisfaction', 'Satisfação (5 pontos)',
   '[{"label":"Muito insatisfeito(a)","value":0},{"label":"Insatisfeito(a)","value":25},{"label":"Neutro","value":50},{"label":"Satisfeito(a)","value":75},{"label":"Muito satisfeito(a)","value":100}]'),

  ('copsoq3_health', 'Saúde geral (5 pontos)',
   '[{"label":"Ruim","value":0},{"label":"Razoável","value":25},{"label":"Boa","value":50},{"label":"Muito boa","value":75},{"label":"Excelente","value":100}]'),

  ('copsoq3_time_frequency', 'Frequência temporal (5 pontos)',
   '[{"label":"Nunca","value":0},{"label":"Pequena parte do tempo","value":25},{"label":"Parte do tempo","value":50},{"label":"Grande parte do tempo","value":75},{"label":"Todo o tempo","value":100}]'),

  ('copsoq3_engagement', 'Engajamento (4 pontos)',
   '[{"label":"Não se aplica","value":0},{"label":"Aplica-se um pouco","value":33},{"label":"Aplica-se bastante","value":67},{"label":"Aplica-se perfeitamente","value":100}]');

-- ═══════════════════════════════════════════
-- 4. RENAME EXISTING TABLES
-- ═══════════════════════════════════════════

ALTER TABLE copsoq_dimensions RENAME TO questionnaire_scales;
ALTER TABLE copsoq_questions RENAME TO questionnaire_items;

-- ═══════════════════════════════════════════
-- 5. ADD COLUMNS TO RENAMED TABLES
-- ═══════════════════════════════════════════

-- questionnaire_scales: link to instrument + universal category
ALTER TABLE questionnaire_scales
  ADD COLUMN instrument_id UUID REFERENCES questionnaire_instruments(id),
  ADD COLUMN universal_category_id UUID REFERENCES universal_categories(id),
  ADD COLUMN display_order INTEGER DEFAULT 0;

-- questionnaire_items: response format + level
ALTER TABLE questionnaire_items
  ADD COLUMN instrument_id UUID REFERENCES questionnaire_instruments(id),
  ADD COLUMN response_format_id UUID REFERENCES response_formats(id),
  ADD COLUMN item_level TEXT;

-- ═══════════════════════════════════════════
-- 6. ADD COLUMNS TO EXISTING TABLES
-- ═══════════════════════════════════════════

-- surveys: which instrument was used
ALTER TABLE surveys
  ADD COLUMN instrument_id UUID REFERENCES questionnaire_instruments(id);

-- Make survey version nullable (JSS/OLBI don't have Short/Medium/Long)
ALTER TABLE surveys ALTER COLUMN version DROP NOT NULL;

-- companies: context for AI
ALTER TABLE companies
  ADD COLUMN employee_count INTEGER,
  ADD COLUMN work_regime TEXT CHECK (work_regime IN ('presencial', 'remoto', 'hibrido'));

-- action_plans: enriched AI fields + universal category
ALTER TABLE action_plans
  ADD COLUMN priority TEXT CHECK (priority IN ('alta', 'media', 'baixa')),
  ADD COLUMN effort TEXT CHECK (effort IN ('baixo', 'medio', 'alto')),
  ADD COLUMN timeframe TEXT CHECK (timeframe IN ('curto_prazo', 'medio_prazo', 'longo_prazo')),
  ADD COLUMN target_department TEXT DEFAULT 'all',
  ADD COLUMN universal_category_id UUID REFERENCES universal_categories(id);

-- ═══════════════════════════════════════════
-- 7. UPDATE survey_answers SCORE RANGE (1-5 → 0-100)
-- ═══════════════════════════════════════════

-- Drop old CHECK constraint
ALTER TABLE survey_answers DROP CONSTRAINT IF EXISTS survey_answers_score_check;

-- Change column type
ALTER TABLE survey_answers ALTER COLUMN score TYPE INTEGER;

-- Convert existing COPSOQ II data from 1-5 to 0-100
UPDATE survey_answers SET score = (score - 1) * 25 WHERE score BETWEEN 1 AND 5;

-- Add new CHECK constraint (0-100)
ALTER TABLE survey_answers ADD CONSTRAINT survey_answers_score_check CHECK (score >= 0 AND score <= 100);

-- ═══════════════════════════════════════════
-- 8. SEED: COPSOQ II instrument + backfill
-- ═══════════════════════════════════════════

INSERT INTO questionnaire_instruments (code, name, description, version_label, source, total_questions, estimated_minutes)
VALUES (
  'copsoq_ii',
  'COPSOQ II — Versão Portuguesa',
  'Copenhagen Psychosocial Questionnaire II. Validação portuguesa (N=4.162 trabalhadores). Avalia fatores psicossociais no trabalho em 35 dimensões.',
  '2013',
  'Universidade de Coimbra / COPSOQ International Network',
  119,
  25
);

-- Backfill existing dimensions/questions with COPSOQ II instrument_id
UPDATE questionnaire_scales
  SET instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii')
  WHERE instrument_id IS NULL;

UPDATE questionnaire_items
  SET instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii')
  WHERE instrument_id IS NULL;

-- Backfill existing surveys
UPDATE surveys
  SET instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii')
  WHERE instrument_id IS NULL;

-- Backfill COPSOQ II universal categories based on category field
UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'workload')
  WHERE category IN ('Exigências no Trabalho') AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'autonomy')
  WHERE category IN ('Organização do Trabalho e Conteúdo') AND name IN ('Influência no trabalho', 'Possibilidades de desenvolvimento')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'meaning')
  WHERE category IN ('Organização do Trabalho e Conteúdo') AND name IN ('Significado do trabalho', 'Compromisso face ao local de trabalho')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'leadership')
  WHERE name IN ('Qualidade da liderança', 'Apoio social de superiores')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'social')
  WHERE name IN ('Apoio social de colegas', 'Comunidade social no trabalho', 'Confiança horizontal')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'recognition')
  WHERE name IN ('Recompensas/Reconhecimento')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'communication')
  WHERE name IN ('Previsibilidade', 'Transparência do papel laboral', 'Conflitos laborais')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'security')
  WHERE name IN ('Insegurança laboral')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'burnout')
  WHERE category IN ('Saúde e Bem-Estar', 'Personalidade')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'offensive')
  WHERE category IN ('Comportamentos Ofensivos')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

-- Remaining scales in "Relações Sociais e Liderança" not yet categorized
UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'communication')
  WHERE universal_category_id IS NULL
  AND category = 'Relações Sociais e Liderança'
  AND name IN ('Previsibilidade', 'Conflitos de papéis laborais')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'recognition')
  WHERE universal_category_id IS NULL
  AND category = 'Relações Sociais e Liderança'
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

-- Work-life balance falls under burnout/health
UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'burnout')
  WHERE category = 'Interface Trabalho-Indivíduo'
  AND name IN ('Conflito trabalho-família', 'Satisfação no trabalho')
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'security')
  WHERE category = 'Interface Trabalho-Indivíduo'
  AND universal_category_id IS NULL
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

-- Trust dimensions → communication
UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'communication')
  WHERE category = 'Valores no Local de Trabalho'
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

-- Catch-all: any remaining NULL universal_category_id for COPSOQ II → workload
UPDATE questionnaire_scales SET universal_category_id = (SELECT id FROM universal_categories WHERE code = 'workload')
  WHERE universal_category_id IS NULL
  AND instrument_id = (SELECT id FROM questionnaire_instruments WHERE code = 'copsoq_ii');

-- ═══════════════════════════════════════════
-- 9. SET NOT NULL after backfill
-- ═══════════════════════════════════════════

ALTER TABLE questionnaire_scales ALTER COLUMN instrument_id SET NOT NULL;
ALTER TABLE questionnaire_items ALTER COLUMN instrument_id SET NOT NULL;

-- ═══════════════════════════════════════════
-- 10. NEW INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX idx_scales_instrument ON questionnaire_scales(instrument_id);
CREATE INDEX idx_scales_category ON questionnaire_scales(universal_category_id);
CREATE INDEX idx_items_instrument ON questionnaire_items(instrument_id);
CREATE INDEX idx_items_scale ON questionnaire_items(dimension_id);
CREATE INDEX idx_surveys_instrument ON surveys(instrument_id);
CREATE INDEX idx_action_plans_category ON action_plans(universal_category_id);

-- ═══════════════════════════════════════════
-- 11. RLS POLICIES for new tables
-- ═══════════════════════════════════════════

ALTER TABLE universal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_formats ENABLE ROW LEVEL SECURITY;

-- Public read access (these are reference data)
CREATE POLICY "universal_categories_read" ON universal_categories FOR SELECT USING (true);
CREATE POLICY "instruments_read" ON questionnaire_instruments FOR SELECT USING (true);
CREATE POLICY "response_formats_read" ON response_formats FOR SELECT USING (true);

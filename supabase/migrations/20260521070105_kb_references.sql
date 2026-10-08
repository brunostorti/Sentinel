-- [Restaurada em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260521070105
-- Nome no banco: 010_kb_references
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 21/05/2026, recuperado de
-- schema_migrations.statements (a versão anterior deste arquivo só diferia em espaços).
-- ===== SQL original (não editar) =====
-- Migration 010: Tabelas de referências científicas
-- Spec: docs/superpowers/specs/2026-05-20-pipeline-de-planos-personalizados-design.md
-- (Adendo: base de evidências curada para fundamentar planos perante banca)

-- Tabela mãe: referências bibliográficas usadas pela KB
CREATE TABLE kb_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_key TEXT UNIQUE NOT NULL,
  authors TEXT NOT NULL,
  year INT NOT NULL,
  title TEXT NOT NULL,
  publisher_or_journal TEXT,
  doi TEXT,
  url TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'guideline','systematic_review','meta_analysis','rct',
    'observational','government_data','theoretical','validation_study','book'
  )),
  certainty_level TEXT CHECK (certainty_level IN ('very_low','low','moderate','high') OR certainty_level IS NULL),
  region TEXT CHECK (region IN ('global','brazil','europe','usa','latin_america') OR region IS NULL),
  abnt_citation TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kb_refs_key ON kb_references(citation_key);

-- Ligação n:n entre intervenções (slug em catalog.ts) e referências
CREATE TABLE kb_intervention_references (
  intervention_id TEXT NOT NULL,        -- slug do catalog.ts ex: 'burnout.teleterapia-b2b'
  reference_id UUID NOT NULL REFERENCES kb_references(id) ON DELETE CASCADE,
  relevance TEXT NOT NULL CHECK (relevance IN ('primary','secondary','context')),
  specific_claim TEXT,                  -- "Reducao de 30% no absenteismo (95%CI 18-42)"
  PRIMARY KEY (intervention_id, reference_id)
);
CREATE INDEX idx_kb_iref_intervention ON kb_intervention_references(intervention_id);

-- RLS: leitura publica para usuarios autenticados (qualquer empresa pode ver KB)
ALTER TABLE kb_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_intervention_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_references_read" ON kb_references FOR SELECT USING (true);
CREATE POLICY "kb_references_super_admin_write" ON kb_references FOR ALL USING (
  get_my_role() = 'SUPER_ADMIN'
);

CREATE POLICY "kb_iref_read" ON kb_intervention_references FOR SELECT USING (true);
CREATE POLICY "kb_iref_super_admin_write" ON kb_intervention_references FOR ALL USING (
  get_my_role() = 'SUPER_ADMIN'
);

-- Migration 010: Tabelas de referências científicas
-- Adendo da spec 2026-05-20-pipeline-de-planos-personalizados-design.md
-- Base de evidências curada para fundamentar planos.

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

CREATE TABLE kb_intervention_references (
  intervention_id TEXT NOT NULL,
  reference_id UUID NOT NULL REFERENCES kb_references(id) ON DELETE CASCADE,
  relevance TEXT NOT NULL CHECK (relevance IN ('primary','secondary','context')),
  specific_claim TEXT,
  PRIMARY KEY (intervention_id, reference_id)
);
CREATE INDEX idx_kb_iref_intervention ON kb_intervention_references(intervention_id);

ALTER TABLE kb_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_intervention_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_references_read" ON kb_references FOR SELECT USING (true);
CREATE POLICY "kb_references_super_admin_write" ON kb_references FOR ALL USING (get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "kb_iref_read" ON kb_intervention_references FOR SELECT USING (true);
CREATE POLICY "kb_iref_super_admin_write" ON kb_intervention_references FOR ALL USING (get_my_role() = 'SUPER_ADMIN');

-- [Restaurada em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260521192108
-- Nome no banco: 013_lgpd_consent
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 21/05/2026, recuperado de
-- schema_migrations.statements. A versão anterior deste arquivo diferia no texto do
-- COMMENT de lgpd_consent_version; o texto abaixo é o que está em produção.
-- ===== SQL original (não editar) =====
-- Migration 013: Consentimento LGPD por usuario
-- Art. 7, I LGPD: consentimento como base legal para tratamento.
-- Art. 8: consentimento deve ser inequivoco, especifico e demonstravel.

ALTER TABLE users
  ADD COLUMN lgpd_consent_at TIMESTAMPTZ,
  ADD COLUMN lgpd_consent_version TEXT;  -- versao do termo aceito (futuro)

-- Index para queries de "quem ainda nao consentiu"
CREATE INDEX idx_users_pending_consent ON users(id) WHERE lgpd_consent_at IS NULL;

COMMENT ON COLUMN users.lgpd_consent_at IS 'Timestamp do consentimento LGPD do usuario. NULL = nao consentiu ainda.';
COMMENT ON COLUMN users.lgpd_consent_version IS 'Versao do termo aceito (ex: 2026-05-21). Permite re-coletar em mudancas materiais.';

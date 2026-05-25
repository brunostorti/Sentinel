-- Migration 013: Consentimento LGPD por usuário
-- Art. 7, I LGPD: consentimento como base legal para tratamento.
-- Art. 8: consentimento deve ser inequívoco, específico e demonstrável.

ALTER TABLE users
  ADD COLUMN lgpd_consent_at TIMESTAMPTZ,
  ADD COLUMN lgpd_consent_version TEXT;

CREATE INDEX idx_users_pending_consent ON users(id) WHERE lgpd_consent_at IS NULL;

COMMENT ON COLUMN users.lgpd_consent_at IS 'Timestamp do consentimento LGPD do usuário. NULL = não consentiu ainda.';
COMMENT ON COLUMN users.lgpd_consent_version IS 'Versão do termo aceito (ex: 2026-05-21).';

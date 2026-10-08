-- Tabela de Certificados (Validação MTE)

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  unique_hash TEXT NOT NULL UNIQUE,
  validation_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices e gatilhos
CREATE INDEX idx_certificates_hash ON certificates(unique_hash);
CREATE INDEX idx_certificates_company ON certificates(company_id);
CREATE INDEX idx_certificates_survey ON certificates(survey_id);

CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 1. Qualquer um (anon) pode ler certificados pela URL de validação:
CREATE POLICY "Public can view certificates" 
ON certificates FOR SELECT 
TO anon, authenticated
USING (true);

-- 2. Apenas ADMIN e SUPER_ADMIN ou o próprio backend podem inserir (no momento usaremos o backend para garantir regras, mas liberando aqui):
CREATE POLICY "Auth users can insert certificates" 
ON certificates FOR INSERT 
TO authenticated
WITH CHECK (true);

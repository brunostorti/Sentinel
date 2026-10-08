-- ============================================
-- CICLOS DE PESQUISA
-- ============================================
--
-- Um ciclo agrupa a pesquisa base e suas reavaliações posteriores, para
-- responder "os riscos diminuíram depois que agimos?".
--
-- Antes desta migration o agrupamento era derivado por regex no título da
-- pesquisa em tempo de execução — frágil e já comprovadamente quebrado
-- (títulos com sufixo "Ciclo N" não casavam com o padrão e viravam ciclos
-- órfãos). Aqui o ciclo passa a ser entidade de primeira classe: agrupar
-- vira um WHERE, não uma heurística de string.

CREATE TABLE survey_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_cycles_company ON survey_cycles(company_id);

CREATE TRIGGER trg_survey_cycles_updated
  BEFORE UPDATE ON survey_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Nullable de início para permitir o backfill; vira NOT NULL no final.
ALTER TABLE surveys ADD COLUMN cycle_id UUID REFERENCES survey_cycles(id) ON DELETE CASCADE;

-- ============================================
-- BACKFILL (uma única vez)
-- ============================================
--
-- Único ponto do sistema onde a heurística de título aparece. Depois daqui
-- o vínculo é explícito via cycle_id e a regex nunca mais é consultada.
--
-- Agrupa por (empresa, título sem sufixo de reavaliação). O COALESCE garante
-- que um título que se reduza a vazio caia de volta no título original — sem
-- isso a pesquisa ficaria órfã e o SET NOT NULL abaixo falharia.

INSERT INTO survey_cycles (company_id, title, created_at)
SELECT
  company_id,
  cycle_title,
  MIN(created_at)
FROM (
  SELECT
    company_id,
    created_at,
    COALESCE(
      NULLIF(
        TRIM(
          regexp_replace(
            title,
            '\s*[-–—]\s*(Reavalia[çc][ãa]o|Acompanhamento|Ciclo|Onda|Rodada|Wave)\s*[0-9]*\s*$',
            '',
            'i'
          )
        ),
        ''
      ),
      title
    ) AS cycle_title
  FROM surveys
) derived
GROUP BY company_id, cycle_title;

UPDATE surveys s
SET cycle_id = c.id
FROM survey_cycles c
WHERE c.company_id = s.company_id
  AND c.title = COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(
          s.title,
          '\s*[-–—]\s*(Reavalia[çc][ãa]o|Acompanhamento|Ciclo|Onda|Rodada|Wave)\s*[0-9]*\s*$',
          '',
          'i'
        )
      ),
      ''
    ),
    s.title
  );

-- Toda pesquisa pertence a exatamente um ciclo. Isso elimina o caso
-- "pesquisa órfã" de todo o código de UI daqui pra frente.
ALTER TABLE surveys ALTER COLUMN cycle_id SET NOT NULL;

CREATE INDEX idx_surveys_cycle ON surveys(cycle_id);

-- ============================================
-- RLS — espelha exatamente as policies de `surveys`
-- ============================================
--
-- Usa get_my_role() / get_my_company_id(), os helpers em vigor no banco
-- (renomeados a partir de get_user_*/ por 014_security_hardening; get_my_role()
-- devolve TEXT, daí a comparação com literais de texto). Como em `surveys`,
-- não existe policy de DELETE — remoção só via service role.

ALTER TABLE survey_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_cycles_select" ON survey_cycles FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "survey_cycles_insert" ON survey_cycles FOR INSERT WITH CHECK (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "survey_cycles_update" ON survey_cycles FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

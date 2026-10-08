-- Certificado passa a ser escopado por ciclo, não por pesquisa.
--
-- Também fecha um buraco de RLS encontrado durante a implementação: a policy
-- de SELECT liberava a tabela inteira (USING (true)) para anon/authenticated,
-- expondo nome de empresa, título de ciclo e hash de todo certificado emitido
-- no sistema. A validação pública por hash passa a acontecer numa rota de
-- servidor (client admin); a leitura direta na tabela fica restrita à mesma
-- empresa autenticada.

-- 0. Trigger órfão de uma migration anterior: chama update_updated_at(), que
--    seta NEW.updated_at, mas esta tabela nunca teve essa coluna. Ficou
--    inofensivo até agora porque a tabela era insert-only — o backfill do
--    passo 2 é o primeiro UPDATE que ela sofre, e sem isso a migration
--    inteira falha (e qualquer UPDATE futuro também falharia).
DROP TRIGGER IF EXISTS trg_certificates_updated ON certificates;

-- 1. Coluna nova, nullable a princípio
ALTER TABLE certificates ADD COLUMN cycle_id UUID REFERENCES survey_cycles(id) ON DELETE CASCADE;

-- 2. Backfill a partir da pesquisa já vinculada (verificado antes de aplicar:
--    6/6 certificados existentes têm survey.cycle_id preenchido, zero órfãos)
UPDATE certificates c
SET cycle_id = s.cycle_id
FROM surveys s
WHERE s.id = c.survey_id
  AND c.cycle_id IS NULL;

-- 3. Trava a coluna depois do backfill — elimina o caso de certificado órfão
ALTER TABLE certificates ALTER COLUMN cycle_id SET NOT NULL;

-- 4. survey_id vira link de auditoria ("última pesquisa avaliada na emissão"),
--    não mais a chave de escopo
ALTER TABLE certificates ALTER COLUMN survey_id DROP NOT NULL;

-- 5. Nível de conformidade no momento da emissão (1, 2 ou 3 — ver
--    resolveCertificateTier em src/lib/surveys/cycle.ts). Congelado no
--    momento da emissão: o ciclo pode evoluir depois sem alterar um PDF já
--    emitido.
ALTER TABLE certificates ADD COLUMN tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3));

-- 6. Índice pelo novo escopo
CREATE INDEX idx_certificates_cycle ON certificates(cycle_id);

-- 7. RLS: fecha a leitura pública direta na tabela
DROP POLICY IF EXISTS "Public can view certificates" ON certificates;

CREATE POLICY "Company members can view their certificates"
ON certificates FOR SELECT
TO authenticated
USING (company_id = get_my_company_id());

-- A policy de INSERT (authenticated, WITH CHECK true) permanece: a rota de
-- geração já valida role HR/ADMIN e pertencimento do ciclo à empresa antes de
-- inserir; RLS aqui é a segunda camada, não a primeira.

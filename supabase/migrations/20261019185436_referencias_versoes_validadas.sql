-- Referências: versões validadas dos questionários e documentos do MTE de 2026
--
-- Revisão de 19/10/2026. A página Metodologia (lista de kb_references) mostrava só as
-- versões originais dos questionários, e as notas de três delas descreviam versões que o
-- Sentinel não usa mais (COPSOQ III internacional, OLBI de 16 itens, JSS original). O Manual
-- GRO/PGR e o Perguntas e Respostas do MTE (2026) estavam no RAG, mas não na lista.
--
-- Conferência: DOIs na Crossref (autores, título, revista, ano, volume, páginas) em 19/10;
-- links do MTE e do manual do COPSOQ II respondendo (HTTP 200); N = 659 (Cotrim) e item 20
-- do Perguntas e Respostas (vigência em 26/05/2026) conferidos no texto das fontes.
--
-- As referências com texto completo na base do RAG (docs/rag/fontes.json, campo
-- kb_reference) não ganham ficha própria na ingestão.

-- ═══════════════════════════════════════════
-- 1. VERSÕES VALIDADAS USADAS NO SENTINEL
-- ═══════════════════════════════════════════

INSERT INTO kb_references
  (citation_key, authors, year, title, publisher_or_journal, doi, url, evidence_type, certainty_level, region, abnt_citation, notes)
VALUES
  ('Cotrim2022_COPSOQ3_PT', 'COTRIM, T. P. et al.', 2022,
   'The Portuguese Third Version of the Copenhagen Psychosocial Questionnaire: Preliminary Validation Studies of the Middle Version among Municipal and Healthcare Workers',
   'International Journal of Environmental Research and Public Health', '10.3390/ijerph19031167',
   'https://pmc.ncbi.nlm.nih.gov/articles/PMC8834667/', 'validation_study', NULL, 'europe',
   'COTRIM, T. P. et al. The Portuguese Third Version of the Copenhagen Psychosocial Questionnaire: Preliminary Validation Studies of the Middle Version among Municipal and Healthcare Workers. International Journal of Environmental Research and Public Health, v. 19, n. 3, 1167, 2022. DOI: 10.3390/ijerph19031167.',
   'Versão média portuguesa do COPSOQ III usada no Sentinel: 85 itens em 31 dimensões, com validação preliminar em trabalhadores municipais e da saúde (N = 659). Ainda sem valores de referência nacionais; o semáforo usa os tercis do manual COPSOQ. Acesso aberto (CC BY 4.0).'),

  ('SchusterDias2018_OLBI_BR', 'SCHUSTER, M. S.; DIAS, V. V.', 2018,
   'Oldenburg Burnout Inventory - validação de uma nova forma de mensurar Burnout no Brasil',
   'Ciência & Saúde Coletiva', '10.1590/1413-81232018232.27952015',
   'https://www.scielo.br/j/csc/a/DsJjWhKtqPxtsspbgSBz3jk/?lang=pt', 'validation_study', NULL, 'brazil',
   'SCHUSTER, M. S.; DIAS, V. V. Oldenburg Burnout Inventory - validação de uma nova forma de mensurar Burnout no Brasil. Ciência & Saúde Coletiva, v. 23, n. 2, p. 553-562, 2018. DOI: 10.1590/1413-81232018232.27952015.',
   'Versão brasileira do OLBI usada no Sentinel: 13 itens em 2 dimensões (exaustão e desengajamento), escala de 4 pontos. Mede efeitos à saúde, não fatores de risco: não basta para o inventário da NR-1. Acesso aberto (CC BY 4.0).'),

  ('Peterson2008_OLBI_Cortes', 'PETERSON, U. et al.', 2008,
   'Burnout and physical and mental health among Swedish healthcare workers',
   'Journal of Advanced Nursing', '10.1111/j.1365-2648.2007.04580.x',
   'https://doi.org/10.1111/j.1365-2648.2007.04580.x', 'observational', NULL, 'europe',
   'PETERSON, U. et al. Burnout and physical and mental health among Swedish healthcare workers. Journal of Advanced Nursing, v. 62, n. 1, p. 84-95, 2008. DOI: 10.1111/j.1365-2648.2007.04580.x.',
   'Estudo com profissionais de saúde suecos que propôs pontos de corte do OLBI para burnout: exaustão com média a partir de 2,25 e desengajamento a partir de 2,10, na escala de 1 a 4. O Sentinel usa esses cortes no semáforo do OLBI.'),

  ('Souza2015_JSS_BR', 'SOUZA, A. C.; MILANI, D.; ALEXANDRE, N. M. C.', 2015,
   'Adaptação cultural de um instrumento para avaliar a satisfação no trabalho',
   'Revista Brasileira de Saúde Ocupacional', '10.1590/0303-7657000113715',
   'https://www.scielo.br/j/rbso/a/xhGXGBXdwTj9XmpFzcVTwKP/?lang=pt', 'validation_study', NULL, 'brazil',
   'SOUZA, A. C.; MILANI, D.; ALEXANDRE, N. M. C. Adaptação cultural de um instrumento para avaliar a satisfação no trabalho. Revista Brasileira de Saúde Ocupacional, v. 40, n. 132, p. 219-227, 2015. DOI: 10.1590/0303-7657000113715.',
   'Adaptação cultural do Job Satisfaction Survey para o português do Brasil: 36 itens em 9 facetas, escala de 6 pontos. É o texto usado no Sentinel. Uso gratuito só para pesquisa e ensino; uso comercial requer licença do autor do JSS (Spector).'),

  ('Souza2017_JSS_BR', 'SOUZA, A. C.; ALEXANDRE, N. M. C.; GUIRARDELLO, E. B.', 2017,
   'Validation of the Brazilian Version of the Job Satisfaction Survey Using Confirmatory Factor Analysis',
   'Journal of Nursing Measurement', '10.1891/1061-3749.25.1.46',
   'https://doi.org/10.1891/1061-3749.25.1.46', 'validation_study', NULL, 'brazil',
   'SOUZA, A. C.; ALEXANDRE, N. M. C.; GUIRARDELLO, E. B. Validation of the Brazilian Version of the Job Satisfaction Survey Using Confirmatory Factor Analysis. Journal of Nursing Measurement, v. 25, n. 1, p. 46-65, 2017. DOI: 10.1891/1061-3749.25.1.46.',
   'Validação da versão brasileira do Job Satisfaction Survey (Souza, Milani e Alexandre, 2015) por análise fatorial confirmatória.');

-- ═══════════════════════════════════════════
-- 2. DOCUMENTOS DO MTE DE 2026 (já no RAG com texto completo)
-- ═══════════════════════════════════════════

INSERT INTO kb_references
  (citation_key, authors, year, title, publisher_or_journal, doi, url, evidence_type, certainty_level, region, abnt_citation, notes)
VALUES
  ('MTE2026_ManualGROPGR', 'BRASIL. Ministério do Trabalho e Emprego', 2026,
   'Manual do Gerenciamento de Riscos Ocupacionais (GRO) e do Programa de Gerenciamento de Riscos (PGR) da NR-1',
   'Brasília: MTE', NULL,
   'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf',
   'guideline', NULL, 'brazil',
   'BRASIL. Ministério do Trabalho e Emprego. Manual do Gerenciamento de Riscos Ocupacionais (GRO) e do Programa de Gerenciamento de Riscos (PGR) da NR-1. Brasília: MTE, 2026. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf. Acesso em: 19 out. 2026.',
   'Manual técnico do MTE para o GRO e o PGR: etapas, matriz de risco 5×5, níveis de risco e prazos de ação. O Dossiê NR-1 do Sentinel segue a matriz e os prazos do manual. Texto completo na base de consulta da IA (RAG).'),

  ('MTE2026_PerguntasRespostas', 'BRASIL. Ministério do Trabalho e Emprego', 2026,
   'NR-1 - Gerenciamento de riscos ocupacionais (GRO): perguntas e respostas sobre o capítulo 1.5 da NR-1 (1ª rodada)',
   'Brasília: MTE', NULL,
   'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/perguntas-e-respostas-gro-pgr-maio-2026',
   'guideline', NULL, 'brazil',
   'BRASIL. Ministério do Trabalho e Emprego. NR-1 - Gerenciamento de riscos ocupacionais (GRO): perguntas e respostas sobre o capítulo 1.5 da NR-1. 1ª rodada. Brasília: MTE, 2026. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/perguntas-e-respostas-gro-pgr-maio-2026. Acesso em: 19 out. 2026.',
   'Respostas oficiais do MTE sobre o capítulo 1.5 da NR-1: a organização escolhe a metodologia de avaliação, deve cuidar da confidencialidade e do anonimato (em especial em grupos pequenos) e, desde 26/05/2026, está sujeita às exigências da norma e à autuação (item 20). Texto completo na base de consulta da IA (RAG).');

-- ═══════════════════════════════════════════
-- 3. NOTAS QUE DESCREVIAM VERSÕES QUE NÃO USAMOS MAIS
-- ═══════════════════════════════════════════

UPDATE kb_references SET notes =
  'Artigo de referência internacional da 3ª versão do COPSOQ. No Sentinel usamos a versão média portuguesa (Cotrim et al., 2022), com 85 itens em 31 dimensões.'
WHERE citation_key = 'Burr2019_COPSOQ3';

UPDATE kb_references SET notes =
  'Validação original do OLBI, na versão de 16 itens (exaustão e desengajamento). No Sentinel usamos a versão brasileira de 13 itens (Schuster e Dias, 2018), com os pontos de corte de Peterson et al. (2008).'
WHERE citation_key = 'Demerouti2003_OLBI';

UPDATE kb_references SET notes =
  'Instrumento original do Job Satisfaction Survey: 36 itens em 9 facetas. No Sentinel usamos a versão brasileira (Souza, Milani e Alexandre, 2015; validada por Souza et al., 2017). Uso gratuito só para pesquisa e ensino; uso comercial requer licença do autor.'
WHERE citation_key = 'Spector1985_JSS';

-- Manual do COPSOQ II: o editor não é o ISLA (página de rosto: Universidade de Aveiro, edição
-- da Análise Exacta) e o link antigo (COPSOQ-II-Portuguese.pdf) dá 404.
UPDATE kb_references SET
  authors = 'SILVA, C. F. et al.',
  title = 'Copenhagen Psychosocial Questionnaire (COPSOQ): versão portuguesa - Portugal e países africanos de língua oficial portuguesa',
  publisher_or_journal = 'Universidade de Aveiro; Análise Exacta',
  url = 'https://www.copsoq-network.org/assets/Uploads/COPSOQ-Manual-Portugal2013.pdf',
  abnt_citation = 'SILVA, C. F. et al. Copenhagen Psychosocial Questionnaire (COPSOQ): versão portuguesa - Portugal e países africanos de língua oficial portuguesa. Aveiro: Universidade de Aveiro; Análise Exacta, 2013. Disponível em: https://www.copsoq-network.org/assets/Uploads/COPSOQ-Manual-Portugal2013.pdf. Acesso em: 19 out. 2026.',
  notes = 'Manual da versão portuguesa do COPSOQ II (N = 4.162 trabalhadores): versões curta, média e longa, dimensões e valores de referência nacionais. Base do principal instrumento do Sentinel. Texto completo na base de consulta da IA (RAG).'
WHERE citation_key = 'Silva2013_COPSOQ2_PT';

-- ═══════════════════════════════════════════
-- 4. CONFERÊNCIA
-- ═══════════════════════════════════════════

DO $$
DECLARE
  novas int;
  antigas int;
BEGIN
  SELECT count(*) INTO novas FROM kb_references WHERE citation_key IN (
    'Cotrim2022_COPSOQ3_PT', 'SchusterDias2018_OLBI_BR', 'Peterson2008_OLBI_Cortes',
    'Souza2015_JSS_BR', 'Souza2017_JSS_BR', 'MTE2026_ManualGROPGR', 'MTE2026_PerguntasRespostas');
  IF novas <> 7 THEN RAISE EXCEPTION 'esperadas 7 referências novas, encontradas %', novas; END IF;

  SELECT count(*) INTO antigas FROM kb_references
  WHERE notes ILIKE '%Um dos instrumentos usados na plataforma%'
     OR notes ILIKE '%instrumento alternativo%'
     OR notes ILIKE '%(404)%';
  IF antigas <> 0 THEN RAISE EXCEPTION 'ainda há % nota(s) desatualizada(s)', antigas; END IF;
END $$;

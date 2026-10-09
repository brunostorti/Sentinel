-- Migration 018: Auditoria e correção da base de evidências (kb_references)
--
-- Auditoria feita em 07/10/2026. Cada referência foi conferida:
--   • DOIs na Crossref (api.crossref.org) — título, autores, ano, revista, licença;
--   • links sem DOI acessados diretamente;
--   • alegações (specific_claim) comparadas com o texto/resumo da fonte sempre que
--     disponível (OMS 2022, Aust 2024, Bakker 2023, Lei 14.831, Portaria 1.419,
--     Guia MTE 2025, Gillen 2017, Chisholm 2016, Harrop 2025, Cameron 2025).
--
-- Problemas encontrados na migration 011 (aplicada via MCP, sem SQL no repo):
--   • 1 referência inexistente (TransfLeadership2023: DOI não existe);
--   • 1 protocolo de estudo usado como se tivesse resultados (Frontiers2020_Bullying);
--   • 7 referências reais com autor/ano/título/link errados;
--   • alegações atribuídas a fontes que não as contêm (ex.: ROI de £9,98 atribuído
--     à OMS; "Annex 4" da OMS, que só explica níveis de certeza; nº de
--     recomendações e níveis de certeza trocados).
--
-- Convenções adotadas daqui em diante:
--   • certainty_level só é preenchido quando a PRÓPRIA fonte classifica a certeza
--     da evidência (GRADE ou equivalente). Quando varia por recomendação/tipo de
--     intervenção (OMS, Aust), fica NULL e o nível aparece na specific_claim.
--   • relevance = 'primary' só quando a fonte avalia a eficácia da intervenção;
--     associação de risco ou fundamentação teórica = 'secondary' ou 'context'.

-- ═══════════════════════════════════════════
-- 1. REMOÇÕES (ON DELETE CASCADE remove os vínculos)
-- ═══════════════════════════════════════════

-- DOI 10.3389/fpsyg.2022.852685 não existe; nenhum artigo com este título.
DELETE FROM kb_references WHERE citation_key = 'TransfLeadership2023';

-- DOI real, mas é o PROTOCOLO de um ensaio (Einarsen et al. 2020), sem resultados.
-- O banco afirmava "RCT reduz incidentes". Substituído por Gillen 2017 (Cochrane).
DELETE FROM kb_references WHERE citation_key = 'Frontiers2020_Bullying';

-- ═══════════════════════════════════════════
-- 2. CORREÇÕES DE METADADOS
-- ═══════════════════════════════════════════

UPDATE kb_references SET
  citation_key = 'Aust2024_OrgHealthcare',
  authors = 'AUST, B. et al.',
  title = 'The effects of different types of organisational workplace mental health interventions on mental health and wellbeing in healthcare workers: a systematic review',
  certainty_level = NULL,
  notes = 'Revisão sistemática de 22 estudos controlados (23 artigos) com PROFISSIONAIS DE SAÚDE. 68% (15/22) melhoraram ao menos um desfecho primário; resultado mais consistente em burnout (11 de 13 estudos). Evidência forte para "modificações de trabalho e tarefas"; moderada para "trabalho flexível e escalas" e "mudanças no ambiente físico"; insuficiente para os demais tipos. Acesso aberto (CC BY 4.0). Antes cadastrada por engano como "Kida et al. / Cochrane".',
  abnt_citation = 'AUST, B. et al. The effects of different types of organisational workplace mental health interventions on mental health and wellbeing in healthcare workers: a systematic review. International Archives of Occupational and Environmental Health, v. 97, n. 5, p. 485-522, 2024. DOI: 10.1007/s00420-024-02065-z. Disponível em: https://link.springer.com/article/10.1007/s00420-024-02065-z. Acesso em: 7 out. 2026.'
WHERE citation_key = 'Cochrane2024_OrgHealthcare';

UPDATE kb_references SET
  citation_key = 'Greiner2022_Construction',
  authors = 'GREINER, B. A. et al.',
  title = 'The effectiveness of organisational-level workplace mental health interventions on mental health and wellbeing in construction workers: a systematic review and recommended research agenda',
  certainty_level = NULL,
  notes = 'Revisão sistemática restrita a TRABALHADORES DA CONSTRUÇÃO CIVIL. Conclui que a evidência de eficácia de intervenções organizacionais nesse setor é limitada. Acesso aberto (CC BY 4.0). Antes cadastrada por engano como "Gray et al.", com título truncado que omitia o setor.',
  abnt_citation = 'GREINER, B. A. et al. The effectiveness of organisational-level workplace mental health interventions on mental health and wellbeing in construction workers: a systematic review and recommended research agenda. PLOS ONE, v. 17, n. 11, e0277114, 2022. DOI: 10.1371/journal.pone.0277114. Disponível em: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0277114. Acesso em: 7 out. 2026.'
WHERE citation_key = 'PLOS2022_OrgInterventions';

UPDATE kb_references SET
  citation_key = 'Cameron2025_Digital',
  authors = 'CAMERON, G. et al.',
  title = 'Effectiveness of Digital Mental Health Interventions in the Workplace: Umbrella Review of Systematic Reviews',
  certainty_level = 'low',
  notes = 'Revisão guarda-chuva de 14 revisões sistemáticas (2014-2023) sobre intervenções digitais no trabalho (TCC, mindfulness, gestão de estresse). Encontrou efeito em estresse, ansiedade, depressão, burnout e bem-estar, mas a qualidade metodológica das revisões foi baixa (7) ou criticamente baixa (7) pelo AMSTAR-2. Antes cadastrada por engano como "O''Brien et al., meta-análise".',
  abnt_citation = 'CAMERON, G. et al. Effectiveness of Digital Mental Health Interventions in the Workplace: Umbrella Review of Systematic Reviews. JMIR Mental Health, v. 12, e67785, 2025. DOI: 10.2196/67785. Disponível em: https://mental.jmir.org/2025/1/e67785. Acesso em: 7 out. 2026.'
WHERE citation_key = 'JMIR2025_Digital';

UPDATE kb_references SET
  citation_key = 'Harrop2025_FlexibleWork',
  authors = 'HARROP, N.; JIANG, L.; OVERALL, N.',
  year = 2025,
  certainty_level = NULL,
  notes = 'Meta-análise de 113 estudos (88.618 participantes): arranjos de trabalho flexível associados a maior satisfação no trabalho, comprometimento organizacional, autonomia, satisfação com a vida e melhor interface trabalho-família. Benefícios maiores com flexibilidade de horário + local combinadas, e com a disponibilidade (mais que o uso) do arranjo. Licença CC BY-NC-ND 4.0. Antes cadastrada por engano como "Wheatley, 2022".',
  abnt_citation = 'HARROP, N.; JIANG, L.; OVERALL, N. A Meta-Analysis of Antecedents and Outcomes of Flexible Working Arrangements. Journal of Organizational Behavior, v. 47, n. 2, p. 208-236, 2025. DOI: 10.1002/job.2896. Disponível em: https://onlinelibrary.wiley.com/doi/full/10.1002/job.2896. Acesso em: 7 out. 2026.'
WHERE citation_key = 'Wiley2022_FlexibleWork';

UPDATE kb_references SET
  authors = 'EDMONDSON, A. C.; BRANSBY, D. P.',
  certainty_level = NULL,
  notes = 'Revisão de mais de 25 anos de pesquisa sobre segurança psicológica. Identifica quatro temas dominantes: realização do trabalho, comportamentos de aprendizagem, melhoria da experiência de trabalho e liderança. Acesso aberto (CC BY 4.0).',
  abnt_citation = 'EDMONDSON, A. C.; BRANSBY, D. P. Psychological Safety Comes of Age: Observed Themes in an Established Literature. Annual Review of Organizational Psychology and Organizational Behavior, v. 10, p. 55-78, 2023. DOI: 10.1146/annurev-orgpsych-120920-055217. Disponível em: https://www.annualreviews.org/doi/10.1146/annurev-orgpsych-120920-055217. Acesso em: 7 out. 2026.'
WHERE citation_key = 'Edmondson2023_PsychSafety';

UPDATE kb_references SET
  authors = 'BAKKER, A. B.; DEMEROUTI, E.; SANZ-VERGEL, A.',
  certainty_level = NULL,
  notes = 'Revisão teórica do modelo Demandas-Recursos do Trabalho (JD-R). Demandas (carga, pressão, ambiguidade e conflito de papel) levam a desgaste/exaustão; recursos (autonomia, apoio social, feedback, significado da tarefa, perspectiva de carreira, oportunidades de recuperação) predizem engajamento e amortecem o efeito das demandas. Acesso aberto (CC BY 4.0).',
  abnt_citation = 'BAKKER, A. B.; DEMEROUTI, E.; SANZ-VERGEL, A. Job Demands-Resources Theory: Ten Years Later. Annual Review of Organizational Psychology and Organizational Behavior, v. 10, p. 25-53, 2023. DOI: 10.1146/annurev-orgpsych-120920-053933. Disponível em: https://www.annualreviews.org/content/journals/10.1146/annurev-orgpsych-120920-053933. Acesso em: 7 out. 2026.'
WHERE citation_key = 'Bakker2023_JDR';

UPDATE kb_references SET
  doi = '10.1027//1015-5759.19.1.12',
  certainty_level = NULL,
  abnt_citation = 'DEMEROUTI, E.; BAKKER, A. B.; VARDAKOU, I.; KANTAS, A. The convergent validity of two burnout instruments: A multitrait-multimethod analysis. European Journal of Psychological Assessment, v. 19, n. 1, p. 12-23, 2003. DOI: 10.1027//1015-5759.19.1.12.'
WHERE citation_key = 'Demerouti2003_OLBI';

-- O PDF original no copsoq-network.org retorna 404. O manual existe (Universidade
-- de Aveiro); fontes citam a edição de 2011. Ano mantido até confirmação com a equipe.
UPDATE kb_references SET
  url = 'https://www.copsoq-network.org/',
  certainty_level = NULL,
  notes = 'Manual de validação do COPSOQ II em português (N=4.162 trabalhadores): versões curta/média/longa, dimensões e valores de referência. Base do instrumento principal do Sentinel. O PDF antes hospedado no COPSOQ International Network não está mais disponível (404); o link aponta para a rede COPSOQ.'
WHERE citation_key = 'Silva2013_COPSOQ2_PT';

UPDATE kb_references SET
  notes = 'Portaria que reescreve o capítulo 1.5 (GRO) da NR-1. Item 1.5.3.1.4: o gerenciamento de riscos ocupacionais deve abranger os fatores de risco psicossociais relacionados ao trabalho. Entrou em vigor em 26/05/2025 em caráter orientativo; fiscalização com autuação a partir de 26/05/2026 (prorrogação pela Portaria MTE 765/2025). Ato oficial, domínio público.',
  certainty_level = NULL
WHERE citation_key = 'NR1_2024';

UPDATE kb_references SET
  notes = 'Lei do Certificado Empresa Promotora da Saúde Mental (adesão VOLUNTÁRIA). Art. 3º lista as diretrizes: promoção da saúde mental (programas, apoio psicológico, campanhas e treinamentos, capacitação de lideranças, combate à discriminação e ao assédio), bem-estar dos trabalhadores e transparência (inclui canal para sugestões e avaliações). Validade de 2 anos. Domínio público.',
  certainty_level = NULL
WHERE citation_key = 'Lei14831_2024';

UPDATE kb_references SET certainty_level = NULL WHERE citation_key IN (
  'Burr2019_COPSOQ3', 'INSS2026', 'LGPD', 'Maslach2016_Burnout', 'Ryan2022_SDT',
  'Spector1985_JSS', 'WHO2022_Guidelines', 'WHO_ILO2022_PolicyBrief'
);

UPDATE kb_references SET
  certainty_level = NULL,
  notes = 'Meta-análise Gallup Q12 (11ª ed., 2020): 112.312 unidades de negócio em 96 países. Quartil superior de engajamento: 81% menos absenteísmo, 18% menos turnover (organizações de alta rotatividade), 23% mais lucratividade. Relatório PROPRIETÁRIO (direitos reservados, não revisado por pares): usar só como citação, não indexar o texto no RAG.'
WHERE citation_key = 'Gallup_Q12_2020';

UPDATE kb_references SET
  notes = 'Licença CC BY-NC-SA 3.0 IGO (NÃO comercial): pode ser citada; indexar o texto completo no RAG para uso comercial exige avaliação jurídica. Recomendações com força e certeza próprias (ex.: Rec. 4 treinamento de gestores = forte, certeza moderada; Rec. 1 intervenções organizacionais = condicional, certeza muito baixa).'
WHERE citation_key = 'WHO2022_Guidelines';

UPDATE kb_references SET
  notes = 'Tradução prática das diretrizes OMS 2022 para governos, empregadores e trabalhadores. Licença CC BY-NC-SA 3.0 IGO (NÃO comercial).'
WHERE citation_key = 'WHO_ILO2022_PolicyBrief';

-- A notícia da OMS (2016) divulgava um estudo; trocamos pela fonte primária.
UPDATE kb_references SET
  citation_key = 'Chisholm2016_ROI',
  authors = 'CHISHOLM, D. et al.',
  year = 2016,
  title = 'Scaling-up treatment of depression and anxiety: a global return on investment analysis',
  publisher_or_journal = 'The Lancet Psychiatry',
  doi = '10.1016/S2215-0366(16)30024-4',
  url = 'https://doi.org/10.1016/S2215-0366(16)30024-4',
  evidence_type = 'observational',
  certainty_level = NULL,
  region = 'global',
  notes = 'Estudo de modelagem de retorno sobre investimento (36 países, 2016-2030) sobre ampliar o TRATAMENTO de depressão e ansiedade. Relação benefício-custo de 2,3-3,0:1 só com ganhos econômicos e 3,3-5,7:1 incluindo o valor da saúde (a OMS divulgou como "US$4 por US$1"). Não trata de programas de bem-estar em geral. Acesso aberto (CC BY).',
  abnt_citation = 'CHISHOLM, D. et al. Scaling-up treatment of depression and anxiety: a global return on investment analysis. The Lancet Psychiatry, v. 3, n. 5, p. 415-424, 2016. DOI: 10.1016/S2215-0366(16)30024-4.'
WHERE citation_key = 'WHO2016_ROI';

-- ═══════════════════════════════════════════
-- 3. NOVAS REFERÊNCIAS (todas verificadas)
-- ═══════════════════════════════════════════

INSERT INTO kb_references (citation_key, authors, year, title, publisher_or_journal, doi, url, evidence_type, certainty_level, region, abnt_citation, notes) VALUES
  ('MTE2025_GuiaPsicossocial',
   'BRASIL. Ministério do Trabalho e Emprego', 2025,
   'Guia de informações sobre os fatores de riscos psicossociais relacionados ao trabalho: NR-1 - Gerenciamento de riscos ocupacionais (GRO)',
   'Brasília: MTE', NULL,
   'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/guia-nr-01-revisado.pdf',
   'guideline', NULL, 'brazil',
   'BRASIL. Ministério do Trabalho e Emprego. Guia de informações sobre os fatores de riscos psicossociais relacionados ao trabalho: NR-1 - Gerenciamento de riscos ocupacionais (GRO). Brasília: MTE, 2025. Disponível em: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/guia-nr-01-revisado.pdf. Acesso em: 7 out. 2026.',
   'Guia oficial do MTE para aplicar a NR-1 aos riscos psicossociais: o que mudou, preparação, identificação de perigos, avaliação, controle, documentação, exemplo prático e perguntas frequentes. Cita sobrecarga e assédio como fatores de risco; o MTE não define metodologia de avaliação e destaca a importância do anonimato em questionários. "Autorizada a reprodução desde que citada a fonte."'),

  ('Gillen2017_Bullying',
   'GILLEN, P. A.; SINCLAIR, M.; KERNOHAN, W. G.; BEGLEY, C. M.; LUYBEN, A. G.', 2017,
   'Interventions for prevention of bullying in the workplace',
   'Cochrane Database of Systematic Reviews', '10.1002/14651858.CD009778.pub2',
   'https://doi.org/10.1002/14651858.CD009778.pub2',
   'systematic_review', 'very_low', 'global',
   'GILLEN, P. A. et al. Interventions for prevention of bullying in the workplace. Cochrane Database of Systematic Reviews, n. 1, CD009778, 2017. DOI: 10.1002/14651858.CD009778.pub2.',
   'Revisão Cochrane: 5 estudos, 4.116 participantes. Evidência de qualidade MUITO BAIXA de que intervenções organizacionais e individuais podem prevenir bullying. O programa CREW (civilidade, respeito e engajamento) gerou pequeno aumento de civilidade e, em um estudo, redução de faltas. Acesso pago (somente citação).'),

  ('Inceoglu2018_Leadership',
   'INCEOGLU, I.; THOMAS, G.; CHU, C.; PLANS, D.; GERBASI, A.', 2018,
   'Leadership behavior and employee well-being: An integrated review and a future research agenda',
   'The Leadership Quarterly', '10.1016/j.leaqua.2017.12.006',
   'https://doi.org/10.1016/j.leaqua.2017.12.006',
   'theoretical', NULL, 'global',
   'INCEOGLU, I. et al. Leadership behavior and employee well-being: An integrated review and a future research agenda. The Leadership Quarterly, v. 29, n. 1, p. 179-202, 2018. DOI: 10.1016/j.leaqua.2017.12.006.',
   'Revisão integrativa (não é meta-análise) sobre como comportamentos de liderança (de mudança, relacionais, de tarefa e passivos) afetam o bem-estar dos colaboradores, por mecanismos sociocognitivos, motivacionais, afetivos, relacionais e de identificação. Manuscrito do autor em acesso aberto; versão final paga.'),

  ('Goncalves2021_COPSOQ2_BR',
   'GONÇALVES, J. S.; MORIGUCHI, C. S.; CHAVES, T. C.; SATO, T. O.', 2021,
   'Cross-cultural adaptation and psychometric properties of the short version of COPSOQ II-Brazil',
   'Revista de Saúde Pública', '10.11606/s1518-8787.2021055003123',
   'https://scielosp.org/article/rsp/2021.v55/69',
   'validation_study', NULL, 'brazil',
   'GONÇALVES, J. S. et al. Cross-cultural adaptation and psychometric properties of the short version of COPSOQ II-Brazil. Revista de Saúde Pública, v. 55, p. 69, 2021. DOI: 10.11606/s1518-8787.2021055003123.',
   'Adaptação transcultural e validação da versão curta do COPSOQ II para o português do Brasil: 7 domínios e 11 dimensões, alfa de Cronbach 0,70-0,87, ICC teste-reteste 0,71-0,81. Acesso aberto (CC BY 4.0).'),

  ('Rosario2017_COPSOQ2_PT',
   'ROSÁRIO, S.; AZEVEDO, L. F.; FONSECA, J. A.; NIENHAUS, A.; NÜBLING, M.; COSTA, J. T.', 2017,
   'The Portuguese long version of the Copenhagen Psychosocial Questionnaire II (COPSOQ II) - a validation study',
   'Journal of Occupational Medicine and Toxicology', '10.1186/s12995-017-0170-9',
   'https://link.springer.com/article/10.1186/s12995-017-0170-9',
   'validation_study', NULL, 'europe',
   'ROSÁRIO, S. et al. The Portuguese long version of the Copenhagen Psychosocial Questionnaire II (COPSOQ II) - a validation study. Journal of Occupational Medicine and Toxicology, v. 12, n. 1, p. 24, 2017. DOI: 10.1186/s12995-017-0170-9.',
   'Validação da versão longa portuguesa do COPSOQ II. Acesso aberto (BioMed Central).');

-- ═══════════════════════════════════════════
-- 4. VÍNCULOS INTERVENÇÃO ↔ REFERÊNCIA
-- ═══════════════════════════════════════════

-- 4.1 Vínculos sem respaldo na fonte
DELETE FROM kb_intervention_references ir USING kb_references r
WHERE r.id = ir.reference_id AND (
     (r.citation_key = 'Bakker2023_JDR'   AND ir.intervention_id IN ('recognition.salary-benchmark', 'security.talent-retention-plan'))
  OR (r.citation_key = 'Gallup_Q12_2020'  AND ir.intervention_id = 'recognition.salary-benchmark')
  OR (r.citation_key = 'Chisholm2016_ROI' AND ir.intervention_id = 'burnout.workplace-fitness-program')
);

-- 4.2 Alegações reescritas a partir do texto da fonte
CREATE TEMP TABLE _claim_fix (citation_key TEXT, intervention_id TEXT, relevance TEXT, specific_claim TEXT);

INSERT INTO _claim_fix VALUES
  -- Bakker 2023 (JD-R)
  ('Bakker2023_JDR', 'autonomy.decision-empowerment', 'secondary', 'JD-R: autonomia é um recurso do trabalho que prediz engajamento e amortece o efeito das demandas sobre o desgaste.'),
  ('Bakker2023_JDR', 'autonomy.individual-development-plan', 'secondary', 'JD-R: recursos de desenvolvimento (ex.: perspectiva de carreira) estão entre os mais relacionados ao engajamento.'),
  ('Bakker2023_JDR', 'burnout.digital-disconnect-policy', 'secondary', 'JD-R: oportunidades de recuperação estão entre os recursos que mitigam o impacto das demandas sobre o desgaste.'),
  ('Bakker2023_JDR', 'communication.role-clarification-raci', 'secondary', 'JD-R: ambiguidade e conflito de papel são demandas associadas a exaustão e despersonalização.'),
  ('Bakker2023_JDR', 'meaning.purpose-connection', 'secondary', 'JD-R: significado da tarefa aparece entre os recursos do trabalho que predizem engajamento.'),
  ('Bakker2023_JDR', 'recognition.career-path', 'secondary', 'JD-R: perspectiva de carreira (recurso de desenvolvimento) relaciona-se positivamente ao engajamento.'),
  ('Bakker2023_JDR', 'social.buddy-program', 'secondary', 'JD-R: apoio de colegas é recurso social do trabalho, preditor de engajamento.'),
  ('Bakker2023_JDR', 'social.team-integration-events', 'secondary', 'JD-R: apoio social está entre os recursos do trabalho associados a engajamento.'),
  ('Bakker2023_JDR', 'workload.deadline-realism-workshop', 'secondary', 'JD-R: carga e pressão de trabalho são demandas associadas a exaustão.'),
  ('Bakker2023_JDR', 'workload.process-automation', 'context', 'JD-R: carga e demandas cognitivas elevam o desgaste; reduzi-las é coerente com o modelo.'),
  ('Bakker2023_JDR', 'workload.structured-breaks', 'secondary', 'JD-R: oportunidades de recuperação mitigam o impacto da carga de trabalho sobre o desgaste.'),
  ('Bakker2023_JDR', 'workload.task-redistribution', 'secondary', 'JD-R: excesso de carga é demanda associada a exaustão; reduzir a demanda é coerente com o modelo.'),
  ('Bakker2023_JDR', 'workload.time-management-training', 'context', 'JD-R: autoeficácia é recurso pessoal associado a engajamento.'),
  -- Burr 2019 (COPSOQ III)
  ('Burr2019_COPSOQ3', 'meaning.pulse-surveys', 'secondary', 'COPSOQ III: instrumento validado internacionalmente, com versões de tamanhos diferentes, para avaliar o ambiente psicossocial de forma recorrente.'),
  -- Aust 2024 (antes "Cochrane2024")
  ('Aust2024_OrgHealthcare', 'workload.deadline-realism-workshop', 'secondary', 'Profissionais de saúde: evidência forte para modificações de trabalho e tarefas (Aust et al. 2024).'),
  ('Aust2024_OrgHealthcare', 'workload.process-automation', 'primary', 'Profissionais de saúde: evidência forte para modificações de trabalho e tarefas; efeito mais consistente em burnout (11 de 13 estudos).'),
  ('Aust2024_OrgHealthcare', 'workload.task-redistribution', 'primary', '22 estudos controlados com profissionais de saúde: 68% melhoraram ao menos um desfecho de saúde mental; evidência forte para modificações de trabalho e tarefas.'),
  -- Edmondson 2023
  ('Edmondson2023_PsychSafety', 'communication.bidirectional-feedback', 'secondary', 'Segurança psicológica favorece comportamentos de voz e de aprendizagem nas equipes.'),
  ('Edmondson2023_PsychSafety', 'communication.monthly-town-halls', 'secondary', 'Segurança psicológica melhora a experiência de trabalho e favorece que as pessoas se manifestem.'),
  ('Edmondson2023_PsychSafety', 'leadership.development-program', 'secondary', 'Liderança é um dos principais antecedentes da segurança psicológica da equipe.'),
  ('Edmondson2023_PsychSafety', 'leadership.feedback-channel', 'secondary', 'Segurança psicológica é condição para que as pessoas se sintam à vontade para dar feedback e se manifestar.'),
  ('Edmondson2023_PsychSafety', 'leadership.weekly-1on1', 'secondary', 'Comportamentos do líder estão entre os principais antecedentes da segurança psicológica.'),
  ('Edmondson2023_PsychSafety', 'security.transparent-communication', 'secondary', 'Segurança psicológica favorece voz e melhora a experiência de trabalho.'),
  -- Gallup Q12 (proprietário)
  ('Gallup_Q12_2020', 'communication.bidirectional-feedback', 'secondary', 'Q12 inclui o item "meu supervisor, ou alguém no trabalho, parece se importar comigo como pessoa".'),
  ('Gallup_Q12_2020', 'leadership.weekly-1on1', 'secondary', 'Q12 inclui o item "nos últimos seis meses, alguém no trabalho conversou comigo sobre meu progresso".'),
  ('Gallup_Q12_2020', 'recognition.formal-program', 'secondary', 'Q12 inclui o item sobre ter recebido reconhecimento ou elogio nos últimos sete dias; quartil superior de engajamento teve 81% menos absenteísmo e 23% mais lucratividade.'),
  ('Gallup_Q12_2020', 'security.talent-retention-plan', 'secondary', 'Quartil superior de engajamento: 18% menos turnover em organizações de alta rotatividade (Q12 2020).'),
  ('Gallup_Q12_2020', 'social.peer-recognition-platform', 'secondary', 'Q12 inclui o item sobre ter recebido reconhecimento ou elogio nos últimos sete dias.'),
  -- INSS (F33 estava errado: o 2º lugar é F32)
  ('INSS2026', 'burnout.early-signal-monitoring', 'context', 'INSS 2025: transtornos ansiosos (F41) e episódios depressivos (F32) lideram os benefícios por incapacidade temporária por transtornos mentais.'),
  ('INSS2026', 'burnout.teleterapia-b2b', 'context', 'Brasil 2025: 546.254 benefícios por transtornos mentais (+15,66% vs 2024); ansiedade (F41) com 166.489.'),
  -- Cameron 2025 (antes "JMIR2025 / O'Brien")
  ('Cameron2025_Digital', 'burnout.teleterapia-b2b', 'secondary', 'Revisão guarda-chuva (14 revisões): intervenções digitais (TCC, mindfulness, gestão de estresse) mostraram efeito em estresse, ansiedade, depressão e burnout, mas a qualidade das revisões foi baixa ou criticamente baixa.'),
  -- Lei 14.831 (não exige "canal de denúncia"; certificado é voluntário)
  ('Lei14831_2024', 'offensive.anti-harassment-channel', 'context', 'Lei 14.831/2024, art. 3º: diretrizes do certificado (voluntário) incluem combate à discriminação e ao assédio (I, g) e canal para sugestões e avaliações (III, b).'),
  ('Lei14831_2024', 'offensive.mandatory-compliance-training', 'context', 'Lei 14.831/2024, art. 3º, I: campanhas e treinamentos (c), capacitação de lideranças (e) e combate ao assédio (g) são diretrizes do certificado.'),
  -- Maslach 2016
  ('Maslach2016_Burnout', 'burnout.digital-disconnect-policy', 'secondary', 'Carga de trabalho é uma das seis áreas da vida laboral associadas ao burnout.'),
  ('Maslach2016_Burnout', 'burnout.early-signal-monitoring', 'secondary', 'Exaustão é a dimensão central do burnout, ao lado de cinismo e ineficácia.'),
  ('Maslach2016_Burnout', 'burnout.teleterapia-b2b', 'secondary', 'Exaustão emocional é dimensão central do burnout.'),
  ('Maslach2016_Burnout', 'recognition.formal-program', 'context', 'Recompensa é uma das seis áreas da vida laboral associadas ao burnout.'),
  ('Maslach2016_Burnout', 'recognition.salary-benchmark', 'context', 'Recompensa insuficiente (inclusive financeira) é uma das seis áreas de desajuste associadas ao burnout.'),
  -- NR-1 (a Portaria não lista assédio nem sobrecarga; quem lista é o Guia MTE)
  ('NR1_2024', 'offensive.mandatory-compliance-training', 'context', 'Portaria MTE 1.419/2024, item 1.5.3.1.4: o GRO deve abranger os fatores de risco psicossociais relacionados ao trabalho.'),
  ('NR1_2024', 'workload.task-redistribution', 'context', 'Portaria MTE 1.419/2024, item 1.5.3.1.4: o GRO deve abranger os fatores de risco psicossociais relacionados ao trabalho.'),
  -- Chisholm 2016 (antes "WHO2016_ROI")
  ('Chisholm2016_ROI', 'burnout.teleterapia-b2b', 'primary', 'Ampliar o tratamento de depressão e ansiedade tem relação benefício-custo de 2,3-3,0:1 (só econômico) e 3,3-5,7:1 incluindo o valor da saúde (36 países, 2016-2030).'),
  -- OMS 2022 ("Annex 4" só explica níveis de certeza; associações estão na justificativa da Rec. 1)
  ('WHO2022_Guidelines', 'autonomy.decision-empowerment', 'context', 'OMS 2022 (justificativa da Rec. 1): baixa autonomia de decisão associa-se a sintomas de transtornos mentais; maior controle associa-se a menor exaustão.'),
  ('WHO2022_Guidelines', 'autonomy.flexible-hours', 'primary', 'OMS 2022 (Rec. 1): horário flexível teve pequenos efeitos favoráveis em sintomas de saúde mental e na satisfação no trabalho; recomendação condicional, certeza muito baixa.'),
  ('WHO2022_Guidelines', 'burnout.digital-disconnect-policy', 'context', 'OMS 2022 (justificativa da Rec. 1): longas jornadas associam-se a sintomas depressivos; longas jornadas e trabalho em turnos, a maior chance de ideação suicida.'),
  ('WHO2022_Guidelines', 'burnout.early-signal-monitoring', 'secondary', 'OMS 2022 (Rec. 4): treinamento de gestores para apoiar a saúde mental dos trabalhadores; recomendação forte, certeza moderada.'),
  ('WHO2022_Guidelines', 'burnout.workplace-fitness-program', 'primary', 'OMS 2022 (Rec. 8B): oportunidades de atividade física de lazer podem ser consideradas; recomendação condicional, certeza muito baixa.'),
  ('WHO2022_Guidelines', 'communication.role-clarification-raci', 'context', 'OMS 2022 (justificativa da Rec. 1): ambiguidade e conflito de papel associam-se a desfechos de depressão.'),
  ('WHO2022_Guidelines', 'leadership.360-evaluation', 'context', 'OMS 2022 (Rec. 4): treinamento de gestores para saúde mental; recomendação forte, certeza moderada. A avaliação 360 em si não foi avaliada.'),
  ('WHO2022_Guidelines', 'leadership.development-program', 'primary', 'OMS 2022 (Rec. 4): treinamento de gestores para saúde mental; recomendação forte, certeza moderada.'),
  ('WHO2022_Guidelines', 'leadership.weekly-1on1', 'context', 'OMS 2022 (Rec. 4): gestores treinados para apoiar trabalhadores; recomendação forte, certeza moderada.'),
  ('WHO2022_Guidelines', 'meaning.pulse-surveys', 'secondary', 'OMS 2022 (Rec. 1): quem implementa intervenções organizacionais deve monitorar o impacto das mudanças nos trabalhadores; recomendação condicional, certeza muito baixa.'),
  ('WHO2022_Guidelines', 'offensive.anti-harassment-channel', 'secondary', 'OMS 2022 (justificativa da Rec. 1): bullying no trabalho associa-se a sintomas de depressão, ansiedade e estresse.'),
  ('WHO2022_Guidelines', 'security.transparent-communication', 'context', 'OMS 2022 (justificativa da Rec. 1): insegurança no emprego relaciona-se a maior risco de sintomas depressivos.'),
  ('WHO2022_Guidelines', 'security.work-life-balance', 'context', 'OMS 2022 (justificativa da Rec. 1): maior conflito trabalho-família associa-se a maior uso de psicotrópicos.'),
  ('WHO2022_Guidelines', 'workload.deadline-realism-workshop', 'context', 'OMS 2022 (justificativa da Rec. 1): alta carga de trabalho aumenta o risco de sintomas de transtornos mentais.'),
  ('WHO2022_Guidelines', 'workload.structured-breaks', 'context', 'OMS 2022 (Rec. 1): para mudanças de carga ou pausas (rodízio de tarefas), um estudo indicou, com baixa certeza, AUSÊNCIA de efeito em sintomas.'),
  ('WHO2022_Guidelines', 'workload.task-redistribution', 'context', 'OMS 2022 (Rec. 1): intervenções organizacionais sobre fatores de risco psicossociais podem ser consideradas; recomendação condicional, certeza muito baixa.'),
  ('WHO2022_Guidelines', 'workload.time-management-training', 'secondary', 'OMS 2022 (Rec. 8A): intervenções psicossociais universais para desenvolver habilidades de gestão do estresse podem ser consideradas; recomendação condicional, certeza baixa.'),
  -- Harrop 2025 (antes "Wheatley 2022"); "redução de absenteísmo" não consta da fonte
  ('Harrop2025_FlexibleWork', 'autonomy.flexible-hours', 'primary', 'Meta-análise (113 estudos, 88.618 participantes): trabalho flexível associado a maior satisfação, comprometimento, autonomia e satisfação com a vida.'),
  ('Harrop2025_FlexibleWork', 'security.work-life-balance', 'primary', 'Meta-análise: trabalho flexível associado a melhor interface trabalho-família e satisfação familiar.');

UPDATE kb_intervention_references ir
SET relevance = f.relevance, specific_claim = f.specific_claim
FROM _claim_fix f
JOIN kb_references r ON r.citation_key = f.citation_key
WHERE ir.reference_id = r.id AND ir.intervention_id = f.intervention_id;

-- 4.3 Novos vínculos (substituem os removidos)
INSERT INTO kb_intervention_references (intervention_id, reference_id, relevance, specific_claim)
SELECT v.intervention_id, r.id, v.relevance, v.specific_claim
FROM (VALUES
  ('Gillen2017_Bullying', 'offensive.mandatory-compliance-training', 'primary', 'Revisão Cochrane (5 estudos, 4.116 participantes): evidência de qualidade muito baixa de que intervenções organizacionais e individuais podem prevenir bullying; o programa de civilidade CREW gerou pequeno aumento de civilidade.'),
  ('Gillen2017_Bullying', 'offensive.anti-harassment-channel', 'secondary', 'Revisão Cochrane: evidência de qualidade muito baixa para intervenções de prevenção de bullying; faltam ensaios bem desenhados.'),
  ('Gillen2017_Bullying', 'offensive.rapid-investigation-protocol', 'context', 'Revisão Cochrane: evidência de qualidade muito baixa para intervenções de prevenção de bullying; faltam ensaios bem desenhados.'),
  ('Inceoglu2018_Leadership', 'leadership.development-program', 'secondary', 'Revisão integrativa: comportamentos de liderança influenciam o bem-estar dos colaboradores por mecanismos sociocognitivos, motivacionais, afetivos, relacionais e de identificação.'),
  ('MTE2025_GuiaPsicossocial', 'offensive.mandatory-compliance-training', 'context', 'Guia MTE 2025: assédio e suas derivações são exemplos de fatores de risco psicossociais a integrar o inventário de riscos do PGR.'),
  ('MTE2025_GuiaPsicossocial', 'workload.task-redistribution', 'context', 'Guia MTE 2025: excesso de demandas (sobrecarga) é fator de risco psicossocial associado a transtorno mental e DORT.'),
  ('MTE2025_GuiaPsicossocial', 'meaning.pulse-surveys', 'context', 'Guia MTE 2025: o MTE não define metodologia de avaliação; se houver questionário, é muito importante garantir o anonimato.')
) AS v(citation_key, intervention_id, relevance, specific_claim)
JOIN kb_references r ON r.citation_key = v.citation_key;

DROP TABLE _claim_fix;


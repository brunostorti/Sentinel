-- [Reconstruída em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260521070629
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 21/05/2026,
-- recuperado de schema_migrations.statements. Antes este arquivo só tinha comentários.
-- Mapeia intervention_id (slug do catalog.ts) -> kb_references via citation_key.
-- Os mapeamentos foram auditados/corrigidos depois na migração 018_fix_kb_references (versão 20261008011829).
-- ===== SQL original (não editar) =====
WITH refs AS (
  SELECT citation_key, id FROM kb_references
)
INSERT INTO kb_intervention_references (intervention_id, reference_id, relevance, specific_claim)
SELECT iv.intervention_id, r.id, iv.relevance, iv.specific_claim
FROM (VALUES
-- workload
('workload.task-redistribution',       'Cochrane2024_OrgHealthcare', 'primary',   '22 estudos: 68% das intervencoes organizacionais melhoraram saude mental. STRONG evidence para Job and Task Modifications (Kida 2024).'),
('workload.task-redistribution',       'Bakker2023_JDR',             'secondary', 'JD-R Theory: redistribuir tarefas reduz workload (demanda) sem perder recursos.'),
('workload.task-redistribution',       'WHO2022_Guidelines',         'context',   'WHO Rec 1: intervencoes universais reduzindo riscos psicossociais (conditional rec, 2022).'),
('workload.task-redistribution',       'NR1_2024',                   'context',   'Portaria MTE 1.419/2024 inclui carga excessiva como risco psicossocial obrigatorio no PGR.'),
('workload.structured-breaks',         'WHO2022_Guidelines',         'primary',   'WHO: mudancas em workload/breaks com efeitos pequenos positivos (low certainty).'),
('workload.structured-breaks',         'Bakker2023_JDR',             'secondary', 'Pausas estruturadas reduzem fadiga (recurso) na perspectiva JD-R.'),
('workload.deadline-realism-workshop', 'Cochrane2024_OrgHealthcare', 'primary',   'STRONG evidence para Job and Task Modifications (Kida 2024).'),
('workload.deadline-realism-workshop', 'Bakker2023_JDR',             'secondary', 'Calibracao de demandas e recurso central no JD-R.'),
('workload.deadline-realism-workshop', 'WHO2022_Guidelines',         'context',   'WHO destaca demandas excessivas como fator de risco para depressao e ansiedade.'),
('workload.process-automation',        'Cochrane2024_OrgHealthcare', 'primary',   'Job and Task Modifications - STRONG evidence reducao de burnout.'),
('workload.process-automation',        'Bakker2023_JDR',             'secondary', 'Automatizacao reduz demandas cognitivas (JD-R).'),
('workload.time-management-training',  'WHO2022_Guidelines',         'primary',   'WHO Rec 7: treinamento de trabalhadores - conditional rec, low certainty.'),
('workload.time-management-training',  'Bakker2023_JDR',             'secondary', 'Treinamento aumenta auto-eficacia (recurso pessoal) no JD-R.'),
-- leadership
('leadership.development-program',     'WHO2022_Guidelines',         'primary',   'WHO Rec 4: Manager training for mental health - STRONG recommendation, MODERATE certainty. ROI documentado: GBP 9.98 por GBP 1 investido.'),
('leadership.development-program',     'TransfLeadership2023',       'primary',   'Meta-analise: lideranca transformacional associada a menor burnout e mais satisfacao.'),
('leadership.development-program',     'Edmondson2023_PsychSafety',  'secondary', 'Lideranca constroi seguranca psicologica como capacidade de equipe.'),
('leadership.weekly-1on1',             'Edmondson2023_PsychSafety',  'primary',   '1:1 estruturado cria espaco de seguranca psicologica para feedback ascendente.'),
('leadership.weekly-1on1',             'Gallup_Q12_2020',            'secondary', 'Gallup Q12: relacionamento gestor-funcionario e preditor #1 de engajamento.'),
('leadership.weekly-1on1',             'WHO2022_Guidelines',         'context',   'Manager training (Rec 4-5): apoio individual no trabalho.'),
('leadership.360-evaluation',          'TransfLeadership2023',       'primary',   'Avaliacao 360 identifica gaps de lideranca; combinada com desenvolvimento, reduz burnout (Inceoglu 2022).'),
('leadership.360-evaluation',          'WHO2022_Guidelines',         'secondary', 'Manager training - moderate evidence (WHO Rec 4).'),
('leadership.feedback-channel',        'Edmondson2023_PsychSafety',  'primary',   'Canal de feedback e mecanismo central de seguranca psicologica organizacional.'),
('leadership.feedback-channel',        'TransfLeadership2023',       'secondary', 'Lideranca transformacional inclui consideracao individualizada e feedback ascendente.'),
-- social
('social.team-integration-events',     'Ryan2022_SDT',               'primary',   'SDT: vinculo (relatedness) e necessidade psicologica basica.'),
('social.team-integration-events',     'Bakker2023_JDR',             'secondary', 'Apoio social e recurso central no JD-R model.'),
('social.buddy-program',               'Ryan2022_SDT',               'primary',   'Vinculo e necessidade basica; buddy supre essa necessidade na entrada.'),
('social.buddy-program',               'Bakker2023_JDR',             'secondary', 'Buddy program e fonte de apoio social (recurso) para novos colaboradores.'),
('social.peer-recognition-platform',   'Ryan2022_SDT',               'primary',   'Reconhecimento entre pares atende competencia + vinculo (SDT).'),
('social.peer-recognition-platform',   'Gallup_Q12_2020',            'secondary', 'Q12 inclui "alguem me elogiou esta semana" como driver de engajamento.'),
-- recognition
('recognition.formal-program',         'Gallup_Q12_2020',            'primary',   'Meta-analise Gallup Q12: reconhecimento e top driver de engajamento. Top quartil: 18% menos turnover, 23% mais lucratividade.'),
('recognition.formal-program',         'Ryan2022_SDT',               'secondary', 'Reconhecimento formal atende competencia (SDT).'),
('recognition.formal-program',         'Maslach2016_Burnout',        'context',   'Recompensa e uma das 6 areas de desajuste do burnout (Maslach 2016).'),
('recognition.salary-benchmark',       'Bakker2023_JDR',             'primary',   'Salario competitivo e recurso (job resource) no JD-R model.'),
('recognition.salary-benchmark',       'Gallup_Q12_2020',            'secondary', 'Remuneracao e pre-condicao de engajamento (Gallup Q12).'),
('recognition.salary-benchmark',       'Maslach2016_Burnout',        'context',   'Recompensa insuficiente e gatilho de burnout.'),
('recognition.career-path',            'Ryan2022_SDT',               'primary',   'Plano de carreira atende competencia + autonomia (SDT).'),
('recognition.career-path',            'Bakker2023_JDR',             'secondary', 'Perspectivas de carreira sao recurso central no JD-R.'),
-- autonomy
('autonomy.flexible-hours',            'Wiley2022_FlexibleWork',     'primary',   'Meta-analise: FWA associada a maior satisfacao, comprometimento, autonomia. Reducao de absenteismo (Wheatley 2022).'),
('autonomy.flexible-hours',            'WHO2022_Guidelines',         'primary',   'WHO Rec 1: flexible working arrangements com efeitos pequenos positivos (low certainty).'),
('autonomy.flexible-hours',            'Ryan2022_SDT',               'secondary', 'Autonomia e necessidade psicologica basica; horario flexivel a satisfaz.'),
('autonomy.decision-empowerment',      'Ryan2022_SDT',               'primary',   'Autonomia em decisoes e core do SDT; aumenta motivacao intrinseca.'),
('autonomy.decision-empowerment',      'Bakker2023_JDR',             'secondary', 'Job control reduz strain e burnout (JD-R + Karasek).'),
('autonomy.decision-empowerment',      'WHO2022_Guidelines',         'context',   'WHO: baixo job control associado a sintomas de saude mental (Annex 4).'),
('autonomy.individual-development-plan','Ryan2022_SDT',              'primary',   'Competencia (SDT): PDI estrutura crescimento auto-determinado.'),
('autonomy.individual-development-plan','Bakker2023_JDR',            'secondary', 'Oportunidades de desenvolvimento sao recursos no JD-R.'),
-- meaning
('meaning.purpose-connection',         'Bakker2023_JDR',             'primary',   'Significado e recurso central na atualizacao do JD-R 2023.'),
('meaning.purpose-connection',         'Ryan2022_SDT',               'secondary', 'Vinculo com proposito atende relatedness com missao organizacional.'),
('meaning.pulse-surveys',              'WHO2022_Guidelines',         'primary',   'WHO Rec 1: monitoramento e intervencoes participativas.'),
('meaning.pulse-surveys',              'Burr2019_COPSOQ3',           'secondary', 'COPSOQ III valida instrumentos curtos para monitoramento continuo de psicossocial.'),
-- burnout
('burnout.teleterapia-b2b',            'WHO2016_ROI',                'primary',   'OMS: US$1 investido em tratamento de depressao/ansiedade = US$4 de retorno.'),
('burnout.teleterapia-b2b',            'JMIR2025_Digital',           'primary',   'Meta-analise 2025: intervencoes digitais (TCC online, mindfulness) com efeitos pequenos a moderados.'),
('burnout.teleterapia-b2b',            'Maslach2016_Burnout',        'secondary', 'Apoio a saude mental aborda exaustao emocional, dimensao central do burnout.'),
('burnout.teleterapia-b2b',            'INSS2026',                   'context',   'Brasil 2025: 546.254 beneficios por transtornos mentais (+15,66% vs 2024). F41 (ansiedade) 166k. Urgencia.'),
('burnout.digital-disconnect-policy',  'WHO2022_Guidelines',         'primary',   'WHO: longas jornadas e shift work associadas a sintomas depressivos e ideacao suicida.'),
('burnout.digital-disconnect-policy',  'Bakker2023_JDR',             'secondary', 'Desconexao digital reduz spillover trabalho-vida (recurso no JD-R).'),
('burnout.digital-disconnect-policy',  'Maslach2016_Burnout',        'secondary', 'Sobrecarga e principal causa de burnout; desconexao reduz exposicao continuada.'),
('burnout.early-signal-monitoring',    'Maslach2016_Burnout',        'primary',   'Modelo MBI: detectar exaustao precoce permite intervir antes da despersonalizacao.'),
('burnout.early-signal-monitoring',    'WHO2022_Guidelines',         'secondary', 'WHO Rec 4: treinar managers para reconhecer e responder a sinais.'),
('burnout.early-signal-monitoring',    'INSS2026',                   'context',   'F41 e F33 lideram afastamentos; deteccao precoce e prioridade.'),
('burnout.workplace-fitness-program',  'WHO2016_ROI',                'primary',   'Programas de bem-estar tem ROI 4:1 (OMS 2016).'),
('burnout.workplace-fitness-program',  'WHO2022_Guidelines',         'secondary', 'WHO Rec 6: intervencoes individuais (atividade fisica) - moderate evidence.'),
-- communication
('communication.monthly-town-halls',   'Edmondson2023_PsychSafety',  'primary',   'Seguranca psicologica e construida por comunicacao transparente e bidirecional.'),
('communication.monthly-town-halls',   'TransfLeadership2023',       'secondary', 'Lideranca transformacional inclui comunicacao inspiradora e visao compartilhada.'),
('communication.role-clarification-raci','WHO2022_Guidelines',       'primary',   'WHO Annex 4: ambiguidade de papel e conflito associados a sintomas depressivos.'),
('communication.role-clarification-raci','Bakker2023_JDR',           'secondary', 'Clareza de papel reduz demandas cognitivas e role ambiguity (JD-R).'),
('communication.bidirectional-feedback','Edmondson2023_PsychSafety', 'primary',   'Feedback bidirecional e mecanismo central de seguranca psicologica.'),
('communication.bidirectional-feedback','Gallup_Q12_2020',           'secondary', 'Q12: "supervisor se preocupa comigo" e top item.'),
-- security
('security.transparent-communication', 'Edmondson2023_PsychSafety',  'primary',   'Comunicacao transparente em incerteza reduz ansiedade e mantem confianca.'),
('security.transparent-communication', 'WHO2022_Guidelines',         'secondary', 'WHO: inseguranca laboral associada a sintomas depressivos.'),
('security.talent-retention-plan',     'Gallup_Q12_2020',            'primary',   'Top quartil de engajamento: 18% menos turnover (Gallup Q12 2020).'),
('security.talent-retention-plan',     'Bakker2023_JDR',             'secondary', 'Planos de retencao sao recursos organizacionais (JD-R).'),
('security.work-life-balance',         'Wiley2022_FlexibleWork',     'primary',   'FWA reduz conflito trabalho-familia e melhora satisfacao com a vida.'),
('security.work-life-balance',         'WHO2022_Guidelines',         'secondary', 'WHO Annex 4: work-family conflict associado a uso de psicotropicos.'),
('security.work-life-balance',         'Ryan2022_SDT',               'context',   'Autonomia sobre tempo proprio satisfaz necessidade basica.'),
-- offensive
('offensive.anti-harassment-channel',  'Frontiers2020_Bullying',     'primary',   'RCT de intervencao anti-bullying com protocolo estruturado (Gillen 2020).'),
('offensive.anti-harassment-channel',  'WHO2022_Guidelines',         'secondary', 'WHO Annex 4: workplace bullying associado a depressao, ansiedade e stress.'),
('offensive.anti-harassment-channel',  'Lei14831_2024',              'context',   'Lei 14.831/2024 - requisito de canal de denuncia para selo Empresa Promotora.'),
('offensive.mandatory-compliance-training','Frontiers2020_Bullying', 'primary',   'Treinamento + intervencao reduz incidentes em RCT (Gillen 2020).'),
('offensive.mandatory-compliance-training','Lei14831_2024',          'context',   'Lei 14.831/2024 exige acoes de prevencao para certificacao.'),
('offensive.mandatory-compliance-training','NR1_2024',               'context',   'NR-1 Portaria 1.419/2024 inclui assedio como risco psicossocial obrigatorio.'),
('offensive.rapid-investigation-protocol','Frontiers2020_Bullying',  'primary',   'Intervencao anti-bullying: protocolo de investigacao rapida e chave (Gillen 2020).'),
('offensive.rapid-investigation-protocol','LGPD',                    'context',   'LGPD Art. 18: titular tem direito a resposta sobre tratamento de dados.')
) AS iv(intervention_id, citation_key, relevance, specific_claim)
JOIN refs r ON r.citation_key = iv.citation_key;

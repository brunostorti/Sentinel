-- Migration 024: COPSOQ II — versão portuguesa oficial
--
-- A versão do COPSOQ II que estava no banco não era a versão portuguesa validada:
-- 51 perguntas não existiam no manual, 42 perguntas oficiais faltavam (inclusive as 2
-- que devem ser invertidas) e havia dimensões que não fazem parte da versão portuguesa
-- (Vitalidade, Saúde mental, Confiança na gestão, Justiça organizacional).
--
-- Fonte: Silva, C. F. et al. Copenhagen Psychosocial Questionnaire – COPSOQ: Portugal e
-- países africanos de língua oficial portuguesa. Universidade de Aveiro (manual
-- COPSOQ-Manual-Portugal2013.pdf, rede COPSOQ). Textos copiados dos questionários do
-- anexo; dimensão de cada pergunta pela "versão com designação das subescalas".
-- Gerado por script a partir do texto do manual, com conferências automáticas.
--
-- O que muda:
-- 1. A versão anterior é arquivada (código copsoq_ii_legado, inativa). Pesquisas e
--    respostas existentes continuam ligadas a ela e funcionando.
-- 2. Nova versão oficial com o código copsoq_ii: 41 perguntas na curta,
--    76 na média e 119 na longa (26/29/35 dimensões); 122 linhas,
--    porque 3 perguntas têm redação própria na curta/média.
-- 3. Perguntas invertidas conforme o manual: "Os funcionários confiam uns nos outros de
--    um modo geral?" e "A gerência oculta informação aos seus funcionários?".
-- 4. Formatos de resposta do manual (frequência, intensidade e saúde geral).
-- 5. Médias nacionais de referência (Tabela 3 do manual, versão média, N = 4.162, escala
--    1 a 5) gravadas nas dimensões.
--
-- Perguntas com enunciado de bloco no manual (ex.: "Com que frequência, durante as
-- últimas 4 semanas, sentiu… Cansado?") recebem o enunciado no próprio texto, porque o
-- formulário mostra uma pergunta por vez.

-- 1. Valores de referência nacionais nas dimensões
ALTER TABLE public.questionnaire_scales
  ADD COLUMN IF NOT EXISTS reference_mean numeric(4,2),
  ADD COLUMN IF NOT EXISTS reference_sd numeric(4,2),
  ADD COLUMN IF NOT EXISTS reference_source text;

COMMENT ON COLUMN public.questionnaire_scales.reference_mean IS
  'Média de referência publicada pelo autor do instrumento (na escala original, ex.: 1 a 5 no COPSOQ II PT).';
COMMENT ON COLUMN public.questionnaire_scales.reference_sd IS
  'Desvio-padrão de referência publicado pelo autor do instrumento (mesma escala de reference_mean).';

-- 2. Formato de resposta da saúde geral, na ordem do manual (cotação direta: Excelente = 1)
INSERT INTO public.response_formats (code, name, options)
VALUES (
  'copsoq2_pt_health',
  'Saúde geral — COPSOQ II PT (5 pontos)',
  '[{"label":"Excelente","value":0},{"label":"Muito boa","value":25},{"label":"Boa","value":50},{"label":"Razoável","value":75},{"label":"Deficitária","value":100}]'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- 3. Arquiva a versão anterior
UPDATE public.questionnaire_instruments
SET code = 'copsoq_ii_legado',
    name = 'COPSOQ II — versão anterior (não oficial, arquivada)',
    is_active = false
WHERE code = 'copsoq_ii';

-- 4. Instrumento oficial
INSERT INTO public.questionnaire_instruments (code, name, description, version_label, source, total_questions, estimated_minutes, is_active)
VALUES (
  'copsoq_ii',
  'COPSOQ II — Versão Portuguesa',
  'Questionário Psicossocial de Copenhaga, versão portuguesa validada (N = 4.162). Versões curta (41 perguntas), média (76) e longa (119).',
  '2013',
  'Silva, C. F. et al. Copenhagen Psychosocial Questionnaire – COPSOQ: Portugal e países africanos de língua oficial portuguesa. Universidade de Aveiro.',
  119,
  25,
  true
);

-- 5. Dimensões (35)
INSERT INTO public.questionnaire_scales
  (name, category, scoring_direction, short_version, medium_version, long_version, instrument_id, universal_category_id, display_order, reference_mean, reference_sd, reference_source)
SELECT v.name, v.category, v.dir::public.scoring_direction, v.c, v.m, v.l, i.id, u.id, v.ord, v.ref_mean, v.ref_sd,
       CASE WHEN v.ref_mean IS NULL THEN NULL
            ELSE 'Manual COPSOQ II PT (Silva et al.), Tabela 3: versão média, N = 4.162, escala 1 a 5' END
FROM (VALUES
    ('Exigências quantitativas', 'Exigências no Trabalho', 'HIGH_IS_RISK', 'workload', true, true, true, 1, 2.48, 0.86),
    ('Ritmo de trabalho', 'Exigências no Trabalho', 'HIGH_IS_RISK', 'workload', true, true, true, 2, 3.18, 1.00),
    ('Exigências cognitivas', 'Exigências no Trabalho', 'HIGH_IS_RISK', 'workload', true, true, true, 3, 3.79, 0.71),
    ('Exigências emocionais', 'Exigências no Trabalho', 'HIGH_IS_RISK', 'workload', true, true, true, 4, 3.42, 1.15),
    ('Exigências para esconder emoções', 'Exigências no Trabalho', 'HIGH_IS_RISK', 'workload', false, false, true, 5, NULL, NULL),
    ('Influência no trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', true, true, true, 6, 2.83, 0.89),
    ('Possibilidades de desenvolvimento', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', true, true, true, 7, 3.85, 0.81),
    ('Variação no trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', false, false, true, 8, NULL, NULL),
    ('Significado do trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'meaning', true, true, true, 9, 4.03, 0.72),
    ('Compromisso face ao local de trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'meaning', true, true, true, 10, 3.40, 0.90),
    ('Previsibilidade', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'communication', true, true, true, 11, 3.23, 0.92),
    ('Recompensas (reconhecimento)', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'recognition', true, true, true, 12, 3.71, 0.87),
    ('Transparência do papel laboral', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'communication', true, true, true, 13, 4.19, 0.72),
    ('Conflitos laborais', 'Relações Sociais e Liderança', 'HIGH_IS_RISK', 'communication', false, true, true, 14, 2.94, 0.69),
    ('Qualidade da liderança', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'leadership', true, true, true, 15, 3.49, 0.93),
    ('Apoio social de superiores', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'leadership', true, true, true, 16, 3.13, 0.97),
    ('Apoio social de colegas', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'social', false, true, true, 17, 3.44, 0.77),
    ('Insegurança laboral', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'security', true, true, true, 18, 3.13, 1.47),
    ('Satisfação no trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_FAVORABLE', 'meaning', true, true, true, 19, 3.37, 0.75),
    ('Conflito trabalho/família', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'security', true, true, true, 20, 2.67, 1.05),
    ('Conflito família/trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'security', false, false, true, 21, NULL, NULL),
    ('Confiança vertical', 'Valores no Local de Trabalho', 'HIGH_IS_FAVORABLE', 'recognition', true, true, true, 22, 3.60, 0.60),
    ('Confiança horizontal', 'Valores no Local de Trabalho', 'HIGH_IS_RISK', 'social', false, true, true, 23, 2.79, 0.64),
    ('Justiça e respeito', 'Valores no Local de Trabalho', 'HIGH_IS_FAVORABLE', 'recognition', true, true, true, 24, 3.37, 0.81),
    ('Comunidade social no trabalho', 'Valores no Local de Trabalho', 'HIGH_IS_FAVORABLE', 'social', true, true, true, 25, 3.97, 0.81),
    ('Responsabilidade social', 'Valores no Local de Trabalho', 'HIGH_IS_FAVORABLE', 'recognition', false, false, true, 26, NULL, NULL),
    ('Auto-eficácia', 'Personalidade', 'HIGH_IS_FAVORABLE', 'burnout', true, true, true, 27, 3.90, 0.67),
    ('Saúde geral', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', true, true, true, 28, 3.44, 0.91),
    ('Stress', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', true, true, true, 29, 2.70, 0.90),
    ('Burnout', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', true, true, true, 30, 2.70, 0.97),
    ('Problemas em dormir', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', true, true, true, 31, 2.46, 1.05),
    ('Stress somático', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', false, false, true, 32, NULL, NULL),
    ('Stress cognitivo', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', false, false, true, 33, NULL, NULL),
    ('Sintomas depressivos', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', true, true, true, 34, 2.35, 0.91),
    ('Comportamentos ofensivos', 'Comportamentos Ofensivos', 'HIGH_IS_RISK', 'offensive', true, true, true, 35, 1.23, 0.48)
) AS v(name, category, dir, ucode, c, m, l, ord, ref_mean, ref_sd)
CROSS JOIN (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_ii') AS i
JOIN public.universal_categories u ON u.code = v.ucode;

-- 6. Perguntas (122)
INSERT INTO public.questionnaire_items
  (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version, instrument_id, response_format_id)
SELECT s.id, v.text, v.inv, v.ord, v.c, v.m, v.l, s.instrument_id, f.id
FROM (VALUES
    ('Exigências quantitativas', 'A sua carga de trabalho acumula-se por ser mal distribuída?', false, 10, true, true, true, 'likert_frequency_5'),
    ('Exigências quantitativas', 'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?', false, 20, true, true, true, 'likert_frequency_5'),
    ('Exigências quantitativas', 'Precisa fazer horas-extra?', false, 30, false, true, true, 'likert_frequency_5'),
    ('Ritmo de trabalho', 'Precisa trabalhar muito rapidamente?', false, 40, true, true, true, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho exige a sua atenção constante?', false, 50, true, true, true, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho requer que seja bom a propor novas ideias?', false, 60, false, true, true, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho exige que tome decisões difíceis?', false, 70, true, true, true, 'likert_frequency_5'),
    ('Exigências emocionais', 'O seu trabalho coloca-o em situações emocionalmente perturbadoras?', false, 80, false, false, true, 'likert_frequency_5'),
    ('Exigências emocionais', 'O seu trabalho exige emocionalmente de si?', false, 90, true, true, true, 'likert_frequency_5'),
    ('Exigências emocionais', 'Sente-se emocionalmente envolvido com o seu trabalho?', false, 100, false, false, true, 'likert_frequency_5'),
    ('Exigências para esconder emoções', 'O seu trabalho requer que não manifeste a sua opinião?', false, 110, false, false, true, 'likert_frequency_5'),
    ('Exigências para esconder emoções', 'O seu trabalho requer que esconda os seus sentimentos?', false, 120, false, false, true, 'likert_frequency_5'),
    ('Exigências para esconder emoções', 'É-lhe exigido que trate todas as pessoas de forma igual embora não se sinta satisfeito com isso?', false, 130, false, false, true, 'likert_frequency_5'),
    ('Exigências para esconder emoções', 'É-lhe exigido que seja simpático com todos, embora sinta que o mesmo não lhe é retribuído?', false, 140, false, false, true, 'likert_frequency_5'),
    ('Influência no trabalho', 'Tem um elevado grau de influência no seu trabalho?', false, 150, true, true, true, 'likert_frequency_5'),
    ('Influência no trabalho', 'Participa na escolha das pessoas com quem trabalha?', false, 160, false, true, true, 'likert_frequency_5'),
    ('Influência no trabalho', 'Pode influenciar a quantidade de trabalho que lhe compete a si?', false, 170, false, true, true, 'likert_frequency_5'),
    ('Influência no trabalho', 'Tem alguma influência sobre o tipo de tarefas que faz?', false, 180, false, true, true, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho exige que tenha iniciativa?', false, 190, true, true, true, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho permite-lhe aprender coisas novas?', false, 200, true, true, true, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho permite-lhe usar as suas habilidades ou perícias?', false, 210, false, true, true, 'likert_frequency_5'),
    ('Variação no trabalho', 'O seu trabalho é variado?', false, 220, false, false, true, 'likert_frequency_5'),
    ('Previsibilidade', 'No seu local de trabalho, é informado com antecedência sobre decisões importantes, mudanças ou planos para o futuro?', false, 230, true, true, true, 'likert_frequency_5'),
    ('Previsibilidade', 'Recebe toda a informação de que necessita para fazer bem o seu trabalho?', false, 240, true, true, true, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'O seu trabalho apresenta objectivos claros?', false, 250, false, true, true, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'Sabe exactamente quais as suas responsabilidades?', false, 260, true, true, true, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'Sabe exactamente o que é esperado de si?', false, 270, false, true, true, 'likert_frequency_5'),
    ('Recompensas (reconhecimento)', 'O seu trabalho é reconhecido e apreciado pela gerência?', false, 280, true, true, true, 'likert_frequency_5'),
    ('Recompensas (reconhecimento)', 'Há boas perspectivas no seu emprego?', false, 290, false, false, true, 'likert_frequency_5'),
    ('Recompensas (reconhecimento)', 'A gerência do seu local de trabalho respeita-o?', false, 300, false, true, true, 'likert_frequency_5'),
    ('Recompensas (reconhecimento)', 'É tratado de forma justa no seu local de trabalho?', false, 310, true, true, true, 'likert_frequency_5'),
    ('Conflitos laborais', 'Faz coisas no seu trabalho que uns concordam mas outros não?', false, 320, false, true, true, 'likert_frequency_5'),
    ('Conflitos laborais', 'No seu trabalho são-lhe colocadas exigências contraditórias?', false, 330, false, false, true, 'likert_frequency_5'),
    ('Conflitos laborais', 'Por vezes tem que fazer coisas que deveriam ser feitas de outra maneira?', false, 340, false, true, true, 'likert_frequency_5'),
    ('Conflitos laborais', 'Por vezes tem que fazer coisas que considera desnecessárias?', false, 350, false, true, true, 'likert_frequency_5'),
    ('Apoio social de colegas', 'Com que frequência tem ajuda e apoio dos seus colegas de trabalho?', false, 360, false, true, true, 'likert_frequency_5'),
    ('Apoio social de colegas', 'Com que frequência os seus colegas estão dispostos a ouvi-lo(a) sobre os seus problemas de trabalho?', false, 370, false, true, true, 'likert_frequency_5'),
    ('Apoio social de colegas', 'Com que frequência os seus colegas falam consigo acerca do seu desempenho laboral?', false, 380, false, true, true, 'likert_frequency_5'),
    ('Apoio social de superiores', 'Com que frequência o seu superior imediato fala consigo sobre como está a decorrer o seu trabalho?', false, 390, false, true, true, 'likert_frequency_5'),
    ('Apoio social de superiores', 'Com que frequência tem ajuda e apoio do seu superior imediato?', false, 400, true, true, true, 'likert_frequency_5'),
    ('Apoio social de superiores', 'Com que frequência é que o seu superior imediato fala consigo em relação ao seu desempenho laboral?', false, 410, false, true, true, 'likert_frequency_5'),
    ('Comunidade social no trabalho', 'Existe um bom ambiente de trabalho entre si e os seus colegas?', false, 420, true, true, true, 'likert_frequency_5'),
    ('Comunidade social no trabalho', 'Existe uma boa cooperação entre os colegas de trabalho?', false, 430, false, true, true, 'likert_frequency_5'),
    ('Comunidade social no trabalho', 'No seu local de trabalho sente-se parte de uma comunidade?', false, 440, false, true, true, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… Oferece aos indivíduos e ao grupo boas oportunidades de desenvolvimento?', false, 450, true, true, true, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… Dá prioridade à satisfação no trabalho?', false, 460, false, true, true, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… É bom no planeamento do trabalho?', false, 470, true, true, true, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… É bom a resolver conflitos?', false, 480, false, true, true, 'likert_frequency_5'),
    ('Confiança horizontal', 'Os funcionários ocultam informações uns dos outros?', false, 490, false, true, true, 'likert_frequency_5'),
    ('Confiança horizontal', 'Os funcionários ocultam informação à gerência?', false, 500, false, true, true, 'likert_frequency_5'),
    ('Confiança horizontal', 'Os funcionários confiam uns nos outros de um modo geral?', true, 510, false, true, true, 'likert_frequency_5'),
    ('Confiança vertical', 'A gerência confia nos seus funcionários para fazerem o seu trabalho bem?', false, 520, true, true, true, 'likert_frequency_5'),
    ('Confiança vertical', 'Confia na informação que lhe é transmitida pela gerência?', false, 530, true, true, true, 'likert_frequency_5'),
    ('Confiança vertical', 'A gerência oculta informação aos seus funcionários?', true, 540, false, true, true, 'likert_frequency_5'),
    ('Justiça e respeito', 'Os conflitos são resolvidos de uma forma justa?', false, 550, true, true, true, 'likert_frequency_5'),
    ('Justiça e respeito', 'Os funcionários são apreciados quando fazem um bom trabalho?', false, 560, false, false, true, 'likert_frequency_5'),
    ('Justiça e respeito', 'As sugestões dos funcionários são tratadas de forma séria pela gerência?', false, 570, false, true, true, 'likert_frequency_5'),
    ('Justiça e respeito', 'O trabalho é igualmente distribuído pelos funcionários?', false, 580, true, true, true, 'likert_frequency_5'),
    ('Responsabilidade social', 'Os homens e as mulheres são tratados da mesma forma?', false, 590, false, false, true, 'likert_frequency_5'),
    ('Responsabilidade social', 'Existe lugar para funcionários de diferentes raças e religiões?', false, 600, false, false, true, 'likert_frequency_5'),
    ('Responsabilidade social', 'Existe lugar para funcionários com doenças ou deficiências?', false, 610, false, false, true, 'likert_frequency_5'),
    ('Responsabilidade social', 'Existe lugar para funcionários da terceira idade?', false, 620, false, false, true, 'likert_frequency_5'),
    ('Significado do trabalho', 'O seu trabalho tem significado?', false, 630, false, false, true, 'likert_extent_5'),
    ('Significado do trabalho', 'O seu trabalho tem algum significado para si?', false, 635, true, true, false, 'likert_extent_5'),
    ('Significado do trabalho', 'Sente que o seu trabalho é importante?', false, 640, true, true, true, 'likert_extent_5'),
    ('Significado do trabalho', 'Sente-se motivado e envolvido com o seu trabalho?', false, 650, false, true, true, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'Gosta de falar com os outros sobre o seu local de trabalho?', false, 660, false, true, true, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'Sente que os problemas do seu local de trabalho são seus também?', false, 670, true, true, true, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'O seu local de trabalho é de grande importância pessoal para si?', false, 680, false, false, true, 'likert_extent_5'),
    ('Satisfação no trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… As suas perspectivas de trabalho?', false, 690, false, true, true, 'likert_extent_5'),
    ('Satisfação no trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… As condições físicas do seu local de trabalho?', false, 700, false, true, true, 'likert_extent_5'),
    ('Satisfação no trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… A forma como as suas capacidades são utilizadas?', false, 710, false, true, true, 'likert_extent_5'),
    ('Satisfação no trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… O seu trabalho de uma forma global?', false, 720, false, true, true, 'likert_extent_5'),
    ('Satisfação no trabalho', 'Quão satisfeito está com o seu trabalho de uma forma global?', false, 725, true, false, false, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado com… Ficar desempregado?', false, 730, false, false, true, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado em ficar desempregado?', false, 735, true, true, false, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado com… Que uma nova tecnologia o torne dispensável?', false, 740, false, false, true, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado com… Dificuldade em conseguir outro trabalho caso ficasse desempregado?', false, 750, false, false, true, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado com… Ser transferido para outro local de trabalho contra a sua vontade?', false, 760, false, false, true, 'likert_extent_5'),
    ('Saúde geral', 'Em geral, sente que a sua saúde é:', false, 770, true, true, true, 'copsoq2_pt_health'),
    ('Conflito trabalho/família', 'Sente que o seu trabalho lhe exige muita energia que acaba por afectar a sua vida privada negativamente?', false, 780, true, true, true, 'likert_extent_5'),
    ('Conflito trabalho/família', 'Sente que o seu trabalho lhe exige muito tempo que acaba por afectar a sua vida privada negativamente?', false, 790, true, true, true, 'likert_extent_5'),
    ('Conflito trabalho/família', 'A sua família e os seus amigos dizem-lhe que trabalha demais?', false, 800, false, true, true, 'likert_extent_5'),
    ('Conflito família/trabalho', 'Sente que a sua vida privada lhe exige muita energia e que acaba por afectar o seu trabalho negativamente?', false, 810, false, false, true, 'likert_extent_5'),
    ('Conflito família/trabalho', 'Sente que a sua vida privada lhe exige muito tempo e que acaba por afectar o seu trabalho negativamente?', false, 820, false, false, true, 'likert_extent_5'),
    ('Problemas em dormir', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldade a adormecer?', false, 830, false, true, true, 'likert_frequency_5'),
    ('Problemas em dormir', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dormiu mal e de forma sobressaltada?', false, 840, false, false, true, 'likert_frequency_5'),
    ('Problemas em dormir', 'Com que frequência, durante as últimas 4 semanas, sentiu… Acordou demasiado cedo e depois teve dificuldade em adormecer novamente?', false, 850, false, false, true, 'likert_frequency_5'),
    ('Problemas em dormir', 'Com que frequência, durante as últimas 4 semanas, sentiu… Acordou várias vezes durante a noite e depois não conseguia adormecer novamente?', false, 860, true, true, true, 'likert_frequency_5'),
    ('Burnout', 'Com que frequência, durante as últimas 4 semanas, sentiu… Cansado?', false, 870, false, false, true, 'likert_frequency_5'),
    ('Burnout', 'Com que frequência, durante as últimas 4 semanas, sentiu… Esgotado?', false, 880, false, false, true, 'likert_frequency_5'),
    ('Burnout', 'Com que frequência, durante as últimas 4 semanas, sentiu… Fisicamente exausto?', false, 890, true, true, true, 'likert_frequency_5'),
    ('Burnout', 'Com que frequência, durante as últimas 4 semanas, sentiu… Emocionalmente exausto?', false, 900, true, true, true, 'likert_frequency_5'),
    ('Stress', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldades em relaxar?', false, 910, false, false, true, 'likert_frequency_5'),
    ('Stress', 'Com que frequência, durante as últimas 4 semanas, sentiu… Irritado?', false, 920, true, true, true, 'likert_frequency_5'),
    ('Stress', 'Com que frequência, durante as últimas 4 semanas, sentiu… Tenso?', false, 930, false, false, true, 'likert_frequency_5'),
    ('Stress', 'Com que frequência, durante as últimas 4 semanas, sentiu… Ansioso?', false, 940, true, true, true, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Com que frequência, durante as últimas 4 semanas, sentiu… Triste?', false, 950, true, true, true, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Com que frequência, durante as últimas 4 semanas, sentiu… Falta de auto-confiança?', false, 960, false, false, true, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Com que frequência, durante as últimas 4 semanas, sentiu… Peso na consciência ou sentimento de culpa?', false, 970, false, false, true, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Com que frequência, durante as últimas 4 semanas, sentiu… Falta de interesse por coisas quotidianas?', false, 980, false, true, true, 'likert_frequency_5'),
    ('Stress somático', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dores de barriga?', false, 990, false, false, true, 'likert_frequency_5'),
    ('Stress somático', 'Com que frequência, durante as últimas 4 semanas, sentiu… Aperto ou dor no peito?', false, 1000, false, false, true, 'likert_frequency_5'),
    ('Stress somático', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dores de cabeça?', false, 1010, false, false, true, 'likert_frequency_5'),
    ('Stress somático', 'Com que frequência, durante as últimas 4 semanas, sentiu… Palpitações?', false, 1020, false, false, true, 'likert_frequency_5'),
    ('Stress somático', 'Com que frequência, durante as últimas 4 semanas, sentiu… Tensão em vários músculos?', false, 1030, false, false, true, 'likert_frequency_5'),
    ('Stress cognitivo', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldade em concentrar-se?', false, 1040, false, false, true, 'likert_frequency_5'),
    ('Stress cognitivo', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldade em tomar decisões?', false, 1050, false, false, true, 'likert_frequency_5'),
    ('Stress cognitivo', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldade em lembrar-se de algo?', false, 1060, false, false, true, 'likert_frequency_5'),
    ('Stress cognitivo', 'Com que frequência, durante as últimas 4 semanas, sentiu… Dificuldade em pensar claramente?', false, 1070, false, false, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'Sou sempre capaz de resolver problemas, se tentar o suficiente.', false, 1080, true, true, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'Mesmo que as pessoas trabalhem contra mim, encontro sempre forma de atingir o que pretendo.', false, 1090, false, false, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'É-me fácil seguir os meus planos e atingir os meus objectivos.', false, 1100, false, true, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'Sinto-me confiante em lidar com acontecimentos inesperados.', false, 1110, false, false, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'Quando tenho um problema, usualmente tenho várias maneiras de lidar com o mesmo.', false, 1120, false, false, true, 'likert_frequency_5'),
    ('Auto-eficácia', 'Independentemente do que acontecer, costumo encontrar soluções para os meus problemas.', false, 1130, false, false, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem-se envolvido em conflitos ou discussões?', false, 1140, false, false, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem sido alvo de rumores ou calúnias?', false, 1150, false, false, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem sido alvo de insultos ou provocações verbais?', false, 1160, true, true, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem sido exposto a assédio sexual indesejado?', false, 1170, true, true, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem sido exposto a ameaças de violência?', false, 1180, true, true, true, 'likert_frequency_5'),
    ('Comportamentos ofensivos', 'Nos últimos 12 meses, no seu local de trabalho: Tem sido exposto a violência física?', false, 1190, true, true, true, 'likert_frequency_5')
) AS v(scale, text, inv, ord, c, m, l, fmt)
JOIN public.questionnaire_scales s
  ON s.name = v.scale
 AND s.instrument_id = (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_ii')
JOIN public.response_formats f ON f.code = v.fmt;

-- 7. Conferências: se qualquer número não bater, a migração inteira é desfeita
DO $$
DECLARE
  inst uuid := (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_ii');
  n_c int; n_m int; n_l int; n_inv int; n_rows int;
  d_c int; d_m int; d_l int;
BEGIN
  SELECT count(*) FILTER (WHERE short_version), count(*) FILTER (WHERE medium_version),
         count(*) FILTER (WHERE long_version), count(*) FILTER (WHERE is_inverted), count(*)
    INTO n_c, n_m, n_l, n_inv, n_rows
    FROM public.questionnaire_items WHERE instrument_id = inst;
  SELECT count(DISTINCT dimension_id) FILTER (WHERE short_version), count(DISTINCT dimension_id) FILTER (WHERE medium_version),
         count(DISTINCT dimension_id) FILTER (WHERE long_version)
    INTO d_c, d_m, d_l
    FROM public.questionnaire_items WHERE instrument_id = inst;
  IF n_c <> 41 OR n_m <> 76 OR n_l <> 119 OR n_rows <> 122 THEN
    RAISE EXCEPTION 'COPSOQ II: perguntas % / % / % (linhas %), esperado 41 / 76 / 119 (122)', n_c, n_m, n_l, n_rows;
  END IF;
  IF d_c <> 26 OR d_m <> 29 OR d_l <> 35 THEN
    RAISE EXCEPTION 'COPSOQ II: dimensões % / % / %, esperado 26 / 29 / 35', d_c, d_m, d_l;
  END IF;
  IF n_inv <> 2 THEN
    RAISE EXCEPTION 'COPSOQ II: % perguntas invertidas, esperado 2', n_inv;
  END IF;
END $$;


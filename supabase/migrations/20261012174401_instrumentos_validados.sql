-- Instrumentos validados: COPSOQ III (versão portuguesa), JSS (versão brasileira) e
-- OLBI (versão brasileira), cortes de semáforo por escala e categorias corrigidas.
--
-- Fontes (detalhes em docs/instrumentos/2026-10-12-instrumentos.md):
-- • COPSOQ III: Cotrim, T. P. et al. (2022). The Portuguese Third Version of the Copenhagen
--   Psychosocial Questionnaire: preliminary validation studies of the middle version.
--   IJERPH 19(3):1167. Versão reduzida de 85 itens (saem Q20, Q24, Q25, Q68, Q73, Q77,
--   Q80, Q81). Textos da Tabela 1. Formatos e direções na convenção do COPSOQ II
--   português (mesma equipe): exigências, organização e relações em frequência;
--   significado, compromisso, insegurança, qualidade do trabalho, conflito trabalho-
--   família e satisfação em intensidade; saúde geral com a escala do COPSOQ II PT.
--   Itens de saúde com o período "Nas últimas 4 semanas", como no COPSOQ III
--   internacional.
-- • JSS: Spector (1985/1994); versão brasileira de Souza, Milani & Alexandre (2015,
--   RBSO 40(132):219-227), validada por Souza, Alexandre & Guirardello (2017, J Nurs Meas
--   25:46-65). Textos do arquivo do autor (tradução/adaptação de A. C. de Souza, Unicamp).
--   Estrutura e itens invertidos já estavam certos; só os textos mudam.
-- • OLBI: Demerouti & Bakker (2008); versão brasileira de Schuster & Dias (2018,
--   Ciênc. Saúde Coletiva 23(2):553-562), versão final de 13 itens. Escala de 4 pontos
--   (1 discordo plenamente a 4 concordo plenamente). Invertidas as frases positivas.
--   Corrigido o erro de digitação do artigo "venho me desinteressado".
--
-- Cortes de semáforo por escala (cut_low/cut_high, escala 0–100; nulos = tercis do manual
-- COPSOQ): JSS 40/60 (Spector: média por item ≤ 3 insatisfeito, ≥ 4 satisfeito);
-- OLBI exaustão 41,67 e desengajamento 36,67 (Peterson et al., 2008: ≥ 2,25 e ≥ 2,10).
--
-- Instrumentos antigos arquivados (inativos) com as pesquisas e respostas existentes:
-- copsoq_iii_legado e olbi_legado. Todas eram pesquisas de teste.

-- 1. Cortes de semáforo por escala
ALTER TABLE public.questionnaire_scales
  ADD COLUMN IF NOT EXISTS cut_low numeric(5,2),
  ADD COLUMN IF NOT EXISTS cut_high numeric(5,2),
  ADD COLUMN IF NOT EXISTS cut_source text;

COMMENT ON COLUMN public.questionnaire_scales.cut_low IS
  'Corte inferior do semáforo (0-100). Nulo = tercis (100/3). Alto = risco: verde abaixo de cut_low. Alto = favorável: vermelho até cut_low (inclusive).';
COMMENT ON COLUMN public.questionnaire_scales.cut_high IS
  'Corte superior do semáforo (0-100). Nulo = tercis (200/3). Alto = risco: vermelho a partir de cut_high. Alto = favorável: verde a partir de cut_high.';
COMMENT ON COLUMN public.questionnaire_scales.cut_source IS
  'Fonte dos cortes (autor do instrumento).';

-- 2. Formato de resposta do OLBI brasileiro (âncoras do artigo)
INSERT INTO public.response_formats (code, name, options)
VALUES (
  'olbi_br_4',
  'OLBI — versão brasileira (4 pontos)',
  '[{"label":"Discordo plenamente","value":0},{"label":"Discordo","value":33},{"label":"Concordo","value":67},{"label":"Concordo plenamente","value":100}]'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- 3. COPSOQ II: "Conflito trabalho/família" e "Conflito família/trabalho" estavam em
--    "Segurança e Estabilidade"; são exigências que invadem a vida pessoal.
UPDATE public.questionnaire_scales s
SET universal_category_id = (SELECT id FROM public.universal_categories WHERE code = 'workload')
FROM public.questionnaire_instruments i
WHERE s.instrument_id = i.id AND i.code = 'copsoq_ii'
  AND s.name IN ('Conflito trabalho/família', 'Conflito família/trabalho');

-- 4. COPSOQ III: arquiva a versão anterior (origem desconhecida, não validada)
UPDATE public.questionnaire_instruments
SET code = 'copsoq_iii_legado',
    name = 'COPSOQ III — versão anterior (não validada, arquivada)',
    is_active = false
WHERE code = 'copsoq_iii';

INSERT INTO public.questionnaire_instruments (code, name, description, version_label, source, total_questions, estimated_minutes, is_active)
VALUES (
  'copsoq_iii',
  'COPSOQ III — Versão Portuguesa (média)',
  'Questionário Psicossocial de Copenhaga, 3ª versão: versão média portuguesa, 85 perguntas em 31 dimensões. Validação preliminar em Portugal (N = 659); ainda sem valores de referência nacionais.',
  '2022 (média)',
  'Cotrim, T. P. et al. (2022). The Portuguese Third Version of the Copenhagen Psychosocial Questionnaire: Preliminary Validation Studies of the Middle Version among Municipal and Healthcare Workers. IJERPH, 19(3), 1167. doi:10.3390/ijerph19031167',
  85,
  20,
  true
);

INSERT INTO public.questionnaire_scales
  (name, category, scoring_direction, short_version, medium_version, long_version, instrument_id, universal_category_id, display_order)
SELECT v.name, v.category, v.dir::public.scoring_direction, true, true, true, i.id, u.id, v.ord
FROM (VALUES
    ('Exigências quantitativas', 'Exigências Laborais', 'HIGH_IS_RISK', 'workload', 1),
    ('Ritmo de trabalho', 'Exigências Laborais', 'HIGH_IS_RISK', 'workload', 2),
    ('Exigências cognitivas', 'Exigências Laborais', 'HIGH_IS_RISK', 'workload', 3),
    ('Exigências emocionais', 'Exigências Laborais', 'HIGH_IS_RISK', 'workload', 4),
    ('Influência no trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', 5),
    ('Possibilidades de desenvolvimento', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', 6),
    ('Controlo sobre o tempo de trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'autonomy', 7),
    ('Significado do trabalho', 'Organização do Trabalho e Conteúdo', 'HIGH_IS_FAVORABLE', 'meaning', 8),
    ('Compromisso face ao local de trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_FAVORABLE', 'meaning', 9),
    ('Previsibilidade', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'communication', 10),
    ('Reconhecimento', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'recognition', 11),
    ('Transparência do papel laboral', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'communication', 12),
    ('Conflito de papéis laborais', 'Relações Sociais e Liderança', 'HIGH_IS_RISK', 'communication', 13),
    ('Qualidade da liderança', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'leadership', 14),
    ('Suporte social de colegas', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'social', 15),
    ('Suporte social de superiores', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'leadership', 16),
    ('Sentido de pertença a comunidade', 'Relações Sociais e Liderança', 'HIGH_IS_FAVORABLE', 'social', 17),
    ('Insegurança laboral', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'security', 18),
    ('Insegurança com as condições de trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'security', 19),
    ('Qualidade do trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_FAVORABLE', 'meaning', 20),
    ('Confiança horizontal', 'Capital Social', 'HIGH_IS_RISK', 'social', 21),
    ('Confiança vertical', 'Capital Social', 'HIGH_IS_FAVORABLE', 'recognition', 22),
    ('Justiça organizacional', 'Capital Social', 'HIGH_IS_FAVORABLE', 'recognition', 23),
    ('Conflito trabalho-família', 'Interface Trabalho-Indivíduo', 'HIGH_IS_RISK', 'workload', 24),
    ('Satisfação com o trabalho', 'Interface Trabalho-Indivíduo', 'HIGH_IS_FAVORABLE', 'meaning', 25),
    ('Auto-avaliação da saúde', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', 26),
    ('Auto-eficácia', 'Personalidade', 'HIGH_IS_FAVORABLE', 'burnout', 27),
    ('Problemas de sono', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', 28),
    ('Burnout', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', 29),
    ('Stress', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', 30),
    ('Sintomas depressivos', 'Saúde e Bem-Estar', 'HIGH_IS_RISK', 'burnout', 31)
) AS v(name, category, dir, ucode, ord)
CROSS JOIN (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_iii') AS i
JOIN public.universal_categories u ON u.code = v.ucode;

INSERT INTO public.questionnaire_items
  (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version, instrument_id, response_format_id)
SELECT s.id, v.text, v.inv, v.ord, true, true, true, s.instrument_id, f.id
FROM (VALUES
    ('Exigências quantitativas', 'A sua carga de trabalho acumula-se por ser mal distribuída?', false, 10, 'likert_frequency_5'),
    ('Exigências quantitativas', 'Com que frequência fica com trabalho atrasado?', false, 20, 'likert_frequency_5'),
    ('Exigências quantitativas', 'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?', false, 30, 'likert_frequency_5'),
    ('Ritmo de trabalho', 'Precisa de trabalhar muito rapidamente?', false, 40, 'likert_frequency_5'),
    ('Ritmo de trabalho', 'Trabalha a um ritmo elevado ao longo de toda a jornada de trabalho?', false, 50, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho exige a sua atenção constante?', false, 60, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho requer que memorize muitas informações?', false, 70, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho requer que seja bom a propor novas ideias?', false, 80, 'likert_frequency_5'),
    ('Exigências cognitivas', 'O seu trabalho exige que tome decisões difíceis?', false, 90, 'likert_frequency_5'),
    ('Exigências emocionais', 'O seu trabalho coloca-o/a em situações emocionalmente perturbadoras?', false, 100, 'likert_frequency_5'),
    ('Exigências emocionais', 'No seu trabalho tem de lidar com os problemas pessoais de outras pessoas?', false, 110, 'likert_frequency_5'),
    ('Exigências emocionais', 'O seu trabalho exige emocionalmente de si?', false, 120, 'likert_frequency_5'),
    ('Influência no trabalho', 'Tem um elevado grau de influência nas decisões sobre o seu trabalho?', false, 130, 'likert_frequency_5'),
    ('Influência no trabalho', 'Pode influenciar a quantidade de trabalho que lhe compete a si?', false, 140, 'likert_frequency_5'),
    ('Influência no trabalho', 'Tem alguma influência sobre o tipo de tarefas que faz?', false, 150, 'likert_frequency_5'),
    ('Influência no trabalho', 'Tem alguma influência sobre o modo como faz o seu trabalho?', false, 160, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho permite-lhe aprender coisas novas?', false, 170, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho permite-lhe usar as suas competências ou capacidades?', false, 180, 'likert_frequency_5'),
    ('Possibilidades de desenvolvimento', 'O seu trabalho permite-lhe desenvolver as suas competências?', false, 190, 'likert_frequency_5'),
    ('Controlo sobre o tempo de trabalho', 'Pode decidir quando faz as suas pausas?', false, 210, 'likert_frequency_5'),
    ('Controlo sobre o tempo de trabalho', 'Pode tirar férias mais ou menos quando deseja?', false, 220, 'likert_frequency_5'),
    ('Controlo sobre o tempo de trabalho', 'Pode fazer uma pausa no trabalho para falar com um/a colega?', false, 230, 'likert_frequency_5'),
    ('Significado do trabalho', 'O seu trabalho tem algum significado para si?', false, 260, 'likert_extent_5'),
    ('Significado do trabalho', 'Sente que o seu trabalho é importante?', false, 270, 'likert_extent_5'),
    ('Significado do trabalho', 'Sente-se motivado e envolvido com o seu trabalho?', false, 280, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'Gosta de falar com os outros sobre o seu local de trabalho?', false, 290, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'Sente que os problemas do seu local de trabalho são seus também?', false, 300, 'likert_extent_5'),
    ('Compromisso face ao local de trabalho', 'Sente orgulho em pertencer a esta organização/empresa?', false, 310, 'likert_extent_5'),
    ('Previsibilidade', 'No seu local de trabalho é informado/a com antecedência sobre decisões importantes, mudanças ou planos para o futuro?', false, 320, 'likert_frequency_5'),
    ('Previsibilidade', 'Recebe toda a informação de que necessita para fazer bem o seu trabalho?', false, 330, 'likert_frequency_5'),
    ('Reconhecimento', 'O seu trabalho é reconhecido e apreciado pela gestão de topo?', false, 340, 'likert_frequency_5'),
    ('Reconhecimento', 'A gestão de topo do seu local de trabalho respeita-o/a?', false, 350, 'likert_frequency_5'),
    ('Reconhecimento', 'É tratado/a de forma justa no seu local de trabalho?', false, 360, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'O seu trabalho tem objectivos claros?', false, 370, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'Sabe exatamente quais as suas responsabilidades?', false, 380, 'likert_frequency_5'),
    ('Transparência do papel laboral', 'Sabe exatamente o que é esperado de si?', false, 390, 'likert_frequency_5'),
    ('Conflito de papéis laborais', 'Faz coisas no seu trabalho com que uns concordam mas outros não?', false, 400, 'likert_frequency_5'),
    ('Conflito de papéis laborais', 'Por vezes tem que fazer coisas que deveriam ser feitas de outra maneira?', false, 410, 'likert_frequency_5'),
    ('Conflito de papéis laborais', 'Por vezes tem que fazer coisas que considera desnecessárias?', false, 420, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… Oferece aos indivíduos e ao grupo boas oportunidades de desenvolvimento/formação?', false, 430, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… Faz um bom planeamento do trabalho?', false, 440, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… É eficaz a resolver conflitos?', false, 450, 'likert_frequency_5'),
    ('Qualidade da liderança', 'Em relação à sua chefia directa, até que ponto considera que… Dá prioridade à satisfação no trabalho?', false, 460, 'likert_frequency_5'),
    ('Suporte social de colegas', 'Com que frequência tem ajuda e apoio dos seus colegas de trabalho, se necessário?', false, 470, 'likert_frequency_5'),
    ('Suporte social de colegas', 'Com que frequência os seus colegas estão recetivos a ouvi-lo/a sobre os seus problemas de trabalho, se necessário?', false, 480, 'likert_frequency_5'),
    ('Suporte social de colegas', 'Com que frequência os seus colegas falam consigo sobre o seu próprio desempenho laboral?', false, 490, 'likert_frequency_5'),
    ('Suporte social de superiores', 'Com que frequência a sua chefia direta fala consigo sobre como está a decorrer o seu trabalho?', false, 500, 'likert_frequency_5'),
    ('Suporte social de superiores', 'Com que frequência tem ajuda e apoio da sua chefia direta, se necessário?', false, 510, 'likert_frequency_5'),
    ('Suporte social de superiores', 'Com que frequência a sua chefia direta fala consigo sobre o seu desempenho laboral?', false, 520, 'likert_frequency_5'),
    ('Sentido de pertença a comunidade', 'Existe um bom ambiente de trabalho entre si e os seus colegas?', false, 530, 'likert_frequency_5'),
    ('Sentido de pertença a comunidade', 'No seu local de trabalho sente-se parte de uma comunidade?', false, 540, 'likert_frequency_5'),
    ('Sentido de pertença a comunidade', 'Existe uma boa cooperação entre os colegas de trabalho?', false, 550, 'likert_frequency_5'),
    ('Insegurança laboral', 'Sente-se preocupado/a em ficar desempregado/a?', false, 560, 'likert_extent_5'),
    ('Insegurança laboral', 'Sente-se preocupado/a com a dificuldade em encontrar outro trabalho se ficar desempregado/a?', false, 570, 'likert_extent_5'),
    ('Insegurança com as condições de trabalho', 'Sente-se preocupado/a em ser transferido/a para outro posto de trabalho contra a sua vontade?', false, 580, 'likert_extent_5'),
    ('Insegurança com as condições de trabalho', 'Preocupa-o/a que o seu horário de trabalho (turno, dias úteis, hora de entrada e saída…) seja mudado contra sua vontade?', false, 590, 'likert_extent_5'),
    ('Insegurança com as condições de trabalho', 'Sente-se preocupado/a com uma diminuição na sua retribuição (redução, introdução de remuneração variável…)?', false, 600, 'likert_extent_5'),
    ('Qualidade do trabalho', 'Está satisfeito (a) com a qualidade do trabalho realizado?', false, 610, 'likert_extent_5'),
    ('Confiança horizontal', 'Os trabalhadores confiam uns nos outros de um modo geral?', true, 620, 'likert_frequency_5'),
    ('Confiança horizontal', 'Os trabalhadores ocultam informações uns dos outros?', false, 630, 'likert_frequency_5'),
    ('Confiança horizontal', 'Os trabalhadores ocultam informação à gestão de topo?', false, 640, 'likert_frequency_5'),
    ('Confiança vertical', 'A gestão de topo confia nos seus trabalhadores para fazerem o seu trabalho bem?', false, 650, 'likert_frequency_5'),
    ('Confiança vertical', 'Os trabalhadores confiam na informação que lhes é transmitida pela gestão de topo?', false, 660, 'likert_frequency_5'),
    ('Confiança vertical', 'Os trabalhadores podem expressar as suas opiniões à gestão de topo?', false, 670, 'likert_frequency_5'),
    ('Justiça organizacional', 'Os conflitos são resolvidos de uma forma justa?', false, 690, 'likert_frequency_5'),
    ('Justiça organizacional', 'O trabalho é distribuído de forma justa?', false, 700, 'likert_frequency_5'),
    ('Justiça organizacional', 'As sugestões dos trabalhadores são tratadas de forma séria pela gestão de topo?', false, 710, 'likert_frequency_5'),
    ('Justiça organizacional', 'Quando os trabalhadores fazem um bom trabalho são reconhecidos?', false, 720, 'likert_frequency_5'),
    ('Conflito trabalho-família', 'Sente que o seu trabalho lhe exige tanta energia, que acaba por afetar a sua vida privada/familiar negativamente?', false, 740, 'likert_extent_5'),
    ('Conflito trabalho-família', 'Sente que o seu trabalho lhe exige tanto tempo, que acaba por afetar a sua vida privada/familiar negativamente?', false, 750, 'likert_extent_5'),
    ('Conflito trabalho-família', 'As exigências do seu trabalho interferem com a sua vida privada e familiar?', false, 760, 'likert_extent_5'),
    ('Satisfação com o trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… As suas perspetivas de trabalho?', false, 780, 'likert_extent_5'),
    ('Satisfação com o trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… O seu trabalho de uma forma global?', false, 790, 'likert_extent_5'),
    ('Satisfação com o trabalho', 'Em relação ao seu trabalho em geral, quão satisfeito está com… A forma como as suas capacidades e competências são usadas?', false, 820, 'likert_extent_5'),
    ('Auto-avaliação da saúde', 'Em geral, sente que a sua saúde é:', false, 830, 'copsoq2_pt_health'),
    ('Auto-eficácia', 'Sou sempre capaz de resolver problemas se tentar o suficiente.', false, 840, 'likert_frequency_5'),
    ('Auto-eficácia', 'É fácil seguir os meus planos e atingir os meus objectivos.', false, 850, 'likert_frequency_5'),
    ('Problemas de sono', 'Nas últimas 4 semanas: Sentiu dificuldade em adormecer?', false, 860, 'likert_frequency_5'),
    ('Problemas de sono', 'Nas últimas 4 semanas: Acordou várias vezes durante a noite e depois não conseguia adormecer novamente?', false, 870, 'likert_frequency_5'),
    ('Burnout', 'Nas últimas 4 semanas: Tem-se sentido fisicamente exausto/a?', false, 880, 'likert_frequency_5'),
    ('Burnout', 'Nas últimas 4 semanas: Tem-se sentido emocionalmente exausto/a?', false, 890, 'likert_frequency_5'),
    ('Stress', 'Nas últimas 4 semanas: Tem-se sentido irritado/a?', false, 900, 'likert_frequency_5'),
    ('Stress', 'Nas últimas 4 semanas: Tem-se sentido ansioso/a?', false, 910, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Nas últimas 4 semanas: Tem-se sentido triste?', false, 920, 'likert_frequency_5'),
    ('Sintomas depressivos', 'Nas últimas 4 semanas: Tem sentido falta de interesse por coisas do quotidiano?', false, 930, 'likert_frequency_5')
) AS v(scale, text, inv, ord, fmt)
JOIN public.questionnaire_scales s ON s.name = v.scale
  AND s.instrument_id = (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_iii')
JOIN public.response_formats f ON f.code = v.fmt;

-- 5. JSS: textos da versão brasileira oficial; aviso de licença; cortes do autor
UPDATE public.questionnaire_items it
SET text = v.text
FROM (VALUES
    (1, 'Eu sinto que meu salário é justo pelo trabalho que faço.'),
    (2, 'No meu trabalho existe muito pouca oportunidade de promoção.'),
    (3, 'Meu supervisor é bastante competente na realização do seu trabalho.'),
    (4, 'Eu não estou satisfeito com os benefícios que recebo.'),
    (5, 'Quando faço um bom trabalho, eu recebo o reconhecimento que mereço.'),
    (6, 'Muitas das nossas regras e procedimentos fazem com que seja difícil realizar um bom trabalho.'),
    (7, 'Eu gosto das pessoas com quem trabalho.'),
    (8, 'Eu sinto, às vezes, que meu trabalho não faz sentido.'),
    (9, 'A comunicação parece ser boa nesta organização.'),
    (10, 'Os aumentos salariais são poucos e distantes entre si.'),
    (11, 'Aqueles que fazem um bom trabalho têm uma grande chance de serem promovidos.'),
    (12, 'Meu supervisor é injusto comigo.'),
    (13, 'Os benefícios que recebemos são tão bons quanto os que a maioria das outras organizações oferecem.'),
    (14, 'Eu sinto que o trabalho que faço não é valorizado.'),
    (15, 'A burocracia raramente impede que eu faça um bom trabalho.'),
    (16, 'Eu sinto que tenho que trabalhar mais arduamente devido à incompetência das pessoas com quem trabalho.'),
    (17, 'Eu gosto das tarefas que faço no trabalho.'),
    (18, 'Os objetivos desta organização não são claros para mim.'),
    (19, 'Sinto-me desvalorizado pela organização quando penso no quanto me pagam.'),
    (20, 'Sobe-se na carreira aqui tão rápido quanto em outros lugares.'),
    (21, 'Meu supervisor demonstra pouco interesse pelos sentimentos dos seus subordinados.'),
    (22, 'Nossos benefícios são justos.'),
    (23, 'Existem poucas recompensas para aqueles que trabalham aqui.'),
    (24, 'Eu tenho muito para fazer no trabalho.'),
    (25, 'Eu gosto dos meus colegas de trabalho.'),
    (26, 'Eu sinto, muitas vezes, que não sei o que está se passando dentro da organização.'),
    (27, 'Sinto-me orgulhoso em fazer o meu trabalho.'),
    (28, 'Sinto-me satisfeito com as minhas oportunidades de aumentos salariais.'),
    (29, 'Existem benefícios que não temos mas que deveríamos ter.'),
    (30, 'Eu gosto do meu supervisor.'),
    (31, 'Eu tenho trabalho burocrático demais.'),
    (32, 'Eu não sinto que meus esforços são recompensados da maneira que deveriam ser.'),
    (33, 'Eu estou satisfeito com minhas chances de promoção.'),
    (34, 'Existem muitas discussões sem importância e conflitos no trabalho.'),
    (35, 'Meu trabalho é agradável.'),
    (36, 'As atribuições do trabalho não são totalmente explicadas.')
) AS v(ord, text)
WHERE it.instrument_id = (SELECT id FROM public.questionnaire_instruments WHERE code = 'jss')
  AND it.order_index = v.ord;

UPDATE public.questionnaire_instruments
SET name = 'JSS — Job Satisfaction Survey (versão brasileira)',
    description = 'Satisfação no trabalho em 9 facetas, 36 perguntas, escala de 6 pontos (Spector). Versão brasileira de Souza, Milani e Alexandre (2015), validada por Souza et al. (2017). Licença: uso gratuito só para pesquisa e ensino; uso comercial (cobrar por um serviço que inclua a escala) requer licença do autor (paulspector.com).',
    source = 'Spector, P. E. (1985, 1994). Job Satisfaction Survey. Souza, A. C., Milani, D. & Alexandre, N. M. C. (2015). RBSO, 40(132), 219-227. Souza, A. C., Alexandre, N. M. C. & Guirardello, E. B. (2017). Journal of Nursing Measurement, 25, 46-65.',
    version_label = '2015 (Brasil)'
WHERE code = 'jss';

UPDATE public.questionnaire_scales s
SET cut_low = 40, cut_high = 60,
    cut_source = 'Spector, Interpreting satisfaction scores with the JSS: média por item ≤ 3 = insatisfeito, ≥ 4 = satisfeito, entre 3 e 4 = ambivalente (escala 1-6).',
    universal_category_id = CASE WHEN s.name = 'Promoção'
      THEN (SELECT id FROM public.universal_categories WHERE code = 'autonomy') ELSE s.universal_category_id END
FROM public.questionnaire_instruments i
WHERE s.instrument_id = i.id AND i.code = 'jss';

-- 6. OLBI: arquiva a versão anterior e cria a versão brasileira de 13 itens
UPDATE public.questionnaire_instruments
SET code = 'olbi_legado',
    name = 'OLBI — versão anterior (itens trocados, arquivada)',
    is_active = false
WHERE code = 'olbi';

INSERT INTO public.questionnaire_instruments (code, name, description, version_label, source, total_questions, estimated_minutes, is_active)
VALUES (
  'olbi',
  'OLBI — Inventário de Burnout de Oldenburg (versão brasileira)',
  'Exaustão e desengajamento do trabalho (burnout): versão brasileira validada de 13 perguntas, escala de 4 pontos. Mede efeitos à saúde, não fatores de risco do trabalho: use junto com o COPSOQ para o inventário da NR-1.',
  '2018 (13 itens)',
  'Demerouti, E. & Bakker, A. B. (2008). The Oldenburg Burnout Inventory. Schuster, M. S. & Dias, V. V. (2018). Oldenburg Burnout Inventory - validação de uma nova forma de mensurar Burnout no Brasil. Ciência & Saúde Coletiva, 23(2), 553-562. Pontos de corte: Peterson, U. et al. (2008). J Adv Nurs, 62(1), 84-95.',
  13,
  5,
  true
);

INSERT INTO public.questionnaire_scales
  (name, category, scoring_direction, short_version, medium_version, long_version, instrument_id, universal_category_id, display_order, cut_low, cut_high, cut_source)
SELECT v.name, 'Burnout', 'HIGH_IS_RISK'::public.scoring_direction, true, true, true, i.id, u.id, v.ord, v.cut, v.cut, v.src
FROM (VALUES
    ('Exaustão', 1, 41.67, 'Peterson et al. (2008): média de exaustão ≥ 2,25 (escala 1-4) indica burnout.'),
    ('Desengajamento', 2, 36.67, 'Peterson et al. (2008): média de desengajamento ≥ 2,10 (escala 1-4) indica burnout.')
) AS v(name, ord, cut, src)
CROSS JOIN (SELECT id FROM public.questionnaire_instruments WHERE code = 'olbi') AS i
JOIN public.universal_categories u ON u.code = 'burnout';

INSERT INTO public.questionnaire_items
  (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version, instrument_id, response_format_id)
SELECT s.id, v.text, v.inv, v.ord, true, true, true, s.instrument_id, (SELECT id FROM public.response_formats WHERE code = 'olbi_br_4')
FROM (VALUES
    ('Desengajamento', 'Com frequência faço coisas novas e interessantes no meu trabalho.', true, 10), -- DT1
    ('Exaustão', 'Há dias em que me sinto cansado antes mesmo de chegar ao trabalho.', false, 20), -- EE1
    ('Desengajamento', 'Cada vez falo mais e com mais frequência de forma negativa sobre meu trabalho.', false, 30), -- DT2
    ('Exaustão', 'Depois do trabalho, preciso de mais tempo para sentir-me melhor do que precisava antigamente.', false, 40), -- EE2
    ('Exaustão', 'Consigo suportar muito bem as pressões do meu trabalho.', true, 50), -- EE3
    ('Desengajamento', 'Ultimamente, tenho realizado meu trabalho de forma quase mecânica.', false, 60), -- DT3
    ('Desengajamento', 'Considero meu trabalho um desafio positivo.', true, 70), -- DT4
    ('Exaustão', 'Durante o meu trabalho, sinto-me emocionalmente esgotado.', false, 80), -- EE4
    ('Desengajamento', 'Com o passar do tempo, venho me desinteressando do meu trabalho.', false, 90), -- DT5
    ('Exaustão', 'Depois das tarefas profissionais, tenho energia para as minhas atividades de lazer.', true, 100), -- EE5
    ('Desengajamento', 'Muitas vezes sinto-me farto das minhas tarefas.', false, 110), -- DT8
    ('Exaustão', 'Depois do trabalho, sinto-me cansado e sem energia.', false, 120), -- EE7
    ('Desengajamento', 'Sinto-me cada vez mais empenhado no meu trabalho.', true, 130) -- DT7
) AS v(scale, text, inv, ord)
JOIN public.questionnaire_scales s ON s.name = v.scale
  AND s.instrument_id = (SELECT id FROM public.questionnaire_instruments WHERE code = 'olbi');

-- 7. Conferências: se qualquer número não bater, a migração inteira é desfeita
DO $$
DECLARE
  c3 uuid := (SELECT id FROM public.questionnaire_instruments WHERE code = 'copsoq_iii');
  ol uuid := (SELECT id FROM public.questionnaire_instruments WHERE code = 'olbi');
  js uuid := (SELECT id FROM public.questionnaire_instruments WHERE code = 'jss');
  n int; d int; inv int; nofmt int;
BEGIN
  SELECT count(*), count(DISTINCT dimension_id), count(*) FILTER (WHERE is_inverted), count(*) FILTER (WHERE response_format_id IS NULL)
    INTO n, d, inv, nofmt FROM public.questionnaire_items WHERE instrument_id = c3;
  IF n <> 85 OR d <> 31 OR inv <> 1 OR nofmt <> 0 THEN
    RAISE EXCEPTION 'COPSOQ III: % perguntas, % dimensões, % invertidas, % sem formato (esperado 85, 31, 1, 0)', n, d, inv, nofmt;
  END IF;
  SELECT count(*), count(DISTINCT dimension_id), count(*) FILTER (WHERE is_inverted)
    INTO n, d, inv FROM public.questionnaire_items WHERE instrument_id = ol;
  IF n <> 13 OR d <> 2 OR inv <> 5 THEN
    RAISE EXCEPTION 'OLBI: % perguntas, % dimensões, % invertidas (esperado 13, 2, 5)', n, d, inv;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE is_inverted) INTO n, inv FROM public.questionnaire_items WHERE instrument_id = js;
  IF n <> 36 OR inv <> 19 THEN
    RAISE EXCEPTION 'JSS: % perguntas, % invertidas (esperado 36, 19)', n, inv;
  END IF;
  SELECT count(*) INTO n FROM public.questionnaire_scales WHERE instrument_id = js AND (cut_low <> 40 OR cut_high <> 60 OR cut_low IS NULL);
  IF n <> 0 THEN
    RAISE EXCEPTION 'JSS: % facetas sem os cortes 40/60', n;
  END IF;
END $$;

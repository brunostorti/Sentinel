-- Sentinel Platform — COPSOQ II Question Bank Seed
-- Source: COPSOQ II Portuguese validation (Silva et al., 2013)
-- Manual: COPSOQ-Manual-Portugal2013.pdf

-- ============================================
-- DIMENSIONS (35 subscales)
-- ============================================
-- scoring_direction: HIGH_IS_RISK = high score is bad for health
--                    HIGH_IS_FAVORABLE = high score is good for health

-- Category 1: Exigências no Trabalho
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Exigências Quantitativas', 'Exigências no Trabalho', 'Volume de trabalho em relação ao tempo disponível', 'HIGH_IS_RISK', true, true, true),
  ('d0000001-0000-0000-0000-000000000002', 'Ritmo de Trabalho', 'Exigências no Trabalho', 'Rapidez com que o trabalho deve ser realizado', 'HIGH_IS_RISK', true, true, true),
  ('d0000001-0000-0000-0000-000000000003', 'Exigências Cognitivas', 'Exigências no Trabalho', 'Exigências de atenção, memória e decisão', 'HIGH_IS_RISK', true, true, true),
  ('d0000001-0000-0000-0000-000000000004', 'Exigências Emocionais', 'Exigências no Trabalho', 'Exigências emocionais do trabalho', 'HIGH_IS_RISK', true, true, true),
  ('d0000001-0000-0000-0000-000000000005', 'Exigências para Esconder Emoções', 'Exigências no Trabalho', 'Necessidade de esconder sentimentos no trabalho', 'HIGH_IS_RISK', false, false, true);

-- Category 2: Organização do Trabalho e Conteúdo
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'Influência no Trabalho', 'Organização do Trabalho e Conteúdo', 'Grau de influência sobre o próprio trabalho', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000002-0000-0000-0000-000000000002', 'Possibilidades de Desenvolvimento', 'Organização do Trabalho e Conteúdo', 'Oportunidades de aprender e desenvolver competências', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000002-0000-0000-0000-000000000003', 'Significado do Trabalho', 'Organização do Trabalho e Conteúdo', 'Significado e utilidade percebida do trabalho', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000002-0000-0000-0000-000000000004', 'Compromisso com o Local de Trabalho', 'Organização do Trabalho e Conteúdo', 'Sentimento de pertença e compromisso', 'HIGH_IS_FAVORABLE', true, true, true);

-- Category 3: Relações Sociais e Liderança
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'Previsibilidade', 'Relações Sociais e Liderança', 'Informação antecipada sobre mudanças e decisões', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000002', 'Transparência do Papel Laboral', 'Relações Sociais e Liderança', 'Clareza sobre objectivos e expectativas', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000003', 'Recompensas', 'Relações Sociais e Liderança', 'Reconhecimento e recompensa pelo trabalho', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000004', 'Conflitos de Papéis', 'Relações Sociais e Liderança', 'Exigências contraditórias no trabalho', 'HIGH_IS_RISK', false, true, true),
  ('d0000003-0000-0000-0000-000000000005', 'Apoio Social de Colegas', 'Relações Sociais e Liderança', 'Apoio e ajuda dos colegas de trabalho', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000006', 'Apoio Social de Superiores', 'Relações Sociais e Liderança', 'Apoio e ajuda das chefias', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000007', 'Qualidade da Liderança', 'Relações Sociais e Liderança', 'Qualidade da gestão e liderança', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000008', 'Comunidade Social no Trabalho', 'Relações Sociais e Liderança', 'Ambiente social e sentido de comunidade', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000003-0000-0000-0000-000000000009', 'Confiança Horizontal', 'Relações Sociais e Liderança', 'Confiança entre colegas', 'HIGH_IS_FAVORABLE', false, false, true),
  ('d0000003-0000-0000-0000-000000000010', 'Confiança Vertical', 'Relações Sociais e Liderança', 'Confiança entre trabalhadores e gestão', 'HIGH_IS_FAVORABLE', false, false, true),
  ('d0000003-0000-0000-0000-000000000011', 'Justiça e Respeito', 'Relações Sociais e Liderança', 'Tratamento justo e com respeito', 'HIGH_IS_FAVORABLE', false, false, true);

-- Category 4: Interface Trabalho-Indivíduo
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000001', 'Insegurança Laboral', 'Interface Trabalho-Indivíduo', 'Preocupação com perda de emprego', 'HIGH_IS_RISK', true, true, true),
  ('d0000004-0000-0000-0000-000000000002', 'Satisfação no Trabalho', 'Interface Trabalho-Indivíduo', 'Satisfação geral com o trabalho', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000004-0000-0000-0000-000000000003', 'Conflito Trabalho-Família', 'Interface Trabalho-Indivíduo', 'Conflito entre exigências do trabalho e família', 'HIGH_IS_RISK', true, true, true);

-- Category 5: Valores no Local de Trabalho
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000005-0000-0000-0000-000000000001', 'Confiança na Gestão', 'Valores no Local de Trabalho', 'Confiança na competência e decisões da gestão', 'HIGH_IS_FAVORABLE', false, true, true),
  ('d0000005-0000-0000-0000-000000000002', 'Justiça', 'Valores no Local de Trabalho', 'Percepção de justiça nas decisões organizacionais', 'HIGH_IS_FAVORABLE', false, true, true);

-- Category 6: Personalidade
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000006-0000-0000-0000-000000000001', 'Auto-Eficácia', 'Personalidade', 'Capacidade percebida para lidar com situações', 'HIGH_IS_FAVORABLE', true, true, true);

-- Category 7: Saúde e Bem-Estar
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000001', 'Saúde Geral', 'Saúde e Bem-Estar', 'Percepção geral do estado de saúde', 'HIGH_IS_FAVORABLE', true, true, true),
  ('d0000007-0000-0000-0000-000000000002', 'Problemas em Dormir', 'Saúde e Bem-Estar', 'Dificuldades com o sono', 'HIGH_IS_RISK', true, true, true),
  ('d0000007-0000-0000-0000-000000000003', 'Burnout', 'Saúde e Bem-Estar', 'Exaustão física e emocional', 'HIGH_IS_RISK', true, true, true),
  ('d0000007-0000-0000-0000-000000000004', 'Stress', 'Saúde e Bem-Estar', 'Tensão, nervosismo e irritabilidade', 'HIGH_IS_RISK', true, true, true),
  ('d0000007-0000-0000-0000-000000000005', 'Sintomas Depressivos', 'Saúde e Bem-Estar', 'Sentimentos de tristeza e desânimo', 'HIGH_IS_RISK', true, true, true);

-- Category 8: Comportamentos Ofensivos
INSERT INTO copsoq_dimensions (id, name, category, description, scoring_direction, short_version, medium_version, long_version) VALUES
  ('d0000008-0000-0000-0000-000000000001', 'Comportamentos Ofensivos', 'Comportamentos Ofensivos', 'Exposição a bullying, assédio, violência, discriminação', 'HIGH_IS_RISK', true, true, true);

-- ============================================
-- QUESTIONS — SHORT VERSION (41 questions, all also in Medium and Long)
-- ============================================
-- Response scale: 1 (Nunca/Nada) to 5 (Sempre/Extremamente)
-- No inverted items in Short version

-- Exigências Quantitativas (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'A sua carga de trabalho acumula-se por ser mal distribuída?', false, 1, true, true, true),
  ('d0000001-0000-0000-0000-000000000001', 'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?', false, 2, true, true, true);

-- Ritmo de Trabalho (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000002', 'Precisa trabalhar muito rapidamente?', false, 3, true, true, true);

-- Exigências Cognitivas (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'O seu trabalho exige que seja bom a propor novas ideias?', false, 4, true, true, true),
  ('d0000001-0000-0000-0000-000000000003', 'O seu trabalho exige que tome decisões difíceis?', false, 5, true, true, true);

-- Exigências Emocionais (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000004', 'O seu trabalho é emocionalmente desgastante?', false, 6, true, true, true);

-- Influência no Trabalho (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'Tem um elevado grau de influência no seu trabalho?', false, 7, true, true, true),
  ('d0000002-0000-0000-0000-000000000001', 'Pode influenciar a quantidade de trabalho que lhe compete a si?', false, 8, true, true, true);

-- Possibilidades de Desenvolvimento (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'O seu trabalho exige que tenha iniciativa?', false, 9, true, true, true),
  ('d0000002-0000-0000-0000-000000000002', 'O seu trabalho permite-lhe aprender coisas novas?', false, 10, true, true, true);

-- Significado do Trabalho (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000003', 'O seu trabalho tem algum significado para si?', false, 11, true, true, true),
  ('d0000002-0000-0000-0000-000000000003', 'Sente que o seu trabalho é importante?', false, 12, true, true, true);

-- Compromisso com o Local de Trabalho (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000004', 'Gosta de falar com os outros sobre o seu local de trabalho?', false, 13, true, true, true),
  ('d0000002-0000-0000-0000-000000000004', 'Sente que os problemas do seu local de trabalho são seus também?', false, 14, true, true, true);

-- Previsibilidade (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'No seu local de trabalho, é informado com antecedência sobre decisões importantes, mudanças ou planos para o futuro?', false, 15, true, true, true),
  ('d0000003-0000-0000-0000-000000000001', 'Recebe toda a informação de que necessita para fazer bem o seu trabalho?', false, 16, true, true, true);

-- Transparência do Papel Laboral (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000002', 'Sabe exactamente quais as suas responsabilidades?', false, 17, true, true, true),
  ('d0000003-0000-0000-0000-000000000002', 'O seu trabalho tem objectivos claros?', false, 18, true, true, true);

-- Recompensas (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000003', 'O seu trabalho é reconhecido e apreciado pela gestão?', false, 19, true, true, true),
  ('d0000003-0000-0000-0000-000000000003', 'É tratado de forma justa no seu local de trabalho?', false, 20, true, true, true);

-- Apoio Social de Colegas (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000005', 'Com que frequência os seus colegas estão dispostos a ouvi-lo(a) sobre os seus problemas de trabalho?', false, 21, true, true, true);

-- Apoio Social de Superiores (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000006', 'Com que frequência o seu superior imediato está disposto a ouvi-lo(a) sobre os seus problemas de trabalho?', false, 22, true, true, true);

-- Qualidade da Liderança (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000007', 'O seu superior imediato oferece-lhe oportunidades de desenvolvimento?', false, 23, true, true, true),
  ('d0000003-0000-0000-0000-000000000007', 'A sua chefia directa é boa a planear o trabalho?', false, 24, true, true, true);

-- Comunidade Social no Trabalho (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000008', 'Existe um bom ambiente de trabalho entre si e os seus colegas?', false, 25, true, true, true);

-- Insegurança Laboral (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000001', 'Sente-se preocupado(a) em ficar desempregado(a)?', false, 26, true, true, true),
  ('d0000004-0000-0000-0000-000000000001', 'Sente-se preocupado(a) com novas tecnologias tornarem o seu trabalho dispensável?', false, 27, true, true, true);

-- Satisfação no Trabalho (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000002', 'Em relação ao seu trabalho em geral, quão satisfeito(a) está com as suas perspectivas de trabalho?', false, 28, true, true, true),
  ('d0000004-0000-0000-0000-000000000002', 'Em relação ao seu trabalho em geral, quão satisfeito(a) está com o ambiente físico do seu local de trabalho?', false, 29, true, true, true);

-- Conflito Trabalho-Família (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000003', 'Sente que o seu trabalho lhe exige muita energia que acaba por afectar a sua vida privada negativamente?', false, 30, true, true, true),
  ('d0000004-0000-0000-0000-000000000003', 'Os seus amigos ou família dizem-lhe que trabalha demais?', false, 31, true, true, true);

-- Auto-Eficácia (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000006-0000-0000-0000-000000000001', 'Sou sempre capaz de resolver problemas, se me esforçar o suficiente.', false, 32, true, true, true),
  ('d0000006-0000-0000-0000-000000000001', 'É-me sempre possível resolver os problemas difíceis se eu tentar com afinco.', false, 33, true, true, true);

-- Saúde Geral (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000001', 'Em geral, sente que a sua saúde é...', false, 34, true, true, true);

-- Problemas em Dormir (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000002', 'Com que frequência dormiu mal e de forma inquieta?', false, 35, true, true, true);

-- Burnout (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000003', 'Com que frequência se sentiu fisicamente exausto(a)?', false, 36, true, true, true),
  ('d0000007-0000-0000-0000-000000000003', 'Com que frequência se sentiu emocionalmente exausto(a)?', false, 37, true, true, true);

-- Stress (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000004', 'Com que frequência se sentiu stressado(a)?', false, 38, true, true, true),
  ('d0000007-0000-0000-0000-000000000004', 'Com que frequência se sentiu tenso(a)?', false, 39, true, true, true);

-- Sintomas Depressivos (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000005', 'Com que frequência se sentiu triste?', false, 40, true, true, true);

-- Comportamentos Ofensivos (1 item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido alvo de intimidação ou bullying no seu local de trabalho?', false, 41, true, true, true);

-- ============================================
-- QUESTIONS — MEDIUM-ONLY (items 42-76, 35 additional questions)
-- ============================================
-- These questions appear in Medium and Long but NOT in Short
-- Items 42 and 45 (medium ordering) are INVERTED

-- Exigências Quantitativas (1 additional item — INVERTED)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Consegue realizar o seu trabalho de forma contínua?', true, 42, false, true, true);

-- Exigências Cognitivas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'O seu trabalho requer que memorize muitas coisas?', false, 43, false, true, true);

-- Exigências Emocionais (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000004', 'O seu trabalho coloca-o em situações emocionalmente perturbadoras?', false, 44, false, true, true);

-- Influência no Trabalho (1 additional item — INVERTED)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'Participa na escolha das pessoas com quem trabalha?', true, 45, false, true, true);

-- Possibilidades de Desenvolvimento (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'Pode usar os seus conhecimentos ou competências no seu trabalho?', false, 46, false, true, true);

-- Significado do Trabalho (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000003', 'Sente-se motivado(a) e envolvido(a) no seu trabalho?', false, 47, false, true, true);

-- Compromisso com o Local de Trabalho (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000004', 'Sente que faz parte de uma comunidade no seu local de trabalho?', false, 48, false, true, true);

-- Previsibilidade (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'Sabe exactamente o que se espera de si no trabalho?', false, 49, false, true, true);

-- Transparência do Papel Laboral (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000002', 'Sabe exactamente o que é da sua responsabilidade?', false, 50, false, true, true);

-- Recompensas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000003', 'No seu trabalho é apreciado(a) quando fez um bom trabalho?', false, 51, false, true, true);

-- Conflitos de Papéis — NEW dimension in Medium (3 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000004', 'São-lhe colocadas exigências contraditórias no trabalho?', false, 52, false, true, true),
  ('d0000003-0000-0000-0000-000000000004', 'Por vezes tem que fazer coisas que deveriam ser feitas de maneira diferente?', false, 53, false, true, true),
  ('d0000003-0000-0000-0000-000000000004', 'Por vezes tem que fazer coisas que considera desnecessárias?', false, 54, false, true, true);

-- Apoio Social de Colegas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000005', 'Com que frequência os seus colegas o(a) ajudam no trabalho?', false, 55, false, true, true);

-- Apoio Social de Superiores (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000006', 'Com que frequência o seu superior imediato o(a) ajuda no trabalho?', false, 56, false, true, true);

-- Qualidade da Liderança (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000007', 'O seu superior imediato dá-lhe informação importante para o seu trabalho?', false, 57, false, true, true),
  ('d0000003-0000-0000-0000-000000000007', 'A sua chefia directa é boa a resolver conflitos?', false, 58, false, true, true);

-- Comunidade Social no Trabalho (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000008', 'Com que frequência os seus colegas mostram interesse por si como pessoa?', false, 59, false, true, true),
  ('d0000003-0000-0000-0000-000000000008', 'Sente que os seus colegas são simpáticos consigo?', false, 60, false, true, true);

-- Insegurança Laboral (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000001', 'Sente-se preocupado(a) por ser difícil encontrar outro emprego se ficar desempregado(a)?', false, 61, false, true, true),
  ('d0000004-0000-0000-0000-000000000001', 'Sente-se preocupado(a) com ser transferido(a) para outro local de trabalho contra a sua vontade?', false, 62, false, true, true);

-- Satisfação no Trabalho (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000002', 'Em relação ao seu trabalho em geral, quão satisfeito(a) está com a forma como as suas competências são utilizadas?', false, 63, false, true, true),
  ('d0000004-0000-0000-0000-000000000002', 'Em relação ao seu trabalho em geral, quão satisfeito(a) está com o seu trabalho de uma forma global?', false, 64, false, true, true);

-- Conflito Trabalho-Família (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000003', 'O seu trabalho ocupa-lhe tanta energia que tem efeitos negativos na sua vida privada?', false, 65, false, true, true);

-- Confiança na Gestão — NEW dimension in Medium (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000005-0000-0000-0000-000000000001', 'A gestão do seu local de trabalho é de confiança?', false, 66, false, true, true),
  ('d0000005-0000-0000-0000-000000000001', 'Os funcionários escondem informação uns dos outros?', false, 67, false, true, true);

-- Justiça — NEW dimension in Medium (2 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000005-0000-0000-0000-000000000002', 'Os conflitos são resolvidos de uma forma justa?', false, 68, false, true, true),
  ('d0000005-0000-0000-0000-000000000002', 'O trabalho é distribuído de forma justa?', false, 69, false, true, true);

-- Saúde Geral (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000001', 'Que pontuação dá ao seu estado de saúde actual?', false, 70, false, true, true);

-- Problemas em Dormir (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000002', 'Com que frequência não conseguiu dormir o suficiente?', false, 71, false, true, true);

-- Burnout (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000003', 'Com que frequência se sentiu esgotado(a)?', false, 72, false, true, true);

-- Stress (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000004', 'Com que frequência se sentiu irritado(a)?', false, 73, false, true, true);

-- Sintomas Depressivos (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000005', 'Com que frequência se sentiu sem esperança em relação ao futuro?', false, 74, false, true, true);

-- Comportamentos Ofensivos (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido exposto(a) a assédio sexual indesejado no seu local de trabalho?', false, 75, false, true, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido sujeito(a) a ameaças de violência no seu local de trabalho?', false, 76, false, true, true);

-- ============================================
-- QUESTIONS — LONG-ONLY (items 77-119, 43 additional questions)
-- ============================================
-- These questions appear ONLY in the Long version

-- Exigências Quantitativas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Com que frequência lhe falta tempo para completar as tarefas do trabalho?', false, 77, false, false, true);

-- Ritmo de Trabalho (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000002', 'Trabalha a um ritmo elevado durante todo o dia?', false, 78, false, false, true),
  ('d0000001-0000-0000-0000-000000000002', 'O seu trabalho exige um ritmo de trabalho rápido?', false, 79, false, false, true);

-- Exigências Cognitivas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'O seu trabalho exige a sua atenção constante?', false, 80, false, false, true);

-- Exigências Emocionais (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000004', 'O seu trabalho exige que se envolva emocionalmente?', false, 81, false, false, true);

-- Exigências para Esconder Emoções — NEW dimension in Long (3 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000001-0000-0000-0000-000000000005', 'O seu trabalho exige que esconda os seus sentimentos?', false, 82, false, false, true),
  ('d0000001-0000-0000-0000-000000000005', 'O seu trabalho exige que trate todas as pessoas de forma igual, mesmo que não tenha vontade?', false, 83, false, false, true),
  ('d0000001-0000-0000-0000-000000000005', 'O seu trabalho exige que seja simpático(a) com toda a gente, independentemente do comportamento das pessoas?', false, 84, false, false, true);

-- Influência no Trabalho (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'Tem influência sobre a ordem pela qual realiza as suas tarefas?', false, 85, false, false, true);

-- Possibilidades de Desenvolvimento (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'O seu trabalho dá-lhe oportunidades de desenvolver as suas competências?', false, 86, false, false, true);

-- Previsibilidade (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'Recebe informação sobre o seu desempenho no trabalho?', false, 87, false, false, true);

-- Transparência do Papel Laboral (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000002', 'Existem objectivos claros para o seu trabalho?', false, 88, false, false, true);

-- Conflitos de Papéis (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000004', 'Faz coisas no trabalho que são aceites por algumas pessoas mas não por outras?', false, 89, false, false, true);

-- Apoio Social de Colegas (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000005', 'Com que frequência recebe ajuda e apoio dos seus colegas?', false, 90, false, false, true);

-- Apoio Social de Superiores (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000006', 'Com que frequência recebe ajuda e apoio do seu superior imediato?', false, 91, false, false, true);

-- Confiança Horizontal — NEW dimension in Long (3 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000009', 'Os funcionários, de uma forma geral, confiam uns nos outros?', false, 92, false, false, true),
  ('d0000003-0000-0000-0000-000000000009', 'Os funcionários escondem informação uns dos outros?', false, 93, false, false, true),
  ('d0000003-0000-0000-0000-000000000009', 'Os funcionários, de uma forma geral, confiam na gestão?', false, 94, false, false, true);

-- Confiança Vertical — NEW dimension in Long (3 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000010', 'A gestão confia nos funcionários para fazerem o seu trabalho bem?', false, 95, false, false, true),
  ('d0000003-0000-0000-0000-000000000010', 'Pode confiar na informação que vem da gestão?', false, 96, false, false, true),
  ('d0000003-0000-0000-0000-000000000010', 'A gestão esconde informação dos funcionários?', false, 97, false, false, true);

-- Justiça e Respeito — NEW dimension in Long (3 items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000003-0000-0000-0000-000000000011', 'O seu trabalho é tratado de forma justa?', false, 98, false, false, true),
  ('d0000003-0000-0000-0000-000000000011', 'A gestão trata os funcionários com respeito?', false, 99, false, false, true),
  ('d0000003-0000-0000-0000-000000000011', 'São todos tratados de forma justa no seu local de trabalho?', false, 100, false, false, true);

-- Insegurança Laboral (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000001', 'Sente-se preocupado(a) em ser despedido(a)?', false, 101, false, false, true);

-- Conflito Trabalho-Família (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000004-0000-0000-0000-000000000003', 'Sente que o seu trabalho lhe consome tanto tempo que tem efeitos negativos na sua vida privada?', false, 102, false, false, true);

-- Confiança na Gestão (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000005-0000-0000-0000-000000000001', 'Pode confiar na informação que recebe da gestão?', false, 103, false, false, true);

-- Justiça (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000005-0000-0000-0000-000000000002', 'As sugestões dos funcionários são tratadas de forma justa pela gestão?', false, 104, false, false, true);

-- Auto-Eficácia (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000006-0000-0000-0000-000000000001', 'Consigo sempre gerir problemas inesperados.', false, 105, false, false, true),
  ('d0000006-0000-0000-0000-000000000001', 'Posso encontrar uma solução para qualquer problema.', false, 106, false, false, true);

-- Saúde Geral (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000001', 'Como avalia a sua saúde em comparação com outras pessoas da sua idade?', false, 107, false, false, true),
  ('d0000007-0000-0000-0000-000000000001', 'A sua saúde permite-lhe fazer as suas actividades do dia-a-dia?', false, 108, false, false, true);

-- Problemas em Dormir (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000002', 'Com que frequência acordou várias vezes durante a noite e depois não conseguiu adormecer?', false, 109, false, false, true);

-- Burnout (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000003', 'Com que frequência esteve tão cansado(a) que fechou os olhos no trabalho?', false, 110, false, false, true);

-- Stress (1 additional item)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000004', 'Com que frequência se sentiu nervoso(a)?', false, 111, false, false, true);

-- Sintomas Depressivos (2 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000007-0000-0000-0000-000000000005', 'Com que frequência sentiu falta de interesse por coisas do dia-a-dia?', false, 112, false, false, true),
  ('d0000007-0000-0000-0000-000000000005', 'Com que frequência se sentiu sem ânimo?', false, 113, false, false, true);

-- Comportamentos Ofensivos (6 additional items)
INSERT INTO copsoq_questions (dimension_id, text, is_inverted, order_index, short_version, medium_version, long_version) VALUES
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido alvo de violência física no seu local de trabalho?', false, 114, false, false, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido sujeito(a) a discriminação no seu local de trabalho (ex: por género, etnia, religião)?', false, 115, false, false, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido alvo de comentários desagradáveis no seu local de trabalho?', false, 116, false, false, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido alvo de gozo ou troça no seu local de trabalho?', false, 117, false, false, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido excluído(a) do grupo de colegas?', false, 118, false, false, true),
  ('d0000008-0000-0000-0000-000000000001', 'Tem sido ignorado(a) pelo seu superior imediato?', false, 119, false, false, true);

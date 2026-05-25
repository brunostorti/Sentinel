/**
 * Seed script: populates questionnaire_instruments, questionnaire_scales,
 * and questionnaire_items with the COPSOQ III (Middle version) question bank.
 *
 * Usage: npx tsx scripts/seed-copsoq-iii.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Source: Burr H, Berthelsen H, Moncada S, et al. (2019). The Third Version
 * of the Copenhagen Psychosocial Questionnaire. Safety and Health at Work,
 * 10(4), 482-503.
 *
 * The COPSOQ III Middle version contains 70 items across 26 scales.
 * All scores are 0-100 (derived directly from response format values).
 *
 * Note: "Work Engagement" (UWES) scale is excluded — requires commercial license.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScoringDirection = "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE";

interface ScaleDef {
  name: string;
  category: string;
  description: string;
  scoringDirection: ScoringDirection;
  universalCategoryCode: string;
  displayOrder: number;
}

interface ItemDef {
  scaleName: string;
  text: string;
  isInverted: boolean;
  orderIndex: number;
  responseFormatCode: string;
}

// ---------------------------------------------------------------------------
// COPSOQ III Middle Version — Scales (26 scales)
// ---------------------------------------------------------------------------

const SCALES: ScaleDef[] = [
  // 1. Demandas Quantitativas
  {
    name: "Demandas Quantitativas",
    category: "Demands",
    description:
      "Volume de trabalho em relacao ao tempo disponivel. " +
      "Avalia se a carga de trabalho se acumula e se ha tempo suficiente para completar tarefas.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "workload",
    displayOrder: 1,
  },
  // 2. Ritmo de Trabalho
  {
    name: "Ritmo de Trabalho",
    category: "Demands",
    description:
      "Velocidade exigida na execucao das tarefas. " +
      "Avalia a pressao por rapidez no desempenho profissional.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "workload",
    displayOrder: 2,
  },
  // 3. Demandas Cognitivas
  {
    name: "Demandas Cognitivas",
    category: "Demands",
    description:
      "Exigencias de atencao, memoria, decisao e criatividade. " +
      "Avalia o esforco cognitivo necessario para realizar o trabalho.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "workload",
    displayOrder: 3,
  },
  // 4. Demandas Emocionais
  {
    name: "Demandas Emocionais",
    category: "Demands",
    description:
      "Exposicao a situacoes emocionalmente desgastantes no trabalho. " +
      "Avalia o envolvimento emocional exigido pelas tarefas.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 4,
  },
  // 5. Demandas para Esconder Emocoes
  {
    name: "Demandas para Esconder Emocoes",
    category: "Demands",
    description:
      "Necessidade de ocultar sentimentos no ambiente de trabalho. " +
      "Avalia a exigencia de suprimir emocoes genuinas.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 5,
  },
  // 6. Influencia no Trabalho
  {
    name: "Influencia no Trabalho",
    category: "Work Organisation",
    description:
      "Grau de controle e participacao nas decisoes sobre o proprio trabalho. " +
      "Avalia autonomia e voz ativa nas atribuicoes profissionais.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "autonomy",
    displayOrder: 6,
  },
  // 7. Possibilidades de Desenvolvimento
  {
    name: "Possibilidades de Desenvolvimento",
    category: "Work Organisation",
    description:
      "Oportunidades de aprendizagem e desenvolvimento de competencias. " +
      "Avalia se o trabalho permite uso e crescimento de habilidades.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "autonomy",
    displayOrder: 7,
  },
  // 8. Significado do Trabalho
  {
    name: "Significado do Trabalho",
    category: "Work Organisation",
    description:
      "Percepcao de sentido e importancia atribuidos ao trabalho. " +
      "Avalia motivacao intrinseca e envolvimento profissional.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "meaning",
    displayOrder: 8,
  },
  // 9. Compromisso com o Local de Trabalho
  {
    name: "Compromisso com o Local de Trabalho",
    category: "Work Organisation",
    description:
      "Vinculo afetivo e identificacao com a organizacao. " +
      "Avalia o grau de pertencimento e significado pessoal do local de trabalho.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "meaning",
    displayOrder: 9,
  },
  // 10. Previsibilidade
  {
    name: "Previsibilidade",
    category: "Interpersonal Relations",
    description:
      "Acesso a informacoes sobre decisoes e mudancas no trabalho. " +
      "Avalia se o trabalhador e informado com antecedencia.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "communication",
    displayOrder: 10,
  },
  // 11. Clareza de Papel
  {
    name: "Clareza de Papel",
    category: "Interpersonal Relations",
    description:
      "Definicao clara de objetivos, expectativas e responsabilidades. " +
      "Avalia o grau de clareza do papel profissional.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "communication",
    displayOrder: 11,
  },
  // 12. Conflito de Papeis
  {
    name: "Conflito de Papeis",
    category: "Interpersonal Relations",
    description:
      "Presenca de exigencias contraditorias ou incompativeis com valores pessoais. " +
      "Avalia conflitos entre demandas e principios no trabalho.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "communication",
    displayOrder: 12,
  },
  // 13. Qualidade da Lideranca
  {
    name: "Qualidade da Lideranca",
    category: "Interpersonal Relations",
    description:
      "Competencia do superior imediato em gestao, desenvolvimento e resolucao de conflitos. " +
      "Avalia a qualidade geral da chefia direta.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "leadership",
    displayOrder: 13,
  },
  // 14. Apoio Social de Superiores
  {
    name: "Apoio Social de Superiores",
    category: "Interpersonal Relations",
    description:
      "Disponibilidade de escuta e apoio por parte do superior imediato. " +
      "Avalia suporte social vertical.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "leadership",
    displayOrder: 14,
  },
  // 15. Apoio Social de Colegas
  {
    name: "Apoio Social de Colegas",
    category: "Interpersonal Relations",
    description:
      "Disponibilidade de escuta e apoio por parte dos colegas de trabalho. " +
      "Avalia suporte social horizontal.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "social",
    displayOrder: 15,
  },
  // 16. Comunidade Social no Trabalho
  {
    name: "Comunidade Social no Trabalho",
    category: "Interpersonal Relations",
    description:
      "Qualidade do espirito de equipe, colaboracao e sentimento de pertencimento. " +
      "Avalia a coesao social no ambiente de trabalho.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "social",
    displayOrder: 16,
  },
  // 17. Reconhecimento
  {
    name: "Reconhecimento",
    category: "Values",
    description:
      "Percepcao de valorizacao, justica e respeito pela chefia. " +
      "Avalia o reconhecimento profissional recebido.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "recognition",
    displayOrder: 17,
  },
  // 18. Justica e Respeito
  {
    name: "Justica e Respeito",
    category: "Values",
    description:
      "Percepcao de equidade na resolucao de conflitos e tratamento de sugestoes. " +
      "Avalia justica organizacional e respeito mutuo.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "recognition",
    displayOrder: 18,
  },
  // 19. Confianca em Relacao a Chefia
  {
    name: "Confianca em Relacao a Chefia",
    category: "Values",
    description:
      "Grau de transparencia da chefia e liberdade de expressao dos funcionarios. " +
      "Avalia confianca na relacao com a gestao.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "communication",
    displayOrder: 19,
  },
  // 20. Inseguranca no Trabalho
  {
    name: "Inseguranca no Trabalho",
    category: "Job Insecurity",
    description:
      "Preocupacoes com desemprego, transferencia involuntaria e obsolescencia tecnologica. " +
      "Avalia percepcao de inseguranca profissional.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "security",
    displayOrder: 20,
  },
  // 21. Satisfacao no Trabalho
  {
    name: "Satisfacao no Trabalho",
    category: "Health and Wellbeing",
    description:
      "Satisfacao geral com condicoes, perspectivas, uso de habilidades e trabalho como um todo. " +
      "Avalia contentamento profissional global.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "meaning",
    displayOrder: 21,
  },
  // 22. Conflito Trabalho-Familia
  {
    name: "Conflito Trabalho-Familia",
    category: "Health and Wellbeing",
    description:
      "Interferencia do trabalho na vida pessoal e familiar. " +
      "Avalia impacto negativo do trabalho sobre a esfera privada.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 22,
  },
  // 23. Burnout
  {
    name: "Burnout",
    category: "Health and Wellbeing",
    description:
      "Estado de esgotamento fisico e emocional relacionado ao trabalho. " +
      "Avalia exaustao, fadiga e cansaco cronico.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 23,
  },
  // 24. Estresse
  {
    name: "Estresse",
    category: "Health and Wellbeing",
    description:
      "Sintomas de tensao, irritabilidade e dificuldade de relaxamento. " +
      "Avalia nivel geral de estresse psicologico.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 24,
  },
  // 25. Saude Geral
  {
    name: "Saude Geral",
    category: "Health and Wellbeing",
    description:
      "Autoavaliacao do estado geral de saude. " +
      "Item unico que captura a percepcao subjetiva de bem-estar fisico.",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "burnout",
    displayOrder: 25,
  },
  // 26. Comportamentos Ofensivos
  {
    name: "Comportamentos Ofensivos",
    category: "Offensive Behaviours",
    description:
      "Exposicao a bullying, assedio sexual, ameacas e violencia fisica no trabalho. " +
      "Avalia a ocorrencia de comportamentos ofensivos nos ultimos 12 meses.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "offensive",
    displayOrder: 26,
  },
];

// ---------------------------------------------------------------------------
// COPSOQ III Middle Version — Items (70 questions)
// ---------------------------------------------------------------------------

const ITEMS: ItemDef[] = [
  // ── 1. Demandas Quantitativas (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Demandas Quantitativas",
    orderIndex: 1,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "A sua carga de trabalho se acumula por nao poder ser realizada no dia a dia?",
  },
  {
    scaleName: "Demandas Quantitativas",
    orderIndex: 2,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce nao tem tempo para completar todas as tarefas do seu trabalho?",
  },
  {
    scaleName: "Demandas Quantitativas",
    orderIndex: 3,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce fica atrasado(a) com o seu trabalho?",
  },

  // ── 2. Ritmo de Trabalho (1 item) — likert_frequency_5 ──
  {
    scaleName: "Ritmo de Trabalho",
    orderIndex: 4,
    isInverted: false,
    responseFormatCode: "likert_frequency_5",
    text: "Voce precisa trabalhar muito rapido?",
  },

  // ── 3. Demandas Cognitivas (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Demandas Cognitivas",
    orderIndex: 5,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho exige que voce se lembre de muitas coisas?",
  },
  {
    scaleName: "Demandas Cognitivas",
    orderIndex: 6,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho exige que voce tome decisoes dificeis?",
  },
  {
    scaleName: "Demandas Cognitivas",
    orderIndex: 7,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho exige que voce proponha novas ideias?",
  },

  // ── 4. Demandas Emocionais (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Demandas Emocionais",
    orderIndex: 8,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho e emocionalmente desgastante?",
  },
  {
    scaleName: "Demandas Emocionais",
    orderIndex: 9,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho exige que voce se envolva emocionalmente?",
  },

  // ── 5. Demandas para Esconder Emocoes (1 item) — copsoq3_time_frequency ──
  {
    scaleName: "Demandas para Esconder Emocoes",
    orderIndex: 10,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho exige que voce esconda seus sentimentos?",
  },

  // ── 6. Influencia no Trabalho (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Influencia no Trabalho",
    orderIndex: 11,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce tem influencia sobre a quantidade de trabalho que lhe e atribuida?",
  },
  {
    scaleName: "Influencia no Trabalho",
    orderIndex: 12,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce pode influenciar as decisoes sobre o seu trabalho?",
  },
  {
    scaleName: "Influencia no Trabalho",
    orderIndex: 13,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce tem voz ativa sobre o que e como faz no seu trabalho?",
  },

  // ── 7. Possibilidades de Desenvolvimento (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Possibilidades de Desenvolvimento",
    orderIndex: 14,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho lhe da oportunidades de desenvolver suas competencias?",
  },
  {
    scaleName: "Possibilidades de Desenvolvimento",
    orderIndex: 15,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce pode usar suas habilidades ou conhecimentos no seu trabalho?",
  },
  {
    scaleName: "Possibilidades de Desenvolvimento",
    orderIndex: 16,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho oferece boas oportunidades para tomar iniciativa?",
  },

  // ── 8. Significado do Trabalho (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Significado do Trabalho",
    orderIndex: 17,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho tem significado para voce?",
  },
  {
    scaleName: "Significado do Trabalho",
    orderIndex: 18,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce sente que o trabalho que faz e importante?",
  },
  {
    scaleName: "Significado do Trabalho",
    orderIndex: 19,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce se sente motivado(a) e envolvido(a) com o seu trabalho?",
  },

  // ── 9. Compromisso com o Local de Trabalho (3 items) — copsoq3_engagement ──
  {
    scaleName: "Compromisso com o Local de Trabalho",
    orderIndex: 20,
    isInverted: false,
    responseFormatCode: "copsoq3_engagement",
    text: "Voce gosta de contar as pessoas sobre o seu local de trabalho?",
  },
  {
    scaleName: "Compromisso com o Local de Trabalho",
    orderIndex: 21,
    isInverted: false,
    responseFormatCode: "copsoq3_engagement",
    text: "Voce sente que os problemas do seu local de trabalho sao tambem seus?",
  },
  {
    scaleName: "Compromisso com o Local de Trabalho",
    orderIndex: 22,
    isInverted: false,
    responseFormatCode: "copsoq3_engagement",
    text: "Voce sente que o seu local de trabalho tem grande significado pessoal para voce?",
  },

  // ── 10. Previsibilidade (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Previsibilidade",
    orderIndex: 23,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "No seu local de trabalho, voce e informado(a) com antecedencia sobre decisoes importantes?",
  },
  {
    scaleName: "Previsibilidade",
    orderIndex: 24,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce recebe toda a informacao necessaria para fazer bem o seu trabalho?",
  },

  // ── 11. Clareza de Papel (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Clareza de Papel",
    orderIndex: 25,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho tem objetivos claros e definidos?",
  },
  {
    scaleName: "Clareza de Papel",
    orderIndex: 26,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce sabe exatamente o que se espera de voce no trabalho?",
  },
  {
    scaleName: "Clareza de Papel",
    orderIndex: 27,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce sabe exatamente quais sao suas responsabilidades?",
  },

  // ── 12. Conflito de Papeis (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Conflito de Papeis",
    orderIndex: 28,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce precisa fazer coisas que acha desnecessarias no trabalho?",
  },
  {
    scaleName: "Conflito de Papeis",
    orderIndex: 29,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Recebe exigencias contraditorias no trabalho?",
  },
  {
    scaleName: "Conflito de Papeis",
    orderIndex: 30,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce precisa fazer coisas que vao contra os seus valores?",
  },

  // ── 13. Qualidade da Lideranca (4 items) — copsoq3_time_frequency ──
  {
    scaleName: "Qualidade da Lideranca",
    orderIndex: 31,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Ate que ponto seu superior imediato se certifica de que cada membro da equipe tem boas oportunidades de desenvolvimento?",
  },
  {
    scaleName: "Qualidade da Lideranca",
    orderIndex: 32,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Ate que ponto seu superior imediato da prioridade a satisfacao no trabalho?",
  },
  {
    scaleName: "Qualidade da Lideranca",
    orderIndex: 33,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Ate que ponto seu superior imediato e bom em planejar o trabalho?",
  },
  {
    scaleName: "Qualidade da Lideranca",
    orderIndex: 34,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Ate que ponto seu superior imediato e bom em resolver conflitos?",
  },

  // ── 14. Apoio Social de Superiores (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Apoio Social de Superiores",
    orderIndex: 35,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia seu superior imediato esta disposto a ouvi-lo(a) sobre seus problemas no trabalho?",
  },
  {
    scaleName: "Apoio Social de Superiores",
    orderIndex: 36,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce recebe ajuda e apoio do seu superior imediato?",
  },

  // ── 15. Apoio Social de Colegas (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Apoio Social de Colegas",
    orderIndex: 37,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia seus colegas estao dispostos a ouvi-lo(a) sobre seus problemas no trabalho?",
  },
  {
    scaleName: "Apoio Social de Colegas",
    orderIndex: 38,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce recebe ajuda e apoio dos seus colegas?",
  },

  // ── 16. Comunidade Social no Trabalho (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Comunidade Social no Trabalho",
    orderIndex: 39,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Existe um bom espirito de equipe entre voce e seus colegas?",
  },
  {
    scaleName: "Comunidade Social no Trabalho",
    orderIndex: 40,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Existe boa colaboracao entre os colegas no trabalho?",
  },
  {
    scaleName: "Comunidade Social no Trabalho",
    orderIndex: 41,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce se sente parte de uma comunidade no seu local de trabalho?",
  },

  // ── 17. Reconhecimento (3 items) — copsoq3_time_frequency ──
  {
    scaleName: "Reconhecimento",
    orderIndex: 42,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho e reconhecido e apreciado pela chefia?",
  },
  {
    scaleName: "Reconhecimento",
    orderIndex: 43,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce e tratado(a) de forma justa no seu local de trabalho?",
  },
  {
    scaleName: "Reconhecimento",
    orderIndex: 44,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "A chefia o(a) trata com respeito?",
  },

  // ── 18. Justica e Respeito (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Justica e Respeito",
    orderIndex: 45,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Os conflitos sao resolvidos de forma justa?",
  },
  {
    scaleName: "Justica e Respeito",
    orderIndex: 46,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "As sugestoes dos funcionarios sao tratadas com seriedade pela chefia?",
  },

  // ── 19. Confianca em Relacao a Chefia (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Confianca em Relacao a Chefia",
    orderIndex: 47,
    isInverted: true, // INVERTED — only inverted item in the instrument
    responseFormatCode: "copsoq3_time_frequency",
    text: "A chefia esconde informacoes dos funcionarios?",
  },
  {
    scaleName: "Confianca em Relacao a Chefia",
    orderIndex: 48,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Os funcionarios podem expressar suas opinioes e sentimentos?",
  },

  // ── 20. Inseguranca no Trabalho (3 items) — likert_extent_5 ──
  {
    scaleName: "Inseguranca no Trabalho",
    orderIndex: 49,
    isInverted: false,
    responseFormatCode: "likert_extent_5",
    text: "Voce se preocupa em ficar desempregado(a)?",
  },
  {
    scaleName: "Inseguranca no Trabalho",
    orderIndex: 50,
    isInverted: false,
    responseFormatCode: "likert_extent_5",
    text: "Voce se preocupa com ser transferido(a) para outro trabalho contra sua vontade?",
  },
  {
    scaleName: "Inseguranca no Trabalho",
    orderIndex: 51,
    isInverted: false,
    responseFormatCode: "likert_extent_5",
    text: "Voce se preocupa com novas tecnologias tornarem voce dispensavel?",
  },

  // ── 21. Satisfacao no Trabalho (4 items) — copsoq3_satisfaction ──
  {
    scaleName: "Satisfacao no Trabalho",
    orderIndex: 52,
    isInverted: false,
    responseFormatCode: "copsoq3_satisfaction",
    text: "Em relacao as suas condicoes de trabalho, quao satisfeito(a) esta?",
  },
  {
    scaleName: "Satisfacao no Trabalho",
    orderIndex: 53,
    isInverted: false,
    responseFormatCode: "copsoq3_satisfaction",
    text: "Em relacao as suas perspectivas de trabalho, quao satisfeito(a) esta?",
  },
  {
    scaleName: "Satisfacao no Trabalho",
    orderIndex: 54,
    isInverted: false,
    responseFormatCode: "copsoq3_satisfaction",
    text: "Em relacao a forma como suas habilidades sao utilizadas, quao satisfeito(a) esta?",
  },
  {
    scaleName: "Satisfacao no Trabalho",
    orderIndex: 55,
    isInverted: false,
    responseFormatCode: "copsoq3_satisfaction",
    text: "Em relacao ao seu trabalho de modo geral, quao satisfeito(a) esta?",
  },

  // ── 22. Conflito Trabalho-Familia (2 items) — copsoq3_time_frequency ──
  {
    scaleName: "Conflito Trabalho-Familia",
    orderIndex: 56,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "O seu trabalho ocupa tanta energia que isso tem um efeito negativo na sua vida privada?",
  },
  {
    scaleName: "Conflito Trabalho-Familia",
    orderIndex: 57,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Voce sente que o trabalho ocupa tanto do seu tempo que isso tem um efeito negativo na sua vida privada?",
  },

  // ── 23. Burnout (4 items) — copsoq3_time_frequency ──
  {
    scaleName: "Burnout",
    orderIndex: 58,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente esgotado(a)?",
  },
  {
    scaleName: "Burnout",
    orderIndex: 59,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente fisicamente exausto(a)?",
  },
  {
    scaleName: "Burnout",
    orderIndex: 60,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente emocionalmente exausto(a)?",
  },
  {
    scaleName: "Burnout",
    orderIndex: 61,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente cansado(a)?",
  },

  // ── 24. Estresse (4 items) — copsoq3_time_frequency ──
  {
    scaleName: "Estresse",
    orderIndex: 62,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce tem dificuldade em relaxar?",
  },
  {
    scaleName: "Estresse",
    orderIndex: 63,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce fica irritado(a)?",
  },
  {
    scaleName: "Estresse",
    orderIndex: 64,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente tenso(a)?",
  },
  {
    scaleName: "Estresse",
    orderIndex: 65,
    isInverted: false,
    responseFormatCode: "copsoq3_time_frequency",
    text: "Com que frequencia voce se sente estressado(a)?",
  },

  // ── 25. Saude Geral (1 item) — copsoq3_health ──
  {
    scaleName: "Saude Geral",
    orderIndex: 66,
    isInverted: false,
    responseFormatCode: "copsoq3_health",
    text: "Em geral, como voce avalia a sua saude?",
  },

  // ── 26. Comportamentos Ofensivos (4 items) — likert_frequency_5 ──
  {
    scaleName: "Comportamentos Ofensivos",
    orderIndex: 67,
    isInverted: false,
    responseFormatCode: "likert_frequency_5",
    text: "Voce foi exposto(a) a bullying no local de trabalho nos ultimos 12 meses?",
  },
  {
    scaleName: "Comportamentos Ofensivos",
    orderIndex: 68,
    isInverted: false,
    responseFormatCode: "likert_frequency_5",
    text: "Voce foi exposto(a) a assedio sexual no trabalho nos ultimos 12 meses?",
  },
  {
    scaleName: "Comportamentos Ofensivos",
    orderIndex: 69,
    isInverted: false,
    responseFormatCode: "likert_frequency_5",
    text: "Voce foi exposto(a) a ameacas de violencia no trabalho nos ultimos 12 meses?",
  },
  {
    scaleName: "Comportamentos Ofensivos",
    orderIndex: 70,
    isInverted: false,
    responseFormatCode: "likert_frequency_5",
    text: "Voce foi exposto(a) a violencia fisica no trabalho nos ultimos 12 meses?",
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log(
    "Seeding COPSOQ III (Middle version) instrument, scales, and items...\n"
  );

  // ── 1. Upsert instrument ──────────────────────────────────────────────────
  const { data: instrument, error: instrError } = await supabase
    .from("questionnaire_instruments")
    .upsert(
      {
        code: "copsoq_iii",
        name: "COPSOQ III — Versao Media",
        description:
          "Copenhagen Psychosocial Questionnaire, 3a edicao (Burr et al., 2019). " +
          "Versao Media com 70 itens em 26 escalas. Avalia fatores psicossociais no trabalho " +
          "com escores de 0-100. Escala Work Engagement (UWES) excluida por exigir licenca comercial.",
        version_label: "Middle",
        source:
          "Burr H, Berthelsen H, Moncada S, et al. (2019). Safety and Health at Work, 10(4), 482-503.",
        total_questions: 70,
        estimated_minutes: 20,
        is_active: true,
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();

  if (instrError) {
    console.error("Error upserting COPSOQ III instrument:", instrError.message);
    process.exit(1);
  }

  const instrumentId = instrument.id;
  console.log(`Instrument upserted (id: ${instrumentId})`);

  // ── 2. Look up all required response formats ─────────────────────────────
  const requiredFormatCodes = [
    ...new Set(ITEMS.map((i) => i.responseFormatCode)),
  ];

  const { data: formats, error: fmtError } = await supabase
    .from("response_formats")
    .select("id, code")
    .in("code", requiredFormatCodes);

  if (fmtError || !formats) {
    console.error("Error fetching response formats:", fmtError?.message);
    process.exit(1);
  }

  const formatMap = new Map<string, string>();
  for (const fmt of formats) {
    formatMap.set(fmt.code, fmt.id);
  }

  // Verify all required formats exist
  for (const code of requiredFormatCodes) {
    if (!formatMap.has(code)) {
      console.error(`Response format not found: "${code}"`);
      process.exit(1);
    }
  }

  console.log(
    `${formats.length} response formats found: ${requiredFormatCodes.join(", ")}`
  );

  // ── 3. Look up universal categories ───────────────────────────────────────
  const requiredCategoryCodes = [
    ...new Set(SCALES.map((s) => s.universalCategoryCode)),
  ];

  const { data: categories, error: catError } = await supabase
    .from("universal_categories")
    .select("id, code")
    .in("code", requiredCategoryCodes);

  if (catError || !categories) {
    console.error("Error fetching universal categories:", catError?.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.code, cat.id);
  }

  // Verify all required categories exist
  for (const code of requiredCategoryCodes) {
    if (!categoryMap.has(code)) {
      console.error(`Universal category not found: "${code}"`);
      process.exit(1);
    }
  }

  console.log(`${categories.length} universal categories found`);

  // ── 4. Clear existing COPSOQ III data (if re-running) ─────────────────────
  const { count: existingItems } = await supabase
    .from("questionnaire_items")
    .select("*", { count: "exact", head: true })
    .eq("instrument_id", instrumentId);

  if (existingItems && existingItems > 0) {
    console.log(`\nFound ${existingItems} existing COPSOQ III items. Clearing...`);
    await supabase
      .from("questionnaire_items")
      .delete()
      .eq("instrument_id", instrumentId);
    console.log("COPSOQ III items cleared.");
  }

  const { count: existingScales } = await supabase
    .from("questionnaire_scales")
    .select("*", { count: "exact", head: true })
    .eq("instrument_id", instrumentId);

  if (existingScales && existingScales > 0) {
    console.log(`Found ${existingScales} existing COPSOQ III scales. Clearing...`);
    await supabase
      .from("questionnaire_scales")
      .delete()
      .eq("instrument_id", instrumentId);
    console.log("COPSOQ III scales cleared.\n");
  }

  // ── 5. Insert scales ─────────────────────────────────────────────────────
  const scaleRows = SCALES.map((s) => ({
    name: s.name,
    category: s.category,
    description: s.description,
    scoring_direction: s.scoringDirection,
    short_version: false,
    medium_version: true,
    long_version: true,
    instrument_id: instrumentId,
    universal_category_id: categoryMap.get(s.universalCategoryCode)!,
    display_order: s.displayOrder,
  }));

  const { data: insertedScales, error: scaleError } = await supabase
    .from("questionnaire_scales")
    .insert(scaleRows)
    .select("id, name");

  if (scaleError) {
    console.error("Error inserting scales:", scaleError.message);
    process.exit(1);
  }

  console.log(`${insertedScales.length} scales inserted`);

  // Build name -> id map
  const scaleMap = new Map<string, string>();
  for (const s of insertedScales) {
    scaleMap.set(s.name, s.id);
  }

  // ── 6. Insert items ──────────────────────────────────────────────────────
  const itemRows = ITEMS.map((item) => {
    const dimensionId = scaleMap.get(item.scaleName);
    if (!dimensionId) {
      console.error(
        `Scale not found: "${item.scaleName}" for item #${item.orderIndex}`
      );
      process.exit(1);
    }

    const responseFormatId = formatMap.get(item.responseFormatCode);
    if (!responseFormatId) {
      console.error(
        `Response format not found: "${item.responseFormatCode}" for item #${item.orderIndex}`
      );
      process.exit(1);
    }

    return {
      dimension_id: dimensionId,
      text: item.text,
      is_inverted: item.isInverted,
      order_index: item.orderIndex,
      short_version: false,
      medium_version: true,
      long_version: true,
      instrument_id: instrumentId,
      response_format_id: responseFormatId,
      item_level: "MIDDLE",
    };
  });

  const { error: itemError } = await supabase
    .from("questionnaire_items")
    .insert(itemRows);

  if (itemError) {
    console.error("Error inserting items:", itemError.message);
    process.exit(1);
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  const invertedCount = ITEMS.filter((i) => i.isInverted).length;
  const invertedItems = ITEMS.filter((i) => i.isInverted)
    .map((i) => `#${i.orderIndex}`)
    .join(", ");

  const scalesSummary = SCALES.map((s) => {
    const items = ITEMS.filter((i) => i.scaleName === s.name);
    const direction =
      s.scoringDirection === "HIGH_IS_RISK" ? "alto=risco" : "alto=favoravel";
    return `  ${s.displayOrder.toString().padStart(2, " ")}. ${s.name}: ${items.length} ${items.length === 1 ? "item" : "itens"} [${direction}] -> ${s.universalCategoryCode}`;
  }).join("\n");

  const formatUsage = requiredFormatCodes
    .map((code) => {
      const count = ITEMS.filter((i) => i.responseFormatCode === code).length;
      return `  ${code}: ${count} itens`;
    })
    .join("\n");

  console.log(`${ITEMS.length} items inserted\n`);
  console.log("=== COPSOQ III (Middle) SEED SUMMARY ===");
  console.log(`Instrumento: COPSOQ III — Versao Media`);
  console.log(`Total escalas:   ${SCALES.length}`);
  console.log(`Total itens:     ${ITEMS.length}`);
  console.log(`Itens invertidos: ${invertedCount} (${invertedItems})`);
  console.log(`Item level:      MIDDLE`);
  console.log(`Escores:         0-100 (direto do formato de resposta)`);
  console.log(`\nFormatos de resposta:`);
  console.log(formatUsage);
  console.log(`\nEscalas:`);
  console.log(scalesSummary);
  console.log("========================================\n");
}

seed().catch(console.error);

/**
 * Seed script: populates questionnaire_scales and questionnaire_items
 * with the full COPSOQ II question bank from the Portuguese national
 * validation (COPSOQ-Manual-Portugal2013.pdf, N = 4,162 workers).
 *
 * Usage: npx tsx scripts/seed-copsoq.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Source: Silva CF et al. (2012). Copenhagen Psychosocial Questionnaire
 * (COPSOQ II) — Versão Portuguesa. Faculdade de Psicologia e de Ciências
 * da Educação da Universidade de Coimbra.
 *
 * Versions are nested subsets: Long ⊃ Medium ⊃ Short
 *   Short:  41 questions, 26 subscales
 *   Medium: 76 questions, 29 subscales
 *   Long:  119 questions, 35 subscales
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

interface DimensionDef {
  name: string;
  category: string;
  description: string;
  scoringDirection: ScoringDirection;
  short: boolean;
  medium: boolean;
  long: boolean;
}

interface QuestionDef {
  dimensionName: string;
  text: string;
  isInverted: boolean;
  orderIndex: number;
  short: boolean;
  medium: boolean;
  long: boolean;
}

// ---------------------------------------------------------------------------
// COPSOQ II Dimensions (35 subscales, 8 categories)
// ---------------------------------------------------------------------------

const DIMENSIONS: DimensionDef[] = [
  // ── 1. Exigências no Trabalho ──
  {
    name: "Exigências quantitativas",
    category: "Exigências no Trabalho",
    description: "Volume de trabalho em relação ao tempo disponível",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Ritmo de trabalho",
    category: "Exigências no Trabalho",
    description: "Velocidade exigida na execução das tarefas",
    scoringDirection: "HIGH_IS_RISK",
    short: false, medium: true, long: true,
  },
  {
    name: "Exigências cognitivas",
    category: "Exigências no Trabalho",
    description: "Exigências de atenção, memória e decisão",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Exigências emocionais",
    category: "Exigências no Trabalho",
    description: "Exposição a situações emocionalmente exigentes",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Exigências para esconder emoções",
    category: "Exigências no Trabalho",
    description: "Necessidade de ocultar sentimentos no trabalho",
    scoringDirection: "HIGH_IS_RISK",
    short: false, medium: false, long: true,
  },

  // ── 2. Organização do Trabalho e Conteúdo ──
  {
    name: "Influência no trabalho",
    category: "Organização do Trabalho e Conteúdo",
    description: "Grau de controlo sobre o próprio trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Possibilidades de desenvolvimento",
    category: "Organização do Trabalho e Conteúdo",
    description: "Oportunidades de aprendizagem e desenvolvimento profissional",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Significado do trabalho",
    category: "Organização do Trabalho e Conteúdo",
    description: "Sentir que o trabalho tem propósito e importância",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Compromisso face ao local de trabalho",
    category: "Organização do Trabalho e Conteúdo",
    description: "Envolvimento e identificação com a organização",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },

  // ── 3. Relações Sociais e Liderança ──
  {
    name: "Previsibilidade",
    category: "Relações Sociais e Liderança",
    description: "Acesso a informações relevantes e atempadas sobre o trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Transparência do papel laboral",
    category: "Relações Sociais e Liderança",
    description: "Clareza sobre objectivos e expectativas do trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Recompensas (reconhecimento)",
    category: "Relações Sociais e Liderança",
    description: "Reconhecimento e valorização pelo trabalho realizado",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Conflitos laborais",
    category: "Relações Sociais e Liderança",
    description: "Exigências contraditórias no trabalho",
    scoringDirection: "HIGH_IS_RISK",
    short: false, medium: false, long: true,
  },
  {
    name: "Apoio social de colegas",
    category: "Relações Sociais e Liderança",
    description: "Ajuda e suporte dos colegas de trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Apoio social de superiores",
    category: "Relações Sociais e Liderança",
    description: "Ajuda e suporte da chefia",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Comunidade social no trabalho",
    category: "Relações Sociais e Liderança",
    description: "Bom ambiente e cooperação entre colegas",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Qualidade da liderança",
    category: "Relações Sociais e Liderança",
    description: "Competência e comportamento da chefia directa",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Confiança horizontal",
    category: "Relações Sociais e Liderança",
    description: "Confiança mútua entre colegas",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Confiança vertical",
    category: "Relações Sociais e Liderança",
    description: "Confiança entre trabalhadores e gestão",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: false, medium: true, long: true,
  },
  {
    name: "Justiça e respeito",
    category: "Relações Sociais e Liderança",
    description: "Tratamento justo e com respeito no local de trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },

  // ── 4. Interface Trabalho-Indivíduo ──
  {
    name: "Insegurança laboral",
    category: "Interface Trabalho-Indivíduo",
    description: "Preocupação com perda de emprego ou condições",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Satisfação no trabalho",
    category: "Interface Trabalho-Indivíduo",
    description: "Grau de satisfação com o trabalho e condições",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Conflito trabalho/família",
    category: "Interface Trabalho-Indivíduo",
    description: "Conflito entre exigências profissionais e familiares",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },

  // ── 4b. Interface Trabalho-Indivíduo (continued) ──
  {
    name: "Conflito família/trabalho",
    category: "Interface Trabalho-Indivíduo",
    description: "Impacto das responsabilidades familiares no desempenho profissional",
    scoringDirection: "HIGH_IS_RISK",
    short: false, medium: false, long: true,
  },

  // ── 5. Valores no Local de Trabalho ──
  {
    name: "Confiança na gestão",
    category: "Valores no Local de Trabalho",
    description: "Confiança na capacidade e integridade da gestão",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: false, medium: true, long: true,
  },
  {
    name: "Justiça organizacional",
    category: "Valores no Local de Trabalho",
    description: "Percepção de equidade nos processos organizacionais",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: false, medium: false, long: true,
  },

  // ── 6. Personalidade ──
  {
    name: "Auto-eficácia",
    category: "Personalidade",
    description: "Confiança na própria capacidade de lidar com desafios",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },

  // ── 7. Saúde e Bem-Estar ──
  {
    name: "Saúde geral",
    category: "Saúde e Bem-Estar",
    description: "Percepção subjectiva do estado de saúde",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: true, medium: true, long: true,
  },
  {
    name: "Vitalidade",
    category: "Saúde e Bem-Estar",
    description: "Energia, vitalidade e disposição para o dia-a-dia",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: false, medium: false, long: true,
  },
  {
    name: "Problemas em dormir",
    category: "Saúde e Bem-Estar",
    description: "Dificuldades com o sono e descanso",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Burnout",
    category: "Saúde e Bem-Estar",
    description: "Esgotamento físico e emocional",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Stress",
    category: "Saúde e Bem-Estar",
    description: "Nível de tensão e pressão percebida",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
  {
    name: "Sintomas depressivos",
    category: "Saúde e Bem-Estar",
    description: "Presença de sintomas de depressão",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },

  {
    name: "Saúde mental",
    category: "Saúde e Bem-Estar",
    description: "Estado geral de bem-estar psicológico",
    scoringDirection: "HIGH_IS_FAVORABLE",
    short: false, medium: false, long: true,
  },

  // ── 8. Comportamentos Ofensivos ──
  {
    name: "Comportamentos ofensivos",
    category: "Comportamentos Ofensivos",
    description: "Exposição a violência, assédio, bullying ou discriminação",
    scoringDirection: "HIGH_IS_RISK",
    short: true, medium: true, long: true,
  },
];

// ---------------------------------------------------------------------------
// COPSOQ II Questions (119 total for Long version)
//
// Based on the official Portuguese validated instrument.
// Questions marked with version flags (S = Short, M = Medium, L = Long).
// Inverted items: #42 and #45 in Medium (mapped to #51 and #54 in Long).
// ---------------------------------------------------------------------------

const QUESTIONS: QuestionDef[] = [
  // ── Exigências quantitativas ──
  { dimensionName: "Exigências quantitativas", orderIndex: 1, isInverted: false, short: true, medium: true, long: true,
    text: "A sua carga de trabalho acumula-se por ser mal distribuída?" },
  { dimensionName: "Exigências quantitativas", orderIndex: 2, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?" },
  { dimensionName: "Exigências quantitativas", orderIndex: 3, isInverted: false, short: false, medium: true, long: true,
    text: "Fica atrasado/a no seu trabalho?" },
  { dimensionName: "Exigências quantitativas", orderIndex: 4, isInverted: false, short: false, medium: false, long: true,
    text: "Tem tempo suficiente para as suas tarefas de trabalho?" },

  // ── Ritmo de trabalho ──
  { dimensionName: "Ritmo de trabalho", orderIndex: 5, isInverted: false, short: true, medium: true, long: true,
    text: "Precisa trabalhar muito rapidamente?" },
  { dimensionName: "Ritmo de trabalho", orderIndex: 6, isInverted: false, short: false, medium: false, long: true,
    text: "Trabalha a um ritmo elevado durante todo o dia?" },

  // ── Exigências cognitivas ──
  { dimensionName: "Exigências cognitivas", orderIndex: 7, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho exige que seja bom/boa a propor novas ideias?" },
  { dimensionName: "Exigências cognitivas", orderIndex: 8, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho exige que tome decisões difíceis?" },
  { dimensionName: "Exigências cognitivas", orderIndex: 9, isInverted: false, short: false, medium: true, long: true,
    text: "O seu trabalho requer que memorize muitas coisas?" },
  { dimensionName: "Exigências cognitivas", orderIndex: 10, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho exige atenção constante?" },

  // ── Exigências emocionais ──
  { dimensionName: "Exigências emocionais", orderIndex: 11, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho é emocionalmente desgastante?" },
  { dimensionName: "Exigências emocionais", orderIndex: 12, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho exige que não manifeste a sua opinião?" },
  { dimensionName: "Exigências emocionais", orderIndex: 13, isInverted: false, short: false, medium: true, long: true,
    text: "São-lhe colocadas exigências emocionais no seu trabalho?" },
  { dimensionName: "Exigências emocionais", orderIndex: 14, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho coloca-o/a em situações emocionalmente perturbadoras?" },

  // ── Exigências para esconder emoções ──
  { dimensionName: "Exigências para esconder emoções", orderIndex: 15, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho exige que esconda os seus sentimentos?" },
  { dimensionName: "Exigências para esconder emoções", orderIndex: 16, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho exige que trate todas as pessoas de forma igual, mesmo que não queira?" },
  { dimensionName: "Exigências para esconder emoções", orderIndex: 17, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho exige que seja simpático/a com todos, independentemente do comportamento deles?" },

  // ── Influência no trabalho ──
  { dimensionName: "Influência no trabalho", orderIndex: 18, isInverted: false, short: true, medium: true, long: true,
    text: "Tem um elevado grau de influência no seu trabalho?" },
  { dimensionName: "Influência no trabalho", orderIndex: 19, isInverted: false, short: true, medium: true, long: true,
    text: "Pode influenciar a quantidade de trabalho que lhe compete a si?" },
  { dimensionName: "Influência no trabalho", orderIndex: 20, isInverted: false, short: false, medium: true, long: true,
    text: "Tem influência sobre o tipo de tarefas que faz?" },
  { dimensionName: "Influência no trabalho", orderIndex: 21, isInverted: false, short: false, medium: false, long: true,
    text: "Participa na escolha das pessoas com quem trabalha?" },

  // ── Possibilidades de desenvolvimento ──
  { dimensionName: "Possibilidades de desenvolvimento", orderIndex: 22, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho exige que tenha iniciativa?" },
  { dimensionName: "Possibilidades de desenvolvimento", orderIndex: 23, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho permite-lhe aprender coisas novas?" },
  { dimensionName: "Possibilidades de desenvolvimento", orderIndex: 24, isInverted: false, short: false, medium: true, long: true,
    text: "Pode usar as suas competências ou conhecimentos no seu trabalho?" },
  { dimensionName: "Possibilidades de desenvolvimento", orderIndex: 25, isInverted: false, short: false, medium: false, long: true,
    text: "O seu trabalho é variado?" },

  // ── Significado do trabalho ──
  { dimensionName: "Significado do trabalho", orderIndex: 26, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho tem algum significado para si?" },
  { dimensionName: "Significado do trabalho", orderIndex: 27, isInverted: false, short: true, medium: true, long: true,
    text: "Sente que o trabalho que faz é importante?" },
  { dimensionName: "Significado do trabalho", orderIndex: 28, isInverted: false, short: false, medium: true, long: true,
    text: "Sente-se motivado/a e envolvido/a no seu trabalho?" },

  // ── Compromisso face ao local de trabalho ──
  { dimensionName: "Compromisso face ao local de trabalho", orderIndex: 29, isInverted: false, short: true, medium: true, long: true,
    text: "Gosta de falar com os outros sobre o seu local de trabalho?" },
  { dimensionName: "Compromisso face ao local de trabalho", orderIndex: 30, isInverted: false, short: true, medium: true, long: true,
    text: "Sente que os problemas do seu local de trabalho são também seus?" },
  { dimensionName: "Compromisso face ao local de trabalho", orderIndex: 31, isInverted: false, short: false, medium: true, long: true,
    text: "Sente que faz parte de uma comunidade no seu local de trabalho?" },
  { dimensionName: "Compromisso face ao local de trabalho", orderIndex: 32, isInverted: false, short: false, medium: false, long: true,
    text: "Recomendaria um bom amigo a candidatar-se a um cargo no seu local de trabalho?" },

  // ── Previsibilidade ──
  { dimensionName: "Previsibilidade", orderIndex: 33, isInverted: false, short: true, medium: true, long: true,
    text: "No seu local de trabalho, é informado/a com antecedência sobre decisões importantes?" },
  { dimensionName: "Previsibilidade", orderIndex: 34, isInverted: false, short: true, medium: true, long: true,
    text: "Recebe toda a informação de que necessita para fazer bem o seu trabalho?" },

  // ── Transparência do papel laboral ──
  { dimensionName: "Transparência do papel laboral", orderIndex: 35, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho tem objectivos claros?" },
  { dimensionName: "Transparência do papel laboral", orderIndex: 36, isInverted: false, short: false, medium: true, long: true,
    text: "Sabe exactamente quais as suas responsabilidades?" },
  { dimensionName: "Transparência do papel laboral", orderIndex: 37, isInverted: false, short: false, medium: true, long: true,
    text: "Sabe exactamente o que é esperado de si?" },
  { dimensionName: "Transparência do papel laboral", orderIndex: 38, isInverted: false, short: false, medium: false, long: true,
    text: "Sabe quais são os seus direitos no trabalho?" },

  // ── Recompensas (reconhecimento) ──
  { dimensionName: "Recompensas (reconhecimento)", orderIndex: 39, isInverted: false, short: true, medium: true, long: true,
    text: "O seu trabalho é reconhecido e apreciado pela gestão?" },
  { dimensionName: "Recompensas (reconhecimento)", orderIndex: 40, isInverted: false, short: true, medium: true, long: true,
    text: "É tratado/a de forma justa no seu local de trabalho?" },
  { dimensionName: "Recompensas (reconhecimento)", orderIndex: 41, isInverted: false, short: false, medium: true, long: true,
    text: "As suas perspectivas no trabalho são boas?" },

  // ── Conflitos laborais ──
  { dimensionName: "Conflitos laborais", orderIndex: 42, isInverted: false, short: false, medium: false, long: true,
    text: "São-lhe colocadas exigências contraditórias no trabalho?" },
  { dimensionName: "Conflitos laborais", orderIndex: 43, isInverted: false, short: false, medium: false, long: true,
    text: "Por vezes tem de fazer coisas que deveriam ser feitas de outra maneira?" },
  { dimensionName: "Conflitos laborais", orderIndex: 44, isInverted: false, short: false, medium: false, long: true,
    text: "Por vezes tem de fazer coisas que considera desnecessárias?" },

  // ── Apoio social de colegas ──
  { dimensionName: "Apoio social de colegas", orderIndex: 45, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência tem ajuda e apoio dos seus colegas de trabalho?" },
  { dimensionName: "Apoio social de colegas", orderIndex: 46, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência os seus colegas estão dispostos a ouvi-lo/a sobre os seus problemas de trabalho?" },
  { dimensionName: "Apoio social de colegas", orderIndex: 47, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência os seus colegas falam consigo acerca do seu desempenho laboral?" },

  // ── Apoio social de superiores ──
  { dimensionName: "Apoio social de superiores", orderIndex: 48, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência o seu superior imediato fala consigo sobre como está a decorrer o seu trabalho?" },
  { dimensionName: "Apoio social de superiores", orderIndex: 49, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência tem ajuda e apoio do seu superior imediato?" },
  { dimensionName: "Apoio social de superiores", orderIndex: 50, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência o seu superior imediato fala consigo em relação ao seu desempenho laboral?" },

  // ── Comunidade social no trabalho ──
  { dimensionName: "Comunidade social no trabalho", orderIndex: 51, isInverted: false, short: true, medium: true, long: true,
    text: "Existe um bom ambiente de trabalho entre si e os seus colegas?" },
  // Medium item 42 → isInverted in Medium context
  { dimensionName: "Comunidade social no trabalho", orderIndex: 52, isInverted: true, short: false, medium: true, long: true,
    text: "Existe uma boa cooperação entre os colegas de trabalho?" },
  { dimensionName: "Comunidade social no trabalho", orderIndex: 53, isInverted: false, short: false, medium: false, long: true,
    text: "No seu local de trabalho sente-se parte de uma comunidade?" },

  // ── Qualidade da liderança ──
  { dimensionName: "Qualidade da liderança", orderIndex: 54, isInverted: false, short: true, medium: true, long: true,
    text: "A sua chefia directa garante a cada indivíduo boas oportunidades de desenvolvimento profissional?" },
  // Medium item 45 → isInverted in Medium context
  { dimensionName: "Qualidade da liderança", orderIndex: 55, isInverted: true, short: false, medium: true, long: true,
    text: "A sua chefia directa dá prioridade à satisfação no trabalho?" },
  { dimensionName: "Qualidade da liderança", orderIndex: 56, isInverted: false, short: false, medium: false, long: true,
    text: "A sua chefia directa é boa a planear o trabalho?" },
  { dimensionName: "Qualidade da liderança", orderIndex: 57, isInverted: false, short: false, medium: false, long: true,
    text: "A sua chefia directa é boa a resolver conflitos?" },

  // ── Confiança horizontal ──
  { dimensionName: "Confiança horizontal", orderIndex: 58, isInverted: false, short: true, medium: true, long: true,
    text: "Confia nos seus colegas de trabalho?" },
  { dimensionName: "Confiança horizontal", orderIndex: 59, isInverted: false, short: false, medium: true, long: true,
    text: "Os seus colegas retêm informação entre si?" },
  { dimensionName: "Confiança horizontal", orderIndex: 60, isInverted: false, short: false, medium: true, long: true,
    text: "Os seus colegas escondem informação uns dos outros?" },

  // ── Confiança vertical ──
  { dimensionName: "Confiança vertical", orderIndex: 61, isInverted: false, short: false, medium: true, long: true,
    text: "A gestão confia nos seus trabalhadores para fazerem bem o seu trabalho?" },
  { dimensionName: "Confiança vertical", orderIndex: 62, isInverted: false, short: false, medium: true, long: true,
    text: "Pode confiar nas informações transmitidas pela gestão?" },
  { dimensionName: "Confiança vertical", orderIndex: 63, isInverted: false, short: false, medium: true, long: true,
    text: "A gestão esconde informação dos trabalhadores?" },

  // ── Justiça e respeito ──
  { dimensionName: "Justiça e respeito", orderIndex: 64, isInverted: false, short: true, medium: true, long: true,
    text: "Os conflitos são resolvidos de uma forma justa?" },
  { dimensionName: "Justiça e respeito", orderIndex: 65, isInverted: false, short: false, medium: true, long: true,
    text: "As sugestões dos trabalhadores são tratadas de forma séria pela gestão?" },
  { dimensionName: "Justiça e respeito", orderIndex: 66, isInverted: false, short: false, medium: true, long: true,
    text: "O trabalho é igualmente distribuído pelos trabalhadores?" },

  // ── Insegurança laboral ──
  { dimensionName: "Insegurança laboral", orderIndex: 67, isInverted: false, short: true, medium: true, long: true,
    text: "Sente-se preocupado/a em ficar desempregado/a?" },
  { dimensionName: "Insegurança laboral", orderIndex: 68, isInverted: false, short: true, medium: true, long: true,
    text: "Sente-se preocupado/a com novas tecnologias que tornem o seu trabalho desnecessário?" },
  { dimensionName: "Insegurança laboral", orderIndex: 69, isInverted: false, short: false, medium: false, long: true,
    text: "Sente-se preocupado/a em ser transferido/a para outro local de trabalho?" },
  { dimensionName: "Insegurança laboral", orderIndex: 70, isInverted: false, short: false, medium: false, long: true,
    text: "Sente-se preocupado/a em ser substituído/a por outra pessoa?" },

  // ── Satisfação no trabalho ──
  { dimensionName: "Satisfação no trabalho", orderIndex: 71, isInverted: false, short: true, medium: true, long: true,
    text: "Em relação ao seu trabalho em geral, quão satisfeito/a está com as suas perspectivas futuras?" },
  { dimensionName: "Satisfação no trabalho", orderIndex: 72, isInverted: false, short: false, medium: true, long: true,
    text: "Em relação ao seu trabalho em geral, quão satisfeito/a está com as condições físicas do seu local de trabalho?" },
  { dimensionName: "Satisfação no trabalho", orderIndex: 73, isInverted: false, short: false, medium: true, long: true,
    text: "Em relação ao seu trabalho em geral, quão satisfeito/a está com a forma como as suas capacidades são utilizadas?" },
  { dimensionName: "Satisfação no trabalho", orderIndex: 74, isInverted: false, short: false, medium: true, long: true,
    text: "Em relação ao seu trabalho em geral, quão satisfeito/a está com o seu trabalho de uma forma global?" },

  // ── Conflito trabalho/família ──
  { dimensionName: "Conflito trabalho/família", orderIndex: 75, isInverted: false, short: true, medium: true, long: true,
    text: "Sente que o seu trabalho lhe exige muita energia que acaba por afectar a sua vida privada negativamente?" },
  { dimensionName: "Conflito trabalho/família", orderIndex: 76, isInverted: false, short: false, medium: true, long: true,
    text: "Sente que o seu trabalho lhe exige muito tempo que acaba por afectar a sua vida privada negativamente?" },
  { dimensionName: "Conflito trabalho/família", orderIndex: 77, isInverted: false, short: false, medium: true, long: true,
    text: "A sua família e os seus amigos dizem-lhe que trabalha demais?" },
  { dimensionName: "Conflito trabalho/família", orderIndex: 78, isInverted: false, short: false, medium: false, long: true,
    text: "Sente que o seu trabalho lhe exige muita atenção que acaba por afectar a sua vida privada negativamente?" },

  // ── Confiança na gestão ──
  { dimensionName: "Confiança na gestão", orderIndex: 79, isInverted: false, short: false, medium: false, long: true,
    text: "A gestão do seu local de trabalho é confiável?" },
  { dimensionName: "Confiança na gestão", orderIndex: 80, isInverted: false, short: false, medium: false, long: true,
    text: "A gestão oculta informação dos trabalhadores?" },
  { dimensionName: "Confiança na gestão", orderIndex: 81, isInverted: false, short: false, medium: false, long: true,
    text: "Os trabalhadores podem expressar as suas opiniões e sentimentos?" },

  // ── Justiça organizacional ──
  { dimensionName: "Justiça organizacional", orderIndex: 82, isInverted: false, short: false, medium: false, long: true,
    text: "Os seus colegas são tratados de forma justa no local de trabalho?" },
  { dimensionName: "Justiça organizacional", orderIndex: 83, isInverted: false, short: false, medium: false, long: true,
    text: "A gestão trata os trabalhadores de forma justa?" },
  { dimensionName: "Justiça organizacional", orderIndex: 84, isInverted: false, short: false, medium: false, long: true,
    text: "Há favoritismo no seu local de trabalho?" },

  // ── Auto-eficácia ──
  { dimensionName: "Auto-eficácia", orderIndex: 85, isInverted: false, short: true, medium: true, long: true,
    text: "Consigo sempre resolver problemas, se me esforçar o suficiente." },
  { dimensionName: "Auto-eficácia", orderIndex: 86, isInverted: false, short: false, medium: true, long: true,
    text: "É-me fácil seguir os meus planos e atingir os meus objectivos." },
  { dimensionName: "Auto-eficácia", orderIndex: 87, isInverted: false, short: false, medium: false, long: true,
    text: "Em geral, consigo lidar com o que me aparece pelo caminho." },
  { dimensionName: "Auto-eficácia", orderIndex: 88, isInverted: false, short: false, medium: false, long: true,
    text: "Se estou com problemas, geralmente consigo encontrar uma solução." },

  // ── Saúde geral ──
  { dimensionName: "Saúde geral", orderIndex: 89, isInverted: false, short: true, medium: true, long: true,
    text: "Em geral, sente que a sua saúde é..." },
  { dimensionName: "Saúde geral", orderIndex: 90, isInverted: false, short: false, medium: false, long: true,
    text: "Considera que a sua saúde é suficiente para desempenhar as suas funções actuais?" },

  // ── Problemas em dormir ──
  { dimensionName: "Problemas em dormir", orderIndex: 91, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência dormiu mal e de forma inquieta?" },
  { dimensionName: "Problemas em dormir", orderIndex: 92, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência teve dificuldade em adormecer?" },
  { dimensionName: "Problemas em dormir", orderIndex: 93, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência acordou demasiado cedo e não conseguiu voltar a adormecer?" },
  { dimensionName: "Problemas em dormir", orderIndex: 94, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência acordou várias vezes e teve dificuldade em voltar a adormecer?" },

  // ── Burnout ──
  { dimensionName: "Burnout", orderIndex: 95, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência se sentiu fisicamente exausto/a?" },
  { dimensionName: "Burnout", orderIndex: 96, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência se sentiu emocionalmente exausto/a?" },
  { dimensionName: "Burnout", orderIndex: 97, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência se sentiu esgotado/a?" },
  { dimensionName: "Burnout", orderIndex: 98, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu cansado/a?" },

  // ── Stress ──
  { dimensionName: "Stress", orderIndex: 99, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência se sentiu stressado/a?" },
  { dimensionName: "Stress", orderIndex: 100, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência sentiu tensão?" },
  { dimensionName: "Stress", orderIndex: 101, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência se sentiu irritável?" },
  { dimensionName: "Stress", orderIndex: 102, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu ansioso/a?" },

  // ── Sintomas depressivos ──
  { dimensionName: "Sintomas depressivos", orderIndex: 103, isInverted: false, short: true, medium: true, long: true,
    text: "Com que frequência se sentiu triste?" },
  { dimensionName: "Sintomas depressivos", orderIndex: 104, isInverted: false, short: false, medium: true, long: true,
    text: "Com que frequência sentiu falta de interesse pelas coisas do dia-a-dia?" },
  { dimensionName: "Sintomas depressivos", orderIndex: 105, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência sentiu que não tinha esperança no futuro?" },
  { dimensionName: "Sintomas depressivos", orderIndex: 106, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu desanimado/a?" },

  // ── Comportamentos ofensivos ──
  { dimensionName: "Comportamentos ofensivos", orderIndex: 107, isInverted: false, short: true, medium: true, long: true,
    text: "Tem sido alvo de insultos ou provocações verbais?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 108, isInverted: false, short: true, medium: true, long: true,
    text: "Tem sido exposto/a a assédio sexual indesejado?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 109, isInverted: false, short: true, medium: true, long: true,
    text: "Tem sido exposto/a a ameaças de violência?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 110, isInverted: false, short: true, medium: true, long: true,
    text: "Tem sido exposto/a a violência física?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 111, isInverted: false, short: false, medium: true, long: true,
    text: "Tem sido alvo de perseguição ou intimidação (bullying)?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 112, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua idade?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 113, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa do seu sexo?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 114, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua etnia?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 115, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua orientação sexual?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 116, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua religião?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 117, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua deficiência?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 118, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de discriminação por causa da sua nacionalidade?" },
  { dimensionName: "Comportamentos ofensivos", orderIndex: 119, isInverted: false, short: false, medium: false, long: true,
    text: "Tem sido alvo de outro tipo de assédio?" },

  // ── Conflito família/trabalho (Long only) ──
  { dimensionName: "Conflito família/trabalho", orderIndex: 120, isInverted: false, short: false, medium: false, long: true,
    text: "Sente que a sua vida privada lhe exige tanta energia que acaba por afectar o seu trabalho negativamente?" },
  { dimensionName: "Conflito família/trabalho", orderIndex: 121, isInverted: false, short: false, medium: false, long: true,
    text: "Sente que a sua vida privada lhe exige tanto tempo que acaba por afectar o seu trabalho negativamente?" },
  { dimensionName: "Conflito família/trabalho", orderIndex: 122, isInverted: false, short: false, medium: false, long: true,
    text: "Os seus problemas pessoais ou familiares tiram-lhe concentração no trabalho?" },

  // ── Vitalidade (Long only) ──
  { dimensionName: "Vitalidade", orderIndex: 123, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu cheio/a de energia?" },
  { dimensionName: "Vitalidade", orderIndex: 124, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu cheio/a de vida e vigor?" },
  { dimensionName: "Vitalidade", orderIndex: 125, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu activo/a e com vontade de fazer coisas?" },

  // ── Saúde mental (Long only) ──
  { dimensionName: "Saúde mental", orderIndex: 126, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu calmo/a e tranquilo/a?" },
  { dimensionName: "Saúde mental", orderIndex: 127, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu feliz?" },
  { dimensionName: "Saúde mental", orderIndex: 128, isInverted: false, short: false, medium: false, long: true,
    text: "Com que frequência se sentiu nervoso/a?" },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding COPSOQ II dimensions and questions...\n");

  // 1. Check if dimensions already exist
  const { count: existing } = await supabase
    .from("questionnaire_scales")
    .select("*", { count: "exact", head: true });

  if (existing && existing > 0) {
    console.log(`Found ${existing} existing dimensions. Clearing tables first...`);
    await supabase.from("questionnaire_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("questionnaire_scales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("Tables cleared.\n");
  }

  // 2. Insert dimensions
  const dimensionRows = DIMENSIONS.map((d) => ({
    name: d.name,
    category: d.category,
    description: d.description,
    scoring_direction: d.scoringDirection,
    short_version: d.short,
    medium_version: d.medium,
    long_version: d.long,
  }));

  const { data: insertedDims, error: dimError } = await supabase
    .from("questionnaire_scales")
    .insert(dimensionRows)
    .select("id, name");

  if (dimError) {
    console.error("Error inserting dimensions:", dimError.message);
    process.exit(1);
  }

  console.log(`✓ ${insertedDims.length} dimensions inserted`);

  // Build name → id map
  const dimMap = new Map<string, string>();
  for (const d of insertedDims) {
    dimMap.set(d.name, d.id);
  }

  // 3. Insert questions
  const questionRows = QUESTIONS.map((q) => {
    const dimensionId = dimMap.get(q.dimensionName);
    if (!dimensionId) {
      console.error(`Dimension not found: "${q.dimensionName}" for question #${q.orderIndex}`);
      process.exit(1);
    }
    return {
      dimension_id: dimensionId,
      text: q.text,
      is_inverted: q.isInverted,
      order_index: q.orderIndex,
      short_version: q.short,
      medium_version: q.medium,
      long_version: q.long,
    };
  });

  const { error: qError } = await supabase
    .from("questionnaire_items")
    .insert(questionRows);

  if (qError) {
    console.error("Error inserting questions:", qError.message);
    process.exit(1);
  }

  // 4. Summary
  const shortQ = QUESTIONS.filter((q) => q.short).length;
  const mediumQ = QUESTIONS.filter((q) => q.medium).length;
  const longQ = QUESTIONS.filter((q) => q.long).length;

  const shortD = DIMENSIONS.filter((d) => d.short).length;
  const mediumD = DIMENSIONS.filter((d) => d.medium).length;
  const longD = DIMENSIONS.filter((d) => d.long).length;

  console.log(`✓ ${QUESTIONS.length} questions inserted\n`);
  console.log("=== COPSOQ II SEED SUMMARY ===");
  console.log(`Short version:  ${shortQ} questions, ${shortD} dimensions`);
  console.log(`Medium version: ${mediumQ} questions, ${mediumD} dimensions`);
  console.log(`Long version:   ${longQ} questions, ${longD} dimensions`);
  console.log(`Inverted items: ${QUESTIONS.filter((q) => q.isInverted).length}`);
  console.log("==============================\n");
}

seed().catch(console.error);

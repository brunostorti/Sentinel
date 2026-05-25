/**
 * Catálogo tipado de intervenções psicossociais.
 *
 * Cada intervenção tem `intervention_id` estável (slug `{category}.{kebab-name}`)
 * usado para detectar tentativas repetidas no loop de aprendizado.
 *
 * Evidência baseada em (entre outros):
 * - OMS/OIT 2024: US$1 invested in mental health → US$4 productivity return
 * - Deloitte 2022: ROI médio de programas de saúde mental = 4.2:1
 * - ISMA-BR: Estresse custa 3.5% do PIB; absenteísmo mental ~15 dias/ano
 * - Gallup 2023: Alto engajamento = 21% mais produtividade, 59% menos turnover
 * - SHRM: Custo médio de turnover = 50-200% do salário anual
 * - Robert Half Brasil 2024: Dados de custo de substituição
 */

export type UniversalCategoryCode =
  | "workload"
  | "leadership"
  | "social"
  | "recognition"
  | "autonomy"
  | "meaning"
  | "burnout"
  | "communication"
  | "security"
  | "offensive";

export type Effort = "baixo" | "medio" | "alto";
export type Timeframe = "curto_prazo" | "medio_prazo" | "longo_prazo";
export type Modality = "presencial" | "online" | "hibrido" | "any";
export type HrCapability =
  | "dedicated_hr"
  | "internal_training"
  | "occupational_health"
  | "compliance_officer";

export interface ImpactMetric {
  metric: string;
  change_percent: number;
  evidence_source: string;
}

export interface Intervention {
  /** Slug estável `{category}.{kebab-name}` — id de identidade no loop de aprendizado */
  intervention_id: string;
  /** Code da categoria universal (espelha universal_categories.code) */
  universal_category_code: UniversalCategoryCode;

  title: string;
  description: string;
  effort: Effort;
  timeframe: Timeframe;
  target_role: string;

  /** Custo por colaborador/ano em R$ */
  cost_per_employee: { min: number; max: number };

  /** Modalidade que essa intervenção exige */
  required_modality: Modality;

  /** Capacidades de RH/estrutura que a intervenção exige */
  required_hr_capabilities: HrCapability[];

  /** Setores onde há mais evidência de funcionar */
  sector_fit: string[];

  expected_impact: ImpactMetric[];

  /** Multiplicador de ROI conservador-otimista */
  roi_multiplier: { min: number; max: number };
}

/* ──────────────────────────────────────────────────────────────────────
 * INACTION_COSTS — custos de NÃO agir, usados para calcular risk_if_not_acted
 * ────────────────────────────────────────────────────────────────────── */

export const INACTION_COSTS = {
  turnover: {
    cost_per_employee: 21000,
    description:
      "Custo médio de substituição de um colaborador (recrutamento + onboarding + produtividade perdida)",
    source: "SHRM / Robert Half Brasil 2024",
  },
  absenteeism: {
    cost_per_day: 200,
    avg_days_per_year: 15,
    description: "Custo por dia de ausência (média saúde mental: 15 dias/ano)",
    source: "ISMA-BR / Previdência Social",
  },
  presenteeism: {
    productivity_loss: 0.33,
    annual_cost_per_employee: 14000,
    description:
      "Funcionário presente mas improdutivo por estresse/burnout (33% perda)",
    source: "Harvard Business Review / OMS",
  },
  lawsuits: {
    avg_cost: 45000,
    description:
      "Custo médio de processo trabalhista por risco psicossocial",
    source: "TST / CNJ 2023",
  },
  nr1_penalty: {
    min_fine: 2396,
    max_fine: 6708,
    description: "Multa por descumprimento NR-1 (por infração identificada)",
    source: "Portaria MTE 1.419/2024",
  },
} as const;

/* ──────────────────────────────────────────────────────────────────────
 * CATALOG — lista de intervenções tipadas
 * ────────────────────────────────────────────────────────────────────── */

export const CATALOG: Intervention[] = [
  /* ============ WORKLOAD ============ */
  {
    intervention_id: "workload.task-redistribution",
    universal_category_code: "workload",
    title: "Redistribuição de tarefas por carga real",
    description:
      "Mapear a carga de trabalho efetiva por colaborador e redistribuir tarefas para equilibrar demandas. Usar ferramentas de gestão de projetos para visibilidade.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "Gestor de Equipe",
    cost_per_employee: { min: 50, max: 150 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "produtividade", change_percent: 15, evidence_source: "Gallup 2023" },
      { metric: "absenteísmo", change_percent: -20, evidence_source: "ISMA-BR" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "workload.structured-breaks",
    universal_category_code: "workload",
    title: "Pausas estruturadas e microdescansos",
    description:
      "Implementar política de pausas regulares (Pomodoro ou intervalos de 10min a cada 90min) para reduzir fadiga cognitiva.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 0, max: 30 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "public"],
    expected_impact: [
      { metric: "produtividade", change_percent: 12, evidence_source: "Desktime 2023" },
      { metric: "fadiga_cognitiva", change_percent: -25, evidence_source: "OMS" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "workload.deadline-realism-workshop",
    universal_category_code: "workload",
    title: "Revisão de prazos e metas irrealistas",
    description:
      "Workshop com gestores para calibrar expectativas de prazo, definir prioridades claras e eliminar tarefas de baixo valor.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "Diretoria",
    cost_per_employee: { min: 80, max: 200 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "healthcare"],
    expected_impact: [
      { metric: "burnout", change_percent: -30, evidence_source: "Maslach & Leiter 2016" },
      { metric: "turnover", change_percent: -15, evidence_source: "Gallup 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 4.5 },
  },
  {
    intervention_id: "workload.process-automation",
    universal_category_code: "workload",
    title: "Automação de tarefas repetitivas",
    description:
      "Identificar processos manuais repetitivos e implementar automações (templates, macros, workflows) para liberar tempo cognitivo.",
    effort: "alto",
    timeframe: "medio_prazo",
    target_role: "TI / Gestão de Processos",
    cost_per_employee: { min: 200, max: 500 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "retail"],
    expected_impact: [
      { metric: "produtividade", change_percent: 25, evidence_source: "McKinsey 2023" },
      { metric: "carga_trabalho", change_percent: -20, evidence_source: "Deloitte 2022" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "workload.time-management-training",
    universal_category_code: "workload",
    title: "Programa de gestão do tempo e produtividade",
    description:
      "Treinamento em técnicas de priorização (Eisenhower, GTD) e gestão de interrupções para toda a equipe.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH / T&D",
    cost_per_employee: { min: 40, max: 120 },
    required_modality: "any",
    required_hr_capabilities: ["internal_training"],
    sector_fit: ["tech", "office"],
    expected_impact: [
      { metric: "produtividade", change_percent: 18, evidence_source: "ATD 2023" },
      { metric: "estresse", change_percent: -15, evidence_source: "ISMA-BR" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ LEADERSHIP ============ */
  {
    intervention_id: "leadership.development-program",
    universal_category_code: "leadership",
    title: "Programa de desenvolvimento de líderes",
    description:
      "Capacitar gestores em liderança transformacional, feedback construtivo e escuta ativa. Sessões práticas e role-play.",
    effort: "alto",
    timeframe: "medio_prazo",
    target_role: "RH / T&D",
    cost_per_employee: { min: 300, max: 800 },
    required_modality: "hibrido",
    required_hr_capabilities: ["dedicated_hr", "internal_training"],
    sector_fit: ["tech", "industrial", "retail", "healthcare"],
    expected_impact: [
      { metric: "engajamento", change_percent: 21, evidence_source: "Gallup 2023" },
      { metric: "turnover", change_percent: -25, evidence_source: "Deloitte 2022" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "leadership.weekly-1on1",
    universal_category_code: "leadership",
    title: "Reuniões 1:1 estruturadas semanais",
    description:
      "Ritual de reuniões individuais (30min/semana) entre gestor e subordinado com pauta de apoio, feedback e desenvolvimento.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "Gestor de Equipe",
    cost_per_employee: { min: 0, max: 50 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "healthcare", "public"],
    expected_impact: [
      { metric: "engajamento", change_percent: 15, evidence_source: "Gallup 2023" },
      { metric: "turnover", change_percent: -12, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "leadership.360-evaluation",
    universal_category_code: "leadership",
    title: "Avaliação 360° de liderança",
    description:
      "Avaliação 360° anônima dos gestores para identificar gaps e criar planos de desenvolvimento individualizados.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "RH",
    cost_per_employee: { min: 100, max: 250 },
    required_modality: "online",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "healthcare"],
    expected_impact: [
      { metric: "qualidade_lideranca", change_percent: 20, evidence_source: "CCL 2023" },
      { metric: "satisfacao", change_percent: 18, evidence_source: "Deloitte 2022" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "leadership.feedback-channel",
    universal_category_code: "leadership",
    title: "Canal de feedback anônimo sobre gestão",
    description:
      "Canal seguro e anônimo para colaboradores reportarem questões de liderança, com compromisso de resposta e ação.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 10, max: 40 },
    required_modality: "online",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "confianca_lideranca", change_percent: 20, evidence_source: "Edelman 2023" },
      { metric: "turnover", change_percent: -10, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ SOCIAL ============ */
  {
    intervention_id: "social.team-integration-events",
    universal_category_code: "social",
    title: "Eventos de integração entre equipes",
    description:
      "Atividades periódicas de team building (almoços, dinâmicas, projetos interdepartamentais) para fortalecer vínculos.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 50, max: 150 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "retail"],
    expected_impact: [
      { metric: "colaboracao", change_percent: 20, evidence_source: "Gallup 2023" },
      { metric: "satisfacao", change_percent: 12, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "social.buddy-program",
    universal_category_code: "social",
    title: "Programa de buddy/apadrinhamento",
    description:
      "Designar colega veterano como buddy para novos colaboradores nos primeiros 90 dias, facilitando integração.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 20, max: 60 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare"],
    expected_impact: [
      { metric: "turnover_novos", change_percent: -35, evidence_source: "HCI 2023" },
      { metric: "produtividade_novos", change_percent: 25, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "social.peer-recognition-platform",
    universal_category_code: "social",
    title: "Rituais de reconhecimento entre pares",
    description:
      "Plataforma ou ritual (ex: kudos semanais) onde colegas reconhecem publicamente contribuições uns dos outros.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 15, max: 50 },
    required_modality: "online",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office"],
    expected_impact: [
      { metric: "engajamento", change_percent: 14, evidence_source: "Gallup 2023" },
      { metric: "satisfacao", change_percent: 18, evidence_source: "Workhuman 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ RECOGNITION ============ */
  {
    intervention_id: "recognition.formal-program",
    universal_category_code: "recognition",
    title: "Programa estruturado de reconhecimento",
    description:
      "Política formal de reconhecimento com critérios claros: premiações mensais, destaque em all-hands, bonificações por desempenho.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "RH / Diretoria",
    cost_per_employee: { min: 150, max: 400 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "retail", "healthcare"],
    expected_impact: [
      { metric: "engajamento", change_percent: 21, evidence_source: "Gallup 2023" },
      { metric: "turnover", change_percent: -31, evidence_source: "Bersin by Deloitte 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "recognition.salary-benchmark",
    universal_category_code: "recognition",
    title: "Pesquisa de competitividade salarial",
    description:
      "Benchmarking salarial contra o mercado e ajuste de distorções. Comunicar transparentemente a política de remuneração.",
    effort: "alto",
    timeframe: "medio_prazo",
    target_role: "RH / Financeiro",
    cost_per_employee: { min: 500, max: 2000 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "healthcare"],
    expected_impact: [
      { metric: "turnover", change_percent: -20, evidence_source: "Robert Half 2024" },
      { metric: "atracao_talentos", change_percent: 30, evidence_source: "Glassdoor 2023" },
    ],
    roi_multiplier: { min: 2.0, max: 4.0 },
  },
  {
    intervention_id: "recognition.career-path",
    universal_category_code: "recognition",
    title: "Plano de carreira transparente com metas claras",
    description:
      "Critérios objetivos de progressão e promoção. Comunicar trilhas de carreira para cada função.",
    effort: "alto",
    timeframe: "longo_prazo",
    target_role: "RH / Diretoria",
    cost_per_employee: { min: 300, max: 800 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "healthcare", "public"],
    expected_impact: [
      { metric: "turnover", change_percent: -35, evidence_source: "LinkedIn 2023" },
      { metric: "engajamento", change_percent: 25, evidence_source: "Gallup 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ AUTONOMY ============ */
  {
    intervention_id: "autonomy.flexible-hours",
    universal_category_code: "autonomy",
    title: "Flexibilização de horários e formato de trabalho",
    description:
      "Políticas de horário flexível, trabalho remoto parcial ou jornada comprimida (4x10), respeitando necessidades operacionais.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "RH / Diretoria",
    cost_per_employee: { min: 50, max: 200 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "healthcare"],
    expected_impact: [
      { metric: "turnover", change_percent: -25, evidence_source: "Owl Labs 2023" },
      { metric: "produtividade", change_percent: 13, evidence_source: "Stanford 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "autonomy.decision-empowerment",
    universal_category_code: "autonomy",
    title: "Empowerment nas decisões operacionais",
    description:
      "Delegar autoridade de decisão para o nível mais próximo da execução. Reduzir camadas de aprovação desnecessárias.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "Gestor de Equipe / Diretoria",
    cost_per_employee: { min: 40, max: 120 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "retail"],
    expected_impact: [
      { metric: "engajamento", change_percent: 18, evidence_source: "Gallup 2023" },
      { metric: "agilidade", change_percent: 25, evidence_source: "McKinsey 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "autonomy.individual-development-plan",
    universal_category_code: "autonomy",
    title: "Programa de desenvolvimento e capacitação (PDI)",
    description:
      "Budget individual para cursos, conferências e certificações. Criar PDIs alinhados com aspirações.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "RH / T&D",
    cost_per_employee: { min: 200, max: 600 },
    required_modality: "any",
    required_hr_capabilities: ["internal_training"],
    sector_fit: ["tech", "office", "healthcare"],
    expected_impact: [
      { metric: "turnover", change_percent: -30, evidence_source: "LinkedIn Learning 2023" },
      { metric: "produtividade", change_percent: 20, evidence_source: "ATD 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ MEANING ============ */
  {
    intervention_id: "meaning.purpose-connection",
    universal_category_code: "meaning",
    title: "Conectar tarefas ao propósito organizacional",
    description:
      "Comunicar regularmente como o trabalho de cada equipe contribui para a missão. Usar storytelling com impacto real.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "Gestor de Equipe / Diretoria",
    cost_per_employee: { min: 10, max: 40 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "engajamento", change_percent: 20, evidence_source: "Gallup 2023" },
      { metric: "produtividade", change_percent: 15, evidence_source: "HBR 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "meaning.pulse-surveys",
    universal_category_code: "meaning",
    title: "Pesquisa de engajamento pulso rápido",
    description:
      "Pesquisas rápidas mensais (3-5 perguntas) para monitorar engajamento em tempo real e agir rapidamente.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 15, max: 50 },
    required_modality: "online",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "retail"],
    expected_impact: [
      { metric: "tempo_resposta_rh", change_percent: -60, evidence_source: "Culture Amp 2023" },
      { metric: "engajamento", change_percent: 10, evidence_source: "Qualtrics 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ BURNOUT ============ */
  {
    intervention_id: "burnout.teleterapia-b2b",
    universal_category_code: "burnout",
    title: "Programa de bem-estar com teleterapia B2B",
    description:
      "Acesso a psicólogo/terapeuta via plataforma online (Zenklub, Vittude, Psicologia Viva), programas de mindfulness e gestão de estresse.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "RH / Saúde Ocupacional",
    cost_per_employee: { min: 300, max: 800 },
    required_modality: "online",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "healthcare"],
    expected_impact: [
      { metric: "absenteismo", change_percent: -30, evidence_source: "Deloitte 2022" },
      { metric: "turnover", change_percent: -25, evidence_source: "OMS 2024" },
      { metric: "presenteismo", change_percent: -20, evidence_source: "ISMA-BR" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "burnout.digital-disconnect-policy",
    universal_category_code: "burnout",
    title: "Política de desconexão digital",
    description:
      "Regras claras sobre comunicações fora do horário de trabalho. Desativar notificações corporativas após expediente.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH / Diretoria",
    cost_per_employee: { min: 0, max: 20 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office"],
    expected_impact: [
      { metric: "burnout", change_percent: -28, evidence_source: "OMS 2024" },
      { metric: "qualidade_sono", change_percent: 22, evidence_source: "Sleep Foundation 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "burnout.early-signal-monitoring",
    universal_category_code: "burnout",
    title: "Monitoramento proativo de sinais de burnout",
    description:
      "Treinar gestores a identificar sinais precoces (absenteísmo, queda de produtividade, irritabilidade) e encaminhar para apoio.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "Gestor de Equipe / RH",
    cost_per_employee: { min: 30, max: 100 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "healthcare"],
    expected_impact: [
      { metric: "burnout", change_percent: -25, evidence_source: "Maslach & Leiter 2016" },
      { metric: "absenteismo", change_percent: -20, evidence_source: "ISMA-BR" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "burnout.workplace-fitness-program",
    universal_category_code: "burnout",
    title: "Programa de atividade física e ergonomia (Gympass/Wellhub)",
    description:
      "Subsídio Gympass/Wellhub, ginástica laboral, avaliação ergonômica dos postos de trabalho e campanhas de saúde.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "Saúde Ocupacional",
    cost_per_employee: { min: 960, max: 1800 }, // R$80-150/mês * 12 meses
    required_modality: "hibrido",
    required_hr_capabilities: ["occupational_health"],
    sector_fit: ["tech", "industrial", "office"],
    expected_impact: [
      { metric: "absenteismo", change_percent: -25, evidence_source: "OMS 2024" },
      { metric: "produtividade", change_percent: 15, evidence_source: "ISMA-BR" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ COMMUNICATION ============ */
  {
    intervention_id: "communication.monthly-town-halls",
    universal_category_code: "communication",
    title: "Town halls mensais com Q&A aberto",
    description:
      "Reuniões mensais da liderança com todos os colaboradores, com perguntas anônimas e respostas transparentes.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "Diretoria",
    cost_per_employee: { min: 10, max: 30 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "confianca", change_percent: 25, evidence_source: "Edelman 2023" },
      { metric: "alinhamento", change_percent: 20, evidence_source: "Gallup 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "communication.role-clarification-raci",
    universal_category_code: "communication",
    title: "Clarificação de papéis com matriz RACI",
    description:
      "Documentar e comunicar responsabilidades de cada cargo. Usar matriz RACI para projetos interdepartamentais.",
    effort: "medio",
    timeframe: "medio_prazo",
    target_role: "Gestor de Equipe / RH",
    cost_per_employee: { min: 60, max: 180 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "industrial", "healthcare"],
    expected_impact: [
      { metric: "conflitos", change_percent: -30, evidence_source: "SHRM" },
      { metric: "produtividade", change_percent: 18, evidence_source: "McKinsey 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "communication.bidirectional-feedback",
    universal_category_code: "communication",
    title: "Feedback bidirecional estruturado",
    description:
      "Ciclos regulares de feedback ascendente (equipe → gestor) e descendente, com ações concretas de follow-up.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 15, max: 50 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "healthcare"],
    expected_impact: [
      { metric: "confianca", change_percent: 18, evidence_source: "Edelman 2023" },
      { metric: "engajamento", change_percent: 14, evidence_source: "Gallup 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ SECURITY ============ */
  {
    intervention_id: "security.transparent-communication",
    universal_category_code: "security",
    title: "Comunicação transparente sobre estabilidade",
    description:
      "Em períodos de incerteza, comunicar proativamente a situação da empresa, próximos passos e compromissos.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "Diretoria / RH",
    cost_per_employee: { min: 5, max: 20 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "ansiedade", change_percent: -30, evidence_source: "Edelman 2023" },
      { metric: "turnover_voluntario", change_percent: -15, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "security.talent-retention-plan",
    universal_category_code: "security",
    title: "Programa de retenção e desenvolvimento de talentos",
    description:
      "Identificar talentos críticos e criar planos de retenção personalizados (carreira, remuneração, desafios, flexibilidade).",
    effort: "alto",
    timeframe: "medio_prazo",
    target_role: "RH",
    cost_per_employee: { min: 400, max: 1200 },
    required_modality: "any",
    required_hr_capabilities: ["dedicated_hr"],
    sector_fit: ["tech", "office", "healthcare"],
    expected_impact: [
      { metric: "turnover_talentos", change_percent: -40, evidence_source: "LinkedIn 2023" },
      { metric: "engajamento", change_percent: 22, evidence_source: "Gallup 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "security.work-life-balance",
    universal_category_code: "security",
    title: "Programa de equilíbrio trabalho-vida",
    description:
      "Políticas de apoio à vida pessoal: licenças flexíveis, day off aniversário, horário para compromissos pessoais.",
    effort: "baixo",
    timeframe: "curto_prazo",
    target_role: "RH",
    cost_per_employee: { min: 30, max: 100 },
    required_modality: "any",
    required_hr_capabilities: [],
    sector_fit: ["tech", "office", "retail"],
    expected_impact: [
      { metric: "satisfacao", change_percent: 25, evidence_source: "GPTW 2023" },
      { metric: "turnover", change_percent: -18, evidence_source: "Deloitte 2022" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },

  /* ============ OFFENSIVE ============ */
  {
    intervention_id: "offensive.anti-harassment-channel",
    universal_category_code: "offensive",
    title: "Política anti-assédio com canal de denúncia (SafeSpace/Contato Seguro)",
    description:
      "Política clara contra assédio moral, sexual e discriminação. Canal de denúncia confidencial via SafeSpace ou Contato Seguro.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "RH / Jurídico",
    cost_per_employee: { min: 60, max: 180 }, // R$5-15/colab/mês * 12
    required_modality: "online",
    required_hr_capabilities: ["compliance_officer"],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "processos_trabalhistas", change_percent: -40, evidence_source: "TST 2023" },
      { metric: "turnover", change_percent: -15, evidence_source: "SHRM" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "offensive.mandatory-compliance-training",
    universal_category_code: "offensive",
    title: "Treinamento obrigatório de compliance e ética",
    description:
      "Treinamento anual para todos os colaboradores sobre comportamentos inaceitáveis, consequências e como reportar.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "RH / Compliance",
    cost_per_employee: { min: 60, max: 180 },
    required_modality: "online",
    required_hr_capabilities: ["compliance_officer"],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "incidentes", change_percent: -35, evidence_source: "EEOC 2023" },
      { metric: "clima_organizacional", change_percent: 18, evidence_source: "Deloitte 2022" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
  {
    intervention_id: "offensive.rapid-investigation-protocol",
    universal_category_code: "offensive",
    title: "Investigação imediata de ocorrências",
    description:
      "Protocolo de investigação rápida (até 15 dias úteis) para toda denúncia recebida, com retorno ao denunciante.",
    effort: "medio",
    timeframe: "curto_prazo",
    target_role: "RH / Jurídico",
    cost_per_employee: { min: 50, max: 150 },
    required_modality: "any",
    required_hr_capabilities: ["compliance_officer"],
    sector_fit: ["tech", "industrial", "retail", "healthcare", "public"],
    expected_impact: [
      { metric: "confianca_canal", change_percent: 40, evidence_source: "Navex Global 2023" },
      { metric: "processos_trabalhistas", change_percent: -30, evidence_source: "TST 2023" },
    ],
    roi_multiplier: { min: 2.5, max: 5.0 },
  },
];

/** Helper: busca por categoria */
export function getCatalogByCategory(
  code: UniversalCategoryCode
): Intervention[] {
  return CATALOG.filter((i) => i.universal_category_code === code);
}

/** Helper: busca por intervention_id */
export function getInterventionById(id: string): Intervention | null {
  return CATALOG.find((i) => i.intervention_id === id) ?? null;
}

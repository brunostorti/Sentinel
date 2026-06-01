export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  HR: "HR",
  MANAGER: "MANAGER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SURVEY_VERSIONS = {
  SHORT: "SHORT",
  MEDIUM: "MEDIUM",
  LONG: "LONG",
} as const;

export type SurveyVersion = (typeof SURVEY_VERSIONS)[keyof typeof SURVEY_VERSIONS];

export const SURVEY_STATUSES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export type SurveyStatus = (typeof SURVEY_STATUSES)[keyof typeof SURVEY_STATUSES];

/** Traffic light levels for dashboard display (all three colors) */
export const TRAFFIC_LIGHTS = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
} as const;

export type TrafficLight = (typeof TRAFFIC_LIGHTS)[keyof typeof TRAFFIC_LIGHTS];

/** Action plan risk levels — only RED and YELLOW (matches DB enum) */
export const ACTION_PLAN_RISK_LEVELS = {
  RED: "RED",
  YELLOW: "YELLOW",
} as const;

export type ActionPlanRiskLevel =
  (typeof ACTION_PLAN_RISK_LEVELS)[keyof typeof ACTION_PLAN_RISK_LEVELS];

export const SCORING_DIRECTIONS = {
  HIGH_IS_RISK: "HIGH_IS_RISK",
  HIGH_IS_FAVORABLE: "HIGH_IS_FAVORABLE",
} as const;

export type ScoringDirection =
  (typeof SCORING_DIRECTIONS)[keyof typeof SCORING_DIRECTIONS];

/** Convert mean score to 0-100 display score (already 0-100 after migration 006) */
export function toDisplayScore(mean: number): number {
  return Math.round(mean);
}

/** 0-100 thresholds for traffic light */
export const THRESHOLDS = { LOW: 33, HIGH: 67 } as const;

/** Minimum responses per department to show metrics */
export const ANONYMITY_THRESHOLD = 5;

/** Universal category labels (PT-BR) for cross-instrument grouping */
export const UNIVERSAL_CATEGORY_LABELS: Record<string, string> = {
  workload: "Carga de Trabalho",
  leadership: "Liderança e Supervisão",
  social: "Relações Sociais",
  recognition: "Reconhecimento e Recompensas",
  autonomy: "Autonomia e Desenvolvimento",
  meaning: "Significado e Engajamento",
  burnout: "Burnout e Saúde",
  communication: "Comunicação e Transparência",
  security: "Segurança e Estabilidade",
  offensive: "Comportamentos Ofensivos",
};

export const ROUTES = {
  SUPER_ADMIN: {
    DASHBOARD: "/painel",
    COMPANIES: "/empresas",
    USERS: "/usuarios",
  },
  DASHBOARD: {
    HOME: "/inicio",
    OVERVIEW: "/painel",
    SURVEYS: "/gerenciar-pesquisas",
    EMPLOYEES: "/colaboradores",
    ACTION_PLANS: "/planos-acao",
    KANBAN: "/kanban",
    REPORTS: "/relatorios",
    INCIDENTS: "/denuncias",
    SETTINGS: "/configuracoes/perfil",
    CERTIFICATES: "/certificados",
    ASSISTANT: "/assistente",
    METHODOLOGY: "/sobre/metodologia",
  },
  DENUNCIA: {
    HOME: "/denuncia",
    NEW: "/denuncia/nova",
    TRACK: "/denuncia/acompanhar",
  },
  SURVEY: {
    LOGIN: "/entrar",
    CONSENT: "/consentimento",
    ANSWER: "/responder",
    THANKS: "/obrigado",
  },
} as const;

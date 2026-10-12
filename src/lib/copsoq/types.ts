import type { ScoringDirection, TrafficLight, SurveyVersion } from "@/lib/constants";

/** Raw answer from DB (survey_answers joined with questionnaire_items) */
export interface RawAnswer {
  questionId: string;
  dimensionId: string;
  score: number; // 0-100
  isInverted: boolean;
}

/**
 * Cortes do semáforo próprios do instrumento (0-100), quando o autor publica pontos de
 * corte (ex.: JSS, OLBI). Sem cortes próprios, valem os tercis do manual COPSOQ.
 */
export interface TrafficCuts {
  low: number;
  high: number;
}

/** Dimension metadata from DB */
export interface DimensionMeta {
  id: string;
  name: string;
  category: string;
  scoringDirection: ScoringDirection;
  cuts?: TrafficCuts | null;
}

/** Computed score for a single dimension/scale */
export interface DimensionScore {
  dimensionId: string;
  name: string;
  category: string;
  universalCategory?: string; // universal category code (workload, leadership, etc.)
  /** Código do instrumento (copsoq_ii, copsoq_iii, jss, olbi…): define o papel da dimensão no Dossiê NR-1. */
  instrumentCode?: string;
  scoringDirection: ScoringDirection;
  cuts?: TrafficCuts | null;
  meanScore: number; // 0-100 scale
  displayScore: number; // 0-100 scale (rounded)
  trafficLight: TrafficLight;
  questionCount: number;
}

/** Department-level aggregated result */
export interface DepartmentResult {
  departmentId: string;
  departmentName: string;
  responseCount: number;
  isAnonymous: boolean; // true if responseCount < ANONYMITY_THRESHOLD
  dimensions: DimensionScore[] | null; // null if isAnonymous
}

/** Survey-level aggregated result (company-wide) */
export interface SurveyResult {
  surveyId: string;
  surveyTitle: string;
  version: SurveyVersion | null; // null for instruments without versions (JSS, OLBI)
  instrumentCode?: string;
  totalResponses: number;
  companyDimensions: DimensionScore[];
  departments: DepartmentResult[];
}

/** Trend data comparing two survey rounds */
export interface DimensionTrend {
  dimensionId: string;
  name: string;
  currentScore: number; // 0-100
  previousScore: number; // 0-100
  changePercent: number; // e.g., +12 or -5
  improved: boolean; // based on scoring direction
}

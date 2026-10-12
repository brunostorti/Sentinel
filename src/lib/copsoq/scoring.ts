import {
  type ScoringDirection,
  type TrafficLight,
  TRAFFIC_LIGHTS,
  toDisplayScore,
} from "@/lib/constants";
import type { DimensionMeta, DimensionScore, RawAnswer, TrafficCuts } from "./types";

/**
 * Pontos de corte dos tercis no 0-100. O manual do COPSOQ II PT divide a amplitude 1-5
 * "em três partes iguais" (cortes 2,33 e 3,66): no 0-100 isso é 100/3 e 200/3.
 */
export const TERCILE_LOW = 100 / 3;
export const TERCILE_HIGH = 200 / 3;

/** Invert a normalized score: score = 100 - raw */
export function invertScore(raw: number): number {
  return 100 - raw;
}

/** Compute mean for a set of question scores, applying inversion where needed */
export function computeDimensionMean(
  scores: { score: number; isInverted: boolean }[]
): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => {
    const adjusted = s.isInverted ? invertScore(s.score) : s.score;
    return acc + adjusted;
  }, 0);
  return sum / scores.length;
}

/**
 * Favorabilidade 0-100: alto é sempre bom. Inverte as dimensões em que alto = risco.
 * Use para comparar ou fazer média de dimensões com direções diferentes.
 */
export function toFavorability(mean: number, direction: ScoringDirection): number {
  return direction === "HIGH_IS_RISK" ? 100 - mean : mean;
}

/** Cortes gravados na escala (questionnaire_scales.cut_low/cut_high); nulos = tercis. */
export function cutsFromColumns(low: unknown, high: unknown): TrafficCuts | null {
  if (low === null || low === undefined || high === null || high === undefined) return null;
  return { low: Number(low), high: Number(high) };
}

/**
 * Semáforo de uma média 0-100. Com cortes do autor do instrumento, a faixa pior inclui o
 * corte (JSS: média por item ≤ 3 é insatisfação; OLBI: ≥ 2,25 é burnout). Sem cortes,
 * tercis do manual COPSOQ.
 */
export function toTrafficLight(
  mean: number,
  direction: ScoringDirection,
  cuts?: TrafficCuts | null
): TrafficLight {
  if (cuts) {
    if (direction === "HIGH_IS_RISK") {
      if (mean >= cuts.high) return TRAFFIC_LIGHTS.RED;
      if (mean < cuts.low) return TRAFFIC_LIGHTS.GREEN;
      return TRAFFIC_LIGHTS.YELLOW;
    }
    if (mean >= cuts.high) return TRAFFIC_LIGHTS.GREEN;
    if (mean <= cuts.low) return TRAFFIC_LIGHTS.RED;
    return TRAFFIC_LIGHTS.YELLOW;
  }
  if (direction === "HIGH_IS_RISK") {
    if (mean < TERCILE_LOW) return TRAFFIC_LIGHTS.GREEN;
    if (mean >= TERCILE_HIGH) return TRAFFIC_LIGHTS.RED;
    return TRAFFIC_LIGHTS.YELLOW;
  }
  // HIGH_IS_FAVORABLE: invert the colors
  if (mean >= TERCILE_HIGH) return TRAFFIC_LIGHTS.GREEN;
  if (mean < TERCILE_LOW) return TRAFFIC_LIGHTS.RED;
  return TRAFFIC_LIGHTS.YELLOW;
}

/**
 * Favorabilidade (0-100) a partir da qual a dimensão fica verde: 200/3 nos tercis; com
 * cortes próprios, o corte equivalente (alto = risco: 100 − cut_low; alto = bom: cut_high).
 */
export function greenFavorability(direction: ScoringDirection, cuts?: TrafficCuts | null): number {
  if (!cuts) return TERCILE_HIGH;
  return direction === "HIGH_IS_RISK" ? 100 - cuts.low : cuts.high;
}

/** Compute full dimension scores from raw answers + dimension metadata */
export function computeDimensionScores(
  answers: RawAnswer[],
  dimensions: DimensionMeta[]
): DimensionScore[] {
  // Group answers by dimension
  const byDimension = new Map<string, RawAnswer[]>();
  for (const answer of answers) {
    const group = byDimension.get(answer.dimensionId) ?? [];
    group.push(answer);
    byDimension.set(answer.dimensionId, group);
  }

  return dimensions
    .filter((dim) => byDimension.has(dim.id))
    .map((dim) => {
      const dimAnswers = byDimension.get(dim.id)!;
      const meanScore = computeDimensionMean(
        dimAnswers.map((a) => ({ score: a.score, isInverted: a.isInverted }))
      );
      return {
        dimensionId: dim.id,
        name: dim.name,
        category: dim.category,
        scoringDirection: dim.scoringDirection,
        cuts: dim.cuts ?? null,
        meanScore,
        displayScore: toDisplayScore(meanScore),
        trafficLight: toTrafficLight(meanScore, dim.scoringDirection, dim.cuts),
        questionCount: dimAnswers.length,
      };
    });
}

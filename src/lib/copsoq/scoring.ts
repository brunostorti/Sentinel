import {
  type ScoringDirection,
  type TrafficLight,
  TRAFFIC_LIGHTS,
  toDisplayScore,
} from "@/lib/constants";
import type { DimensionMeta, DimensionScore, RawAnswer } from "./types";

/** Tercile cut-points on the 0-100 normalized scale */
const TERCILE_LOW = 33;
const TERCILE_HIGH = 66;

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

/** Map a 0-100 mean score to a traffic light based on scoring direction */
export function toTrafficLight(
  mean: number,
  direction: ScoringDirection
): TrafficLight {
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
        meanScore,
        displayScore: toDisplayScore(meanScore),
        trafficLight: toTrafficLight(meanScore, dim.scoringDirection),
        questionCount: dimAnswers.length,
      };
    });
}

import { ANONYMITY_THRESHOLD, toDisplayScore } from "@/lib/constants";
import { computeDimensionMean, toTrafficLight } from "./scoring";
import type {
  DimensionMeta,
  DimensionScore,
  DimensionTrend,
  RawAnswer,
} from "./types";

/** Returns true if response count is below anonymity threshold */
export function enforceAnonymity(responseCount: number): boolean {
  return responseCount < ANONYMITY_THRESHOLD;
}

/**
 * Aggregate multiple survey responses into dimension scores.
 *
 * For each dimension, computes per-response means, then averages
 * those means across all responses.
 */
export function aggregateResponseScores(
  responses: RawAnswer[][],
  dimensions: DimensionMeta[]
): DimensionScore[] {
  if (responses.length === 0 || dimensions.length === 0) return [];

  // For each dimension, collect per-response means
  const dimMeans = new Map<string, number[]>();

  for (const responseAnswers of responses) {
    // Group this response's answers by dimension
    const byDim = new Map<string, { score: number; isInverted: boolean }[]>();
    for (const a of responseAnswers) {
      const group = byDim.get(a.dimensionId) ?? [];
      group.push({ score: a.score, isInverted: a.isInverted });
      byDim.set(a.dimensionId, group);
    }

    for (const [dimId, scores] of byDim) {
      const mean = computeDimensionMean(scores);
      const existing = dimMeans.get(dimId) ?? [];
      existing.push(mean);
      dimMeans.set(dimId, existing);
    }
  }

  return dimensions
    .filter((dim) => dimMeans.has(dim.id))
    .map((dim) => {
      const means = dimMeans.get(dim.id)!;
      const overallMean = means.reduce((a, b) => a + b, 0) / means.length;
      return {
        dimensionId: dim.id,
        name: dim.name,
        category: dim.category,
        scoringDirection: dim.scoringDirection,
        meanScore: overallMean,
        displayScore: toDisplayScore(overallMean),
        trafficLight: toTrafficLight(overallMean, dim.scoringDirection),
        questionCount: means.length,
      };
    });
}

/** Compute trend between current and previous survey scores */
export function computeTrend(
  current: DimensionScore,
  previous: DimensionScore
): DimensionTrend {
  const changePercent =
    previous.displayScore !== 0
      ? ((current.displayScore - previous.displayScore) /
          previous.displayScore) *
        100
      : 0;

  // "improved" depends on direction:
  // HIGH_IS_RISK: score went down = improved
  // HIGH_IS_FAVORABLE: score went up = improved
  const improved =
    current.scoringDirection === "HIGH_IS_RISK"
      ? current.displayScore < previous.displayScore
      : current.displayScore > previous.displayScore;

  return {
    dimensionId: current.dimensionId,
    name: current.name,
    currentScore: current.displayScore,
    previousScore: previous.displayScore,
    changePercent: Math.round(changePercent * 100) / 100,
    improved,
  };
}

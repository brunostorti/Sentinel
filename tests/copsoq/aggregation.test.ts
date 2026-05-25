import { describe, it, expect } from "vitest";
import {
  enforceAnonymity,
  aggregateResponseScores,
  computeTrend,
} from "@/lib/copsoq/aggregation";
import type { DimensionScore } from "@/lib/copsoq/types";

describe("enforceAnonymity", () => {
  it("returns true when response count is below threshold", () => {
    expect(enforceAnonymity(4)).toBe(true);
    expect(enforceAnonymity(0)).toBe(true);
    expect(enforceAnonymity(1)).toBe(true);
  });

  it("returns false when response count meets threshold", () => {
    expect(enforceAnonymity(5)).toBe(false);
    expect(enforceAnonymity(10)).toBe(false);
  });
});

describe("aggregateResponseScores", () => {
  it("averages multiple responses for same dimension", () => {
    const responses = [
      // Response 1: dimension A scores [3, 4] → mean 3.5
      [
        { questionId: "q1", dimensionId: "dA", score: 3, isInverted: false },
        { questionId: "q2", dimensionId: "dA", score: 4, isInverted: false },
      ],
      // Response 2: dimension A scores [5, 5] → mean 5.0
      [
        { questionId: "q1", dimensionId: "dA", score: 5, isInverted: false },
        { questionId: "q2", dimensionId: "dA", score: 5, isInverted: false },
      ],
    ];

    const dimensions = [
      {
        id: "dA",
        name: "Test Dimension",
        category: "Test",
        scoringDirection: "HIGH_IS_RISK" as const,
      },
    ];

    const result = aggregateResponseScores(responses, dimensions);
    // Response 1 mean: 3.5, Response 2 mean: 5.0 → overall mean: 4.25
    expect(result[0].meanScore).toBe(4.25);
    expect(result[0].trafficLight).toBe("RED"); // 4.25 > 3.66
  });

  it("returns empty array for no responses", () => {
    expect(aggregateResponseScores([], [])).toEqual([]);
  });
});

describe("computeTrend", () => {
  it("computes positive change for improving HIGH_IS_RISK", () => {
    const current: DimensionScore = {
      dimensionId: "d1",
      name: "Test",
      category: "Cat",
      scoringDirection: "HIGH_IS_RISK",
      meanScore: 2.0,
      displayScore: 25,
      trafficLight: "GREEN",
      questionCount: 3,
    };
    const previous: DimensionScore = {
      ...current,
      meanScore: 3.0,
      displayScore: 50,
      trafficLight: "YELLOW",
    };

    const trend = computeTrend(current, previous);
    expect(trend.changePercent).toBe(-50); // score went down 50% (25 → 50)
    expect(trend.improved).toBe(true); // for HIGH_IS_RISK, lower score = better
  });

  it("computes negative change for worsening HIGH_IS_FAVORABLE", () => {
    const current: DimensionScore = {
      dimensionId: "d1",
      name: "Test",
      category: "Cat",
      scoringDirection: "HIGH_IS_FAVORABLE",
      meanScore: 2.0,
      displayScore: 25,
      trafficLight: "RED",
      questionCount: 3,
    };
    const previous: DimensionScore = {
      ...current,
      meanScore: 4.0,
      displayScore: 75,
      trafficLight: "GREEN",
    };

    const trend = computeTrend(current, previous);
    expect(trend.changePercent).toBeCloseTo(-66.67, 0);
    expect(trend.improved).toBe(false); // for HIGH_IS_FAVORABLE, lower score = worse
  });
});

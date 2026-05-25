import { describe, it, expect } from "vitest";
import {
  invertScore,
  computeDimensionMean,
  toTrafficLight,
} from "@/lib/copsoq/scoring";

describe("invertScore", () => {
  it("inverts score on a 1-5 scale", () => {
    expect(invertScore(1)).toBe(5);
    expect(invertScore(2)).toBe(4);
    expect(invertScore(3)).toBe(3);
    expect(invertScore(4)).toBe(2);
    expect(invertScore(5)).toBe(1);
  });
});

describe("computeDimensionMean", () => {
  it("computes mean of non-inverted scores", () => {
    const scores = [
      { score: 3, isInverted: false },
      { score: 4, isInverted: false },
      { score: 5, isInverted: false },
    ];
    expect(computeDimensionMean(scores)).toBe(4);
  });

  it("applies inversion before averaging", () => {
    const scores = [
      { score: 1, isInverted: true }, // becomes 5
      { score: 5, isInverted: false }, // stays 5
    ];
    expect(computeDimensionMean(scores)).toBe(5);
  });

  it("returns 0 for empty array", () => {
    expect(computeDimensionMean([])).toBe(0);
  });

  it("handles single item", () => {
    expect(computeDimensionMean([{ score: 2, isInverted: false }])).toBe(2);
  });

  it("handles all inverted items", () => {
    const scores = [
      { score: 1, isInverted: true }, // 5
      { score: 2, isInverted: true }, // 4
    ];
    expect(computeDimensionMean(scores)).toBe(4.5);
  });
});

describe("toTrafficLight", () => {
  describe("HIGH_IS_RISK direction", () => {
    it("returns GREEN for low score (< 2.33)", () => {
      expect(toTrafficLight(2.0, "HIGH_IS_RISK")).toBe("GREEN");
    });

    it("returns YELLOW for middle score (2.33-3.66)", () => {
      expect(toTrafficLight(3.0, "HIGH_IS_RISK")).toBe("YELLOW");
    });

    it("returns RED for high score (> 3.66)", () => {
      expect(toTrafficLight(4.0, "HIGH_IS_RISK")).toBe("RED");
    });

    it("returns YELLOW at exact 2.33 boundary", () => {
      expect(toTrafficLight(2.33, "HIGH_IS_RISK")).toBe("YELLOW");
    });

    it("returns RED at exact 3.66 boundary", () => {
      expect(toTrafficLight(3.66, "HIGH_IS_RISK")).toBe("RED");
    });
  });

  describe("HIGH_IS_FAVORABLE direction", () => {
    it("returns RED for low score (< 2.33)", () => {
      expect(toTrafficLight(2.0, "HIGH_IS_FAVORABLE")).toBe("RED");
    });

    it("returns YELLOW for middle score (2.33-3.66)", () => {
      expect(toTrafficLight(3.0, "HIGH_IS_FAVORABLE")).toBe("YELLOW");
    });

    it("returns GREEN for high score (> 3.66)", () => {
      expect(toTrafficLight(4.0, "HIGH_IS_FAVORABLE")).toBe("GREEN");
    });
  });
});

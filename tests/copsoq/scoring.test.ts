import { describe, it, expect } from "vitest";
import {
  invertScore,
  computeDimensionMean,
  toFavorability,
  toTrafficLight,
} from "@/lib/copsoq/scoring";

// Escala 0-100: as respostas 1..5 do manual valem 0, 25, 50, 75 e 100.

describe("invertScore", () => {
  it("inverte na escala 0-100 (equivale a 6 - x na escala 1-5)", () => {
    expect(invertScore(0)).toBe(100);
    expect(invertScore(25)).toBe(75);
    expect(invertScore(50)).toBe(50);
    expect(invertScore(75)).toBe(25);
    expect(invertScore(100)).toBe(0);
  });
});

describe("computeDimensionMean", () => {
  it("faz a média das perguntas não invertidas", () => {
    expect(
      computeDimensionMean([
        { score: 50, isInverted: false },
        { score: 75, isInverted: false },
        { score: 100, isInverted: false },
      ])
    ).toBe(75);
  });

  it("aplica a inversão antes da média", () => {
    // "Os funcionários confiam uns nos outros?" respondido 100 vira 0 na Confiança horizontal
    expect(
      computeDimensionMean([
        { score: 100, isInverted: false },
        { score: 100, isInverted: false },
        { score: 100, isInverted: true },
      ])
    ).toBeCloseTo(66.67, 2);
  });

  it("devolve 0 sem perguntas", () => {
    expect(computeDimensionMean([])).toBe(0);
  });
});

describe("toTrafficLight — tercis do manual (terços exatos: 100/3 e 200/3)", () => {
  describe("alto = risco", () => {
    it("verde abaixo de 33,3", () => {
      expect(toTrafficLight(33.3, "HIGH_IS_RISK")).toBe("GREEN");
    });
    it("amarelo entre 33,3 e 66,7", () => {
      expect(toTrafficLight(33.34, "HIGH_IS_RISK")).toBe("YELLOW");
      expect(toTrafficLight(66.5, "HIGH_IS_RISK")).toBe("YELLOW");
    });
    it("vermelho a partir de 66,7", () => {
      expect(toTrafficLight(200 / 3, "HIGH_IS_RISK")).toBe("RED");
      expect(toTrafficLight(90, "HIGH_IS_RISK")).toBe("RED");
    });
  });

  describe("alto = favorável", () => {
    it("vermelho abaixo de 33,3", () => {
      expect(toTrafficLight(20, "HIGH_IS_FAVORABLE")).toBe("RED");
    });
    it("amarelo entre 33,3 e 66,7 (66,4 não é verde)", () => {
      expect(toTrafficLight(50, "HIGH_IS_FAVORABLE")).toBe("YELLOW");
      expect(toTrafficLight(66.4, "HIGH_IS_FAVORABLE")).toBe("YELLOW");
    });
    it("verde a partir de 66,7", () => {
      expect(toTrafficLight(66.7, "HIGH_IS_FAVORABLE")).toBe("GREEN");
    });
  });
});

describe("toFavorability", () => {
  it("inverte só as dimensões em que alto = risco", () => {
    expect(toFavorability(80, "HIGH_IS_RISK")).toBe(20);
    expect(toFavorability(80, "HIGH_IS_FAVORABLE")).toBe(80);
  });

  it("deixa risco alto com favorabilidade baixa nos dois sentidos", () => {
    // Burnout 88 (risco) e Apoio social 12 (favorável) são igualmente ruins
    expect(toFavorability(88, "HIGH_IS_RISK")).toBe(toFavorability(12, "HIGH_IS_FAVORABLE"));
  });
});

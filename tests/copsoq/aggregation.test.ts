import { describe, it, expect } from "vitest";
import {
  enforceAnonymity,
  aggregateResponseScores,
  computeTrend,
} from "@/lib/copsoq/aggregation";
import { aggregateMultiSurveyScores } from "@/lib/copsoq/dashboard";
import type { DimensionScore } from "@/lib/copsoq/types";

function score(partial: Partial<DimensionScore>): DimensionScore {
  return {
    dimensionId: "d1",
    name: "Dimensão",
    category: "Categoria",
    scoringDirection: "HIGH_IS_RISK",
    meanScore: 50,
    displayScore: 50,
    trafficLight: "YELLOW",
    questionCount: 10,
    ...partial,
  };
}

describe("enforceAnonymity (regra de 5)", () => {
  it("oculta abaixo de 5 respostas", () => {
    expect(enforceAnonymity(0)).toBe(true);
    expect(enforceAnonymity(4)).toBe(true);
  });

  it("mostra a partir de 5 respostas", () => {
    expect(enforceAnonymity(5)).toBe(false);
    expect(enforceAnonymity(10)).toBe(false);
  });
});

describe("aggregateResponseScores (mesma regra da função do banco)", () => {
  it("faz a média por respondente e depois entre respondentes", () => {
    const responses = [
      // Respondente 1: perguntas 50 e 75 → média 62,5
      [
        { questionId: "q1", dimensionId: "dA", score: 50, isInverted: false },
        { questionId: "q2", dimensionId: "dA", score: 75, isInverted: false },
      ],
      // Respondente 2: perguntas 100 e 100 → média 100
      [
        { questionId: "q1", dimensionId: "dA", score: 100, isInverted: false },
        { questionId: "q2", dimensionId: "dA", score: 100, isInverted: false },
      ],
    ];
    const dimensions = [{ id: "dA", name: "Teste", category: "Teste", scoringDirection: "HIGH_IS_RISK" as const }];

    const [result] = aggregateResponseScores(responses, dimensions);
    expect(result.meanScore).toBe(81.25);
    expect(result.trafficLight).toBe("RED");
  });

  it("devolve vazio sem respostas", () => {
    expect(aggregateResponseScores([], [])).toEqual([]);
  });
});

describe("aggregateMultiSurveyScores (visão geral)", () => {
  it("não mistura direções: média da favorabilidade dentro da categoria", () => {
    const result = aggregateMultiSurveyScores([
      {
        isAnonymized: false,
        scores: [
          // Comunicação: Conflitos laborais (alto = risco) em 80 → favorabilidade 20
          score({ dimensionId: "a", name: "Conflitos laborais", universalCategory: "communication", scoringDirection: "HIGH_IS_RISK", meanScore: 80 }),
          // Comunicação: Previsibilidade (alto = bom) em 40 → favorabilidade 40
          score({ dimensionId: "b", name: "Previsibilidade", universalCategory: "communication", scoringDirection: "HIGH_IS_FAVORABLE", meanScore: 40 }),
        ],
      },
    ]);

    expect(result.scores).toHaveLength(1);
    const [communication] = result.scores;
    expect(communication.name).toBe("Comunicação e Transparência");
    expect(communication.scoringDirection).toBe("HIGH_IS_FAVORABLE");
    expect(communication.meanScore).toBe(30);
    expect(communication.trafficLight).toBe("RED");
  });

  it("carga de trabalho alta é vermelho, não verde", () => {
    const result = aggregateMultiSurveyScores([
      { isAnonymized: false, scores: [score({ universalCategory: "workload", scoringDirection: "HIGH_IS_RISK", meanScore: 70 })] },
    ]);
    expect(result.scores[0].meanScore).toBe(30);
    expect(result.scores[0].trafficLight).toBe("RED");
  });

  it("ignora pesquisas ocultas pela regra de 5", () => {
    const result = aggregateMultiSurveyScores([
      { isAnonymized: true, scores: [score({ universalCategory: "workload", meanScore: 90 })] },
    ]);
    expect(result.scores).toEqual([]);
  });
});

describe("computeTrend", () => {
  it("queda de pontuação é melhora quando alto = risco", () => {
    const current = score({ scoringDirection: "HIGH_IS_RISK", displayScore: 25 });
    const previous = score({ scoringDirection: "HIGH_IS_RISK", displayScore: 50 });
    const trend = computeTrend(current, previous);
    expect(trend.changePercent).toBe(-50);
    expect(trend.improved).toBe(true);
  });

  it("queda de pontuação é piora quando alto = favorável", () => {
    const current = score({ scoringDirection: "HIGH_IS_FAVORABLE", displayScore: 25 });
    const previous = score({ scoringDirection: "HIGH_IS_FAVORABLE", displayScore: 75 });
    const trend = computeTrend(current, previous);
    expect(trend.changePercent).toBeCloseTo(-66.67, 1);
    expect(trend.improved).toBe(false);
  });
});

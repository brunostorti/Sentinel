import { describe, expect, it } from "vitest";
import { baseProbability, classify, finalProbability, riskLevel, suggestedDueDate } from "@/lib/nr1/criteria";
import { buildInventory, type GroupInput } from "@/lib/nr1/inventory";
import type { DimensionScore } from "@/lib/copsoq/types";
import { toTrafficLight } from "@/lib/copsoq/scoring";

describe("critérios (Manual GRO/PGR, quadro 5)", () => {
  it("probabilidade-base pela favorabilidade", () => {
    expect(baseProbability(80)).toBeNull(); // terço favorável: sem exposição relevante
    expect(baseProbability(60)).toBe(2);
    expect(baseProbability(40)).toBe(3);
    expect(baseProbability(20)).toBe(4);
    expect(baseProbability(10)).toBe(5);
  });

  it("evidência de agravo sobe e medida eficaz desce a probabilidade, entre 1 e 5", () => {
    expect(finalProbability(3, { healthEvidence: true, effectiveMeasure: false })).toBe(4);
    expect(finalProbability(5, { healthEvidence: true, effectiveMeasure: false })).toBe(5);
    expect(finalProbability(2, { healthEvidence: false, effectiveMeasure: true })).toBe(1);
    expect(finalProbability(3, { healthEvidence: true, effectiveMeasure: true })).toBe(3);
  });

  it("faixas da matriz 5×5", () => {
    expect(riskLevel(4, 1)).toBe("BAIXO");
    expect(riskLevel(4, 2)).toBe("MEDIO");
    expect(riskLevel(4, 3)).toBe("ALTO");
    expect(riskLevel(4, 4)).toBe("ALTO");
    expect(riskLevel(4, 5)).toBe("MUITO_ALTO");
    expect(riskLevel(3, 3)).toBe("MEDIO");
  });

  it("classificação completa com severidade 4", () => {
    expect(classify(20, { healthEvidence: true, effectiveMeasure: false })).toMatchObject({
      severity: 4,
      baseProbability: 4,
      probability: 5,
      product: 20,
      level: "MUITO_ALTO",
    });
  });

  it("prazo sugerido para o Kanban segue o nível", () => {
    const from = new Date("2026-10-09T12:00:00Z");
    expect(suggestedDueDate(40, from)).toBe("2027-01-06"); // Alto: < 3 meses (89 dias)
    expect(suggestedDueDate(60, from)).toBe("2027-07-05"); // Médio: < 9 meses (269 dias)
  });
});

function dim(name: string, mean: number, direction: "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE", id = name): DimensionScore {
  return {
    dimensionId: id,
    name,
    category: "",
    scoringDirection: direction,
    meanScore: mean,
    displayScore: Math.round(mean),
    trafficLight: toTrafficLight(mean, direction),
    questionCount: 3,
  };
}

describe("buildInventory", () => {
  const company: GroupInput = {
    id: null,
    name: "Empresa toda",
    headcount: 100,
    responses: 60,
    scores: [
      dim("Exigências quantitativas", 70, "HIGH_IS_RISK"), // favorabilidade 30 → P4
      dim("Ritmo de trabalho", 55, "HIGH_IS_RISK"), // mesma categoria de perigo (sobrecarga)
      dim("Qualidade da liderança", 75, "HIGH_IS_FAVORABLE"), // favorável: fora do inventário
      dim("Auto-eficácia", 10, "HIGH_IS_FAVORABLE"), // contexto: nunca é perigo
      dim("Conflito família/trabalho", 90, "HIGH_IS_RISK"), // fora do trabalho: contexto
    ],
  };

  it("agrupa dimensões no mesmo perigo, pela pior, e ignora contexto e o que é favorável", () => {
    const rows = buildInventory(company, [], new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0].hazard.key).toBe("sobrecarga");
    expect(rows[0].dimensions.map((d) => d.name)).toEqual(["Exigências quantitativas", "Ritmo de trabalho"]);
    expect(rows[0]).toMatchObject({ baseProbability: 4, probability: 4, level: "ALTO" });
  });

  it("agravos à saúde no grupo sobem a probabilidade; medida eficaz desce", () => {
    const withHealth = { ...company, scores: [...company.scores, dim("Burnout", 80, "HIGH_IS_RISK")] };
    expect(buildInventory(withHealth, [], new Map())[0]).toMatchObject({ probability: 5, level: "MUITO_ALTO" });
    const measures = new Map([["Exigências quantitativas", [{ title: "Redistribuir tarefas", status: "COMPLETED", effective: true }]]]);
    expect(buildInventory(company, [], measures)[0]).toMatchObject({ probability: 3, level: "ALTO" });
  });

  it("inclui setor só quando o nível é maior que o da empresa; ordena por nível e expostos", () => {
    const vendas: GroupInput = { id: "v", name: "Vendas", headcount: 30, responses: 12, scores: [dim("Exigências quantitativas", 90, "HIGH_IS_RISK"), dim("Insegurança laboral", 55, "HIGH_IS_RISK")] };
    const ti: GroupInput = { id: "t", name: "TI", headcount: 20, responses: 10, scores: [dim("Exigências quantitativas", 72, "HIGH_IS_RISK")] };
    const rows = buildInventory(company, [vendas, ti], new Map());
    expect(rows.map((r) => `${r.group.name}:${r.hazard.key}:${r.level}`)).toEqual([
      "Vendas:sobrecarga:MUITO_ALTO",
      "Empresa toda:sobrecarga:ALTO",
      "Vendas:inseguranca:ALTO",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { greenFavorability, TERCILE_HIGH, toTrafficLight } from "@/lib/copsoq/scoring";
import { baseProbability } from "@/lib/nr1/criteria";
import { dimensionRole, ROLES_BY_INSTRUMENT } from "@/lib/nr1/hazards";
import { buildInventory, type GroupInput } from "@/lib/nr1/inventory";
import type { DimensionScore } from "@/lib/copsoq/types";

/**
 * Escalas dos instrumentos ativos, como gravadas pelas migrações
 * 20261009124759_copsoq_ii_oficial.sql e 20261012174401_instrumentos_validados.sql.
 */
const SCALES: Record<string, string[]> = {
  copsoq_ii: [
    "Exigências quantitativas", "Ritmo de trabalho", "Exigências cognitivas", "Exigências emocionais",
    "Exigências para esconder emoções", "Influência no trabalho", "Possibilidades de desenvolvimento",
    "Variação no trabalho", "Significado do trabalho", "Compromisso face ao local de trabalho", "Previsibilidade",
    "Recompensas (reconhecimento)", "Transparência do papel laboral", "Conflitos laborais", "Qualidade da liderança",
    "Apoio social de superiores", "Apoio social de colegas", "Insegurança laboral", "Satisfação no trabalho",
    "Conflito trabalho/família", "Conflito família/trabalho", "Confiança vertical", "Confiança horizontal",
    "Justiça e respeito", "Comunidade social no trabalho", "Responsabilidade social", "Auto-eficácia", "Saúde geral",
    "Stress", "Burnout", "Problemas em dormir", "Stress somático", "Stress cognitivo", "Sintomas depressivos",
    "Comportamentos ofensivos",
  ],
  copsoq_iii: [
    "Exigências quantitativas", "Ritmo de trabalho", "Exigências cognitivas", "Exigências emocionais",
    "Influência no trabalho", "Possibilidades de desenvolvimento", "Controlo sobre o tempo de trabalho",
    "Significado do trabalho", "Compromisso face ao local de trabalho", "Previsibilidade", "Reconhecimento",
    "Transparência do papel laboral", "Conflito de papéis laborais", "Qualidade da liderança",
    "Suporte social de colegas", "Suporte social de superiores", "Sentido de pertença a comunidade",
    "Insegurança laboral", "Insegurança com as condições de trabalho", "Qualidade do trabalho",
    "Confiança horizontal", "Confiança vertical", "Justiça organizacional", "Conflito trabalho-família",
    "Satisfação com o trabalho", "Auto-avaliação da saúde", "Auto-eficácia", "Problemas de sono", "Burnout", "Stress",
    "Sintomas depressivos",
  ],
  jss: [
    "Pagamento", "Promoção", "Supervisão", "Benefícios", "Recompensas", "Procedimentos", "Colegas de Trabalho",
    "Natureza do Trabalho", "Comunicação",
  ],
  olbi: ["Exaustão", "Desengajamento"],
};

describe("mapa escala → perigo (Dossiê NR-1)", () => {
  it("toda escala de instrumento ativo tem papel explícito, e o mapa não tem escala a mais", () => {
    for (const [code, names] of Object.entries(SCALES)) {
      expect(Object.keys(ROLES_BY_INSTRUMENT[code]).sort()).toEqual([...names].sort());
    }
  });

  it("usa o mapa do instrumento, não o nome de outro instrumento", () => {
    expect(dimensionRole("Exigências emocionais", "workload", "copsoq_iii")).toEqual({ role: "hazard", hazard: "demandas_emocionais" });
    expect(dimensionRole("Conflito trabalho-família", "workload", "copsoq_iii")).toEqual({ role: "hazard", hazard: "trabalho_familia" });
    expect(dimensionRole("Justiça organizacional", "recognition", "copsoq_iii")).toEqual({ role: "hazard", hazard: "justica" });
    expect(dimensionRole("Promoção", "autonomy", "jss")).toEqual({ role: "hazard", hazard: "pouco_desenvolvimento" });
    expect(dimensionRole("Exaustão", "burnout", "olbi")).toEqual({ role: "health" });
    expect(dimensionRole("Desengajamento", "burnout", "olbi")).toEqual({ role: "health" });
  });

  it("instrumento arquivado (sem mapa) continua pela categoria", () => {
    expect(dimensionRole("Demandas Quantitativas", "workload", "copsoq_iii_legado")).toEqual({ role: "hazard", hazard: "sobrecarga" });
    expect(dimensionRole("Burnout", "burnout")).toEqual({ role: "health" });
  });
});

describe("semáforo com cortes do autor", () => {
  const JSS = { low: 40, high: 60 };
  it("JSS: média por item ≤ 3 (≤ 40) insatisfeito, ≥ 4 (≥ 60) satisfeito, entre os dois ambivalente", () => {
    expect(toTrafficLight(40, "HIGH_IS_FAVORABLE", JSS)).toBe("RED");
    expect(toTrafficLight(40.1, "HIGH_IS_FAVORABLE", JSS)).toBe("YELLOW");
    expect(toTrafficLight(59.9, "HIGH_IS_FAVORABLE", JSS)).toBe("YELLOW");
    expect(toTrafficLight(60, "HIGH_IS_FAVORABLE", JSS)).toBe("GREEN");
  });

  it("OLBI: um corte só (burnout a partir dele), sem faixa amarela", () => {
    const exhaustion = { low: 41.67, high: 41.67 };
    expect(toTrafficLight(41.66, "HIGH_IS_RISK", exhaustion)).toBe("GREEN");
    expect(toTrafficLight(41.67, "HIGH_IS_RISK", exhaustion)).toBe("RED");
  });

  it("sem cortes, os tercis de sempre", () => {
    expect(toTrafficLight(30, "HIGH_IS_RISK")).toBe("GREEN");
    expect(toTrafficLight(50, "HIGH_IS_RISK")).toBe("YELLOW");
    expect(toTrafficLight(70, "HIGH_IS_RISK")).toBe("RED");
    expect(toTrafficLight(70, "HIGH_IS_FAVORABLE", null)).toBe("GREEN");
  });

  it("limite verde em favorabilidade", () => {
    expect(greenFavorability("HIGH_IS_RISK")).toBe(TERCILE_HIGH);
    expect(greenFavorability("HIGH_IS_FAVORABLE", JSS)).toBe(60);
    expect(greenFavorability("HIGH_IS_RISK", { low: 41.67, high: 41.67 })).toBeCloseTo(58.33);
  });
});

describe("probabilidade proporcional ao limite verde", () => {
  it("tercis: as faixas de antes (66,7 / 50 / 33,3 / 16,7)", () => {
    expect(baseProbability(66.7)).toBeNull();
    expect(baseProbability(50)).toBe(2);
    expect(baseProbability(49.9)).toBe(3);
    expect(baseProbability(100 / 3)).toBe(3);
    expect(baseProbability(33.3)).toBe(4);
    expect(baseProbability(16.7)).toBe(4);
    expect(baseProbability(16.6)).toBe(5);
  });

  it("JSS (limite 60): 45 / 30 / 15", () => {
    expect(baseProbability(60, 60)).toBeNull();
    expect(baseProbability(45, 60)).toBe(2);
    expect(baseProbability(40, 60)).toBe(3); // insatisfeito pelo critério do autor
    expect(baseProbability(15, 60)).toBe(4);
    expect(baseProbability(14.9, 60)).toBe(5);
  });

  it("inventário de uma pesquisa JSS usa o corte do autor", () => {
    const score = (name: string, mean: number): DimensionScore => ({
      dimensionId: name,
      name,
      category: "JSS",
      instrumentCode: "jss",
      scoringDirection: "HIGH_IS_FAVORABLE",
      cuts: { low: 40, high: 60 },
      meanScore: mean,
      displayScore: Math.round(mean),
      trafficLight: toTrafficLight(mean, "HIGH_IS_FAVORABLE", { low: 40, high: 60 }),
      questionCount: 10,
    });
    const company: GroupInput = {
      id: null,
      name: "Empresa",
      headcount: 20,
      responses: 12,
      scores: [score("Supervisão", 35), score("Pagamento", 62), score("Natureza do Trabalho", 20)],
    };
    const rows = buildInventory(company, [], new Map());
    // Supervisão (35 < 60) entra; Pagamento (62 ≥ 60) não; Natureza do Trabalho é contexto.
    expect(rows.map((r) => r.hazard.key)).toEqual(["falta_apoio"]);
    expect(rows[0].baseProbability).toBe(3);
  });
});

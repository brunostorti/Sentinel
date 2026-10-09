/**
 * Inventário de riscos psicossociais (NR-1, subitem 1.5.7.3.2) a partir dos escores
 * agregados da pesquisa. Função pura: os dados chegam já com a regra de 5 aplicada
 * (grupos ocultos não entram). Testada em tests/nr1/inventory.test.ts.
 */

import { toFavorability } from "@/lib/copsoq/scoring";
import type { DimensionScore } from "@/lib/copsoq/types";
import { classify, LEVEL_ORDER, type RiskLevel } from "./criteria";
import { HAZARDS, dimensionRole, type Hazard, type HazardKey } from "./hazards";

export interface GroupInput {
  /** null = empresa toda. */
  id: string | null;
  name: string;
  /** Trabalhadores do grupo (convidados para a pesquisa). */
  headcount: number;
  responses: number;
  scores: DimensionScore[];
}

export interface MeasureInput {
  title: string;
  status: string;
  /** Concluída e com reavaliação que mostrou melhora. */
  effective: boolean;
}

export interface InventoryDimension {
  name: string;
  score: number;
  favorability: number;
  highIsRisk: boolean;
}

export interface InventoryRow {
  hazard: Hazard;
  group: { id: string | null; name: string; headcount: number; responses: number };
  /** Dimensões que caracterizam a exposição, da pior para a melhor. */
  dimensions: InventoryDimension[];
  /** Dimensões de saúde em Risco no grupo (evidência de agravo). */
  healthEvidence: InventoryDimension[];
  measures: MeasureInput[];
  severity: number;
  baseProbability: number;
  probability: number;
  product: number;
  level: RiskLevel;
}

function toInventoryDimension(d: DimensionScore): InventoryDimension {
  return {
    name: d.name,
    score: d.displayScore,
    favorability: Math.round(toFavorability(d.meanScore, d.scoringDirection) * 10) / 10,
    highIsRisk: d.scoringDirection === "HIGH_IS_RISK",
  };
}

function rowsForGroup(group: GroupInput, measuresByDimension: Map<string, MeasureInput[]>): InventoryRow[] {
  const health = group.scores
    .filter((d) => dimensionRole(d.name, d.universalCategory).role === "health" && d.trafficLight === "RED")
    .map(toInventoryDimension);

  const byHazard = new Map<HazardKey, DimensionScore[]>();
  for (const d of group.scores) {
    const role = dimensionRole(d.name, d.universalCategory);
    if (role.role !== "hazard") continue;
    byHazard.set(role.hazard, [...(byHazard.get(role.hazard) ?? []), d]);
  }

  const rows: InventoryRow[] = [];
  for (const [key, dims] of byHazard) {
    const dimensions = dims.map(toInventoryDimension).sort((a, b) => a.favorability - b.favorability);
    const measures = dims.flatMap((d) => measuresByDimension.get(d.dimensionId) ?? []);
    const result = classify(dimensions[0].favorability, {
      healthEvidence: health.length > 0,
      effectiveMeasure: measures.some((m) => m.effective),
    });
    if (!result) continue; // todas as dimensões no terço favorável: sem exposição relevante
    rows.push({
      hazard: HAZARDS[key],
      group: { id: group.id, name: group.name, headcount: group.headcount, responses: group.responses },
      dimensions: dimensions.filter((d) => d.favorability < 200 / 3),
      healthEvidence: health,
      measures,
      ...result,
    });
  }
  return rows;
}

const rank = (level: RiskLevel) => LEVEL_ORDER.indexOf(level);

/**
 * Linhas da empresa toda + linhas de setores visíveis em que o perigo aparece com nível
 * MAIS ALTO que na empresa (ou só no setor). Ordem: nível; depois número de
 * trabalhadores expostos (NR-1 1.5.5.2.1.1: critério para aumentar a prioridade).
 */
export function buildInventory(
  company: GroupInput,
  departments: GroupInput[],
  measuresByDimension: Map<string, MeasureInput[]>
): InventoryRow[] {
  const companyRows = rowsForGroup(company, measuresByDimension);
  const companyLevel = new Map(companyRows.map((r) => [r.hazard.key, r.level]));

  const deptRows = departments.flatMap((dept) =>
    rowsForGroup(dept, measuresByDimension).filter((r) => {
      const atCompany = companyLevel.get(r.hazard.key);
      return atCompany === undefined || rank(r.level) < rank(atCompany);
    })
  );

  return [...companyRows, ...deptRows].sort(
    (a, b) =>
      rank(a.level) - rank(b.level) ||
      b.group.headcount - a.group.headcount ||
      a.dimensions[0].favorability - b.dimensions[0].favorability
  );
}

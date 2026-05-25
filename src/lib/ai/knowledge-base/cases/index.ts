/** Agregador de todos os casos setoriais */

import { INDUSTRIAL_CASES } from "./industrial";
import { TECH_CASES } from "./tech";
import { HEALTHCARE_CASES } from "./healthcare";
import { RETAIL_CASES } from "./retail";
import { PUBLIC_SECTOR_CASES } from "./public-sector";

export type { SectorCase } from "./industrial";

export const ALL_CASES = [
  ...INDUSTRIAL_CASES,
  ...TECH_CASES,
  ...HEALTHCARE_CASES,
  ...RETAIL_CASES,
  ...PUBLIC_SECTOR_CASES,
];

export function getCasesByIntervention(interventionId: string) {
  return ALL_CASES.filter((c) => c.intervention_id === interventionId);
}

export function getCasesBySector(sectorKeyword: string) {
  const k = sectorKeyword.toLowerCase();
  return ALL_CASES.filter((c) => c.sector.toLowerCase().includes(k));
}

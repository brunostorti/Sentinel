import type { SectorCase } from "./industrial";

export const HEALTHCARE_CASES: SectorCase[] = [
  {
    case_id: "healthcare.peer-support-2023",
    intervention_id: "burnout.early-signal-monitoring",
    sector: "Saúde",
    company_size_range: "300-1500",
    context_summary:
      "Hospital com equipes de enfermagem em turnos rotativos; burnout em 47% (escala MBI).",
    outcome_summary:
      "Treinamento de líderes em sinais precoces + grupos de suporte por pares quinzenais. Burnout caiu 18% em 9 meses.",
    source: "Estudo USP-EERP / Ministério da Saúde",
    year: 2023,
    url_or_doi: null,
  },
];

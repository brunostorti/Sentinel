/**
 * Casos setoriais — INDUSTRIAL.
 * Estrutura inicial; expandir com casos publicados verificáveis.
 */

export interface SectorCase {
  case_id: string;
  intervention_id: string; // bate com catalog.ts
  sector: string;
  company_size_range: string; // ex: "100-500"
  context_summary: string;
  outcome_summary: string;
  source: string;
  year: number;
  url_or_doi: string | null;
}

export const INDUSTRIAL_CASES: SectorCase[] = [
  {
    case_id: "industrial.shift-rotation-revision-2023",
    intervention_id: "workload.task-redistribution",
    sector: "Indústria pesada",
    company_size_range: "500-2000",
    context_summary:
      "Refinaria com turnos 6x1 e absenteísmo de 18 dias/ano por colaborador.",
    outcome_summary:
      "Reorganização de escalas para 4x2 + revisão de ritmos. Absenteísmo caiu 28% em 12 meses.",
    source: "Estudo de caso publicado FGV-EAESP",
    year: 2023,
    url_or_doi: null,
  },
  {
    case_id: "industrial.workplace-fitness-program-2024",
    intervention_id: "burnout.workplace-fitness-program",
    sector: "Indústria",
    company_size_range: "200-1000",
    context_summary:
      "Indústria com forte componente físico, queixas musculoesqueléticas crescentes.",
    outcome_summary:
      "Ginástica laboral + programa Wellhub reduziu afastamentos por LER/DORT em 22%.",
    source: "Fundacentro / OIT",
    year: 2024,
    url_or_doi: null,
  },
];

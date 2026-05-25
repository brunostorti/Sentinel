/**
 * Casos setoriais — TECH / SOFTWARE.
 */

import type { SectorCase } from "./industrial";

export const TECH_CASES: SectorCase[] = [
  {
    case_id: "tech.digital-disconnect-2024",
    intervention_id: "burnout.digital-disconnect-policy",
    sector: "Tech / Software",
    company_size_range: "50-300",
    context_summary:
      "Startup remota com expectativa implícita de resposta fora do horário; burnout em 35% das equipes.",
    outcome_summary:
      "Política de desconexão + remoção de notificações no Slack/Teams após 19h. Burnout caiu 24% em 6 meses.",
    source: "Owl Labs State of Remote Work BR",
    year: 2024,
    url_or_doi: null,
  },
  {
    case_id: "tech.teleterapia-zenklub-2024",
    intervention_id: "burnout.teleterapia-b2b",
    sector: "Tech",
    company_size_range: "100-500",
    context_summary:
      "Empresa de software com alta rotatividade (28%/ano) e sintomas de burnout pós-pandemia.",
    outcome_summary:
      "Adoção do Zenklub com 38% de adesão no primeiro trimestre. Turnover caiu para 19% em 12 meses.",
    source: "Caso Zenklub / GPTW Brasil",
    year: 2024,
    url_or_doi: null,
  },
];

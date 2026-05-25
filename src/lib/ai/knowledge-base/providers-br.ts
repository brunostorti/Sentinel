/**
 * Fornecedores brasileiros verificados.
 *
 * Cada fornecedor está vinculado a uma ou mais `intervention_id` do catálogo.
 * Preços baseados em pesquisa pública 2025 (sites/landing pages dos fornecedores).
 * O Consultant usa essa lista para preencher `vendors[]` na recommendation final.
 */

export interface Provider {
  /** ID estável para referência */
  provider_id: string;
  name: string;
  /** Em quais interventions essa empresa atua */
  applicable_to_intervention_ids: string[];
  modality: string; // ex: "teleterapia B2B", "plataforma SaaS"
  price_range: string; // ex: "R$35-60/colab/mês"
  price_per_employee_month_min: number;
  price_per_employee_month_max: number;
  contact_url: string;
  description: string;
  regions_attended: "nacional" | string[]; // UFs ou "nacional"
  notes?: string;
}

export const PROVIDERS_BR: Provider[] = [
  /* ─── Teleterapia / Saúde mental B2B ─── */
  {
    provider_id: "zenklub",
    name: "Zenklub",
    applicable_to_intervention_ids: ["burnout.teleterapia-b2b"],
    modality: "Teleterapia B2B (sessões online com psicólogos)",
    price_range: "R$35-60/colab/mês",
    price_per_employee_month_min: 35,
    price_per_employee_month_max: 60,
    contact_url: "https://www.zenklub.com.br/empresas",
    description:
      "Maior plataforma de teleterapia B2B do Brasil. >5.000 psicólogos. Pacotes com sessões/colaborador/mês.",
    regions_attended: "nacional",
  },
  {
    provider_id: "vittude",
    name: "Vittude",
    applicable_to_intervention_ids: ["burnout.teleterapia-b2b"],
    modality: "Teleterapia B2B + workshops de bem-estar",
    price_range: "R$40-70/colab/mês",
    price_per_employee_month_min: 40,
    price_per_employee_month_max: 70,
    contact_url: "https://www.vittude.com.br/empresas",
    description:
      "Plataforma de saúde mental corporativa com terapia individual, workshops e dashboards de uso.",
    regions_attended: "nacional",
  },
  {
    provider_id: "psicologia-viva",
    name: "Psicologia Viva",
    applicable_to_intervention_ids: ["burnout.teleterapia-b2b"],
    modality: "Teleterapia + plantão psicológico 24h",
    price_range: "R$30-55/colab/mês",
    price_per_employee_month_min: 30,
    price_per_employee_month_max: 55,
    contact_url: "https://www.psicologiaviva.com.br/empresas",
    description:
      "Plataforma com plantão emergencial 24/7 + sessões agendadas. Boa para indústria.",
    regions_attended: "nacional",
  },

  /* ─── Bem-estar / Fitness ─── */
  {
    provider_id: "wellhub",
    name: "Wellhub (ex-Gympass)",
    applicable_to_intervention_ids: ["burnout.workplace-fitness-program"],
    modality: "Acesso a academias, apps de meditação, nutricionistas",
    price_range: "R$80-150/colab/mês",
    price_per_employee_month_min: 80,
    price_per_employee_month_max: 150,
    contact_url: "https://wellhub.com/pt-br/empresas/",
    description:
      "Plataforma de bem-estar com rede de >50.000 academias no Brasil + apps integrados (Calm, Strava, Wysa).",
    regions_attended: "nacional",
  },
  {
    provider_id: "totalpass",
    name: "TotalPass",
    applicable_to_intervention_ids: ["burnout.workplace-fitness-program"],
    modality: "Academias + saúde mental + nutrição",
    price_range: "R$60-120/colab/mês",
    price_per_employee_month_min: 60,
    price_per_employee_month_max: 120,
    contact_url: "https://www.totalpass.com/empresas",
    description:
      "Alternativa nacional ao Wellhub com pacotes flexíveis e foco em interior do Brasil.",
    regions_attended: "nacional",
  },

  /* ─── Canal de denúncia / Compliance ─── */
  {
    provider_id: "safespace",
    name: "SafeSpace",
    applicable_to_intervention_ids: [
      "offensive.anti-harassment-channel",
      "leadership.feedback-channel",
    ],
    modality: "Canal de denúncia com investigação",
    price_range: "R$5-15/colab/mês",
    price_per_employee_month_min: 5,
    price_per_employee_month_max: 15,
    contact_url: "https://www.safespace.com.br/",
    description:
      "Canal de denúncia anônimo + módulo de investigação para RH. Líder em compliance no Brasil.",
    regions_attended: "nacional",
  },
  {
    provider_id: "contato-seguro",
    name: "Contato Seguro",
    applicable_to_intervention_ids: [
      "offensive.anti-harassment-channel",
      "leadership.feedback-channel",
    ],
    modality: "Canal de denúncia + ouvidoria terceirizada",
    price_range: "R$3-10/colab/mês",
    price_per_employee_month_min: 3,
    price_per_employee_month_max: 10,
    contact_url: "https://www.contatoseguro.com.br/",
    description:
      "Ouvidoria terceirizada com triagem por equipe própria. Modelo SaaS + serviço.",
    regions_attended: "nacional",
  },

  /* ─── Pesquisa de clima / Engajamento ─── */
  {
    provider_id: "pulses",
    name: "Pulses by Gupy",
    applicable_to_intervention_ids: ["meaning.pulse-surveys"],
    modality: "Pulse surveys + analytics de clima",
    price_range: "R$8-20/colab/mês",
    price_per_employee_month_min: 8,
    price_per_employee_month_max: 20,
    contact_url: "https://www.pulses.com.br/",
    description:
      "Plataforma brasileira de pulse surveys com gamificação e benchmarks setoriais.",
    regions_attended: "nacional",
  },
  {
    provider_id: "pin-people",
    name: "Pin People",
    applicable_to_intervention_ids: [
      "meaning.pulse-surveys",
      "leadership.feedback-channel",
    ],
    modality: "Engajamento, eNPS, clima e cultura",
    price_range: "R$10-25/colab/mês",
    price_per_employee_month_min: 10,
    price_per_employee_month_max: 25,
    contact_url: "https://www.pinpeople.com.br/",
    description:
      "Plataforma de people analytics com dashboards executivos e diagnóstico cultural.",
    regions_attended: "nacional",
  },

  /* ─── Feedback / Engajamento estruturado ─── */
  {
    provider_id: "feedz",
    name: "Feedz",
    applicable_to_intervention_ids: [
      "communication.bidirectional-feedback",
      "recognition.peer-recognition-platform",
      "leadership.weekly-1on1",
    ],
    modality: "Plataforma de feedback contínuo + 1:1 + reconhecimento",
    price_range: "R$15-30/colab/mês",
    price_per_employee_month_min: 15,
    price_per_employee_month_max: 30,
    contact_url: "https://www.feedz.com.br/",
    description:
      "Feedback contínuo, 1:1 estruturado, OKR e reconhecimento. Brasileira, integra com Slack/Teams.",
    regions_attended: "nacional",
  },
  {
    provider_id: "qulture-rocks",
    name: "Qulture.Rocks",
    applicable_to_intervention_ids: [
      "communication.bidirectional-feedback",
      "recognition.formal-program",
    ],
    modality: "Performance, OKRs, 1:1 e reconhecimento",
    price_range: "R$20-40/colab/mês",
    price_per_employee_month_min: 20,
    price_per_employee_month_max: 40,
    contact_url: "https://qulture.rocks/",
    description:
      "Plataforma robusta de performance + cultura. Mais cara, foca empresas médias/grandes.",
    regions_attended: "nacional",
  },
];

/** Busca providers que atendem uma intervention */
export function getProvidersForIntervention(
  interventionId: string
): Provider[] {
  return PROVIDERS_BR.filter((p) =>
    p.applicable_to_intervention_ids.includes(interventionId)
  );
}

/** Filtra providers por orçamento/colab/mês máximo */
export function getAffordableProviders(
  interventionId: string,
  maxPerEmployeeMonth: number
): Provider[] {
  return getProvidersForIntervention(interventionId).filter(
    (p) => p.price_per_employee_month_min <= maxPerEmployeeMonth
  );
}

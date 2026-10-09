/**
 * Fornecedores brasileiros por intervenção.
 *
 * Cada fornecedor está vinculado a uma ou mais `intervention_id` do catálogo.
 * O Consultant usa essa lista para preencher `vendors[]` na recommendation final.
 *
 * Auditoria de 07/10/2026: links conferidos (HTTP 200). Nenhum fornecedor publica
 * preço no site, então NÃO guardamos faixa de preço — o plano exibe "Sob consulta".
 * Descrições são neutras (o que o serviço é), sem alegações de mercado não verificáveis.
 * Listar um fornecedor não é endosso: é ponto de partida para o RH cotar.
 */

export interface Provider {
  /** ID estável para referência */
  provider_id: string;
  name: string;
  /** Em quais interventions essa empresa atua */
  applicable_to_intervention_ids: string[];
  modality: string; // ex: "teleterapia B2B", "plataforma SaaS"
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
    contact_url: "https://www.zenklub.com.br/empresas",
    description: "Plataforma de saúde mental para empresas, com atendimento psicológico online.",
    regions_attended: "nacional",
  },
  {
    provider_id: "vittude",
    name: "Vittude",
    applicable_to_intervention_ids: ["burnout.teleterapia-b2b"],
    modality: "Teleterapia B2B + ações de bem-estar",
    contact_url: "https://www.vittude.com.br/empresas",
    description: "Plataforma de saúde mental corporativa com terapia online para colaboradores.",
    regions_attended: "nacional",
  },
  {
    provider_id: "psicologia-viva",
    name: "Psicologia Viva",
    applicable_to_intervention_ids: ["burnout.teleterapia-b2b"],
    modality: "Teleterapia (consultas online com psicólogos)",
    contact_url: "https://www.psicologiaviva.com.br/",
    description: "Plataforma de consultas online com psicólogos.",
    regions_attended: "nacional",
  },

  /* ─── Bem-estar / Atividade física ─── */
  {
    provider_id: "wellhub",
    name: "Wellhub (ex-Gympass)",
    applicable_to_intervention_ids: ["burnout.workplace-fitness-program"],
    modality: "Benefício corporativo de bem-estar (academias e apps)",
    contact_url: "https://wellhub.com/pt-br/",
    description: "Assinatura corporativa de bem-estar: atividade física, mindfulness, nutrição e sono.",
    regions_attended: "nacional",
  },
  {
    provider_id: "totalpass",
    name: "TotalPass",
    applicable_to_intervention_ids: ["burnout.workplace-fitness-program"],
    modality: "Benefício corporativo de academias e bem-estar",
    contact_url: "https://www.totalpass.com/empresas",
    description: "Benefício corporativo de acesso a academias e serviços de bem-estar.",
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
    modality: "Canal de denúncias para RH e compliance",
    contact_url: "https://www.safespace.com.br/",
    description: "Canal de denúncias para RH e compliance, com recebimento anônimo de relatos.",
    regions_attended: "nacional",
  },
  {
    provider_id: "contato-seguro",
    name: "Contato Seguro",
    applicable_to_intervention_ids: [
      "offensive.anti-harassment-channel",
      "leadership.feedback-channel",
    ],
    modality: "Canal de denúncias terceirizado",
    contact_url: "https://www.contatoseguro.com.br/",
    description: "Canal de denúncias terceirizado para empresas.",
    regions_attended: "nacional",
  },

  /* ─── Pesquisa de clima / Engajamento ─── */
  {
    provider_id: "pulses",
    name: "Pulses (Gupy)",
    applicable_to_intervention_ids: ["meaning.pulse-surveys"],
    modality: "Plataforma de clima e engajamento",
    contact_url: "https://www.pulses.com.br/",
    description: "Plataforma de pesquisas de clima e engajamento (pulse surveys).",
    regions_attended: "nacional",
  },
  {
    provider_id: "pin-people",
    name: "Pin People",
    applicable_to_intervention_ids: [
      "meaning.pulse-surveys",
      "leadership.feedback-channel",
    ],
    modality: "Plataforma de experiência do colaborador",
    contact_url: "https://www.pinpeople.com.br/",
    description: "Plataforma de pesquisas e análise da experiência do colaborador.",
    regions_attended: "nacional",
  },

  /* ─── Feedback / Engajamento estruturado ─── */
  {
    provider_id: "feedz",
    name: "Feedz (TOTVS)",
    applicable_to_intervention_ids: [
      "communication.bidirectional-feedback",
      "social.peer-recognition-platform",
      "leadership.weekly-1on1",
    ],
    modality: "Plataforma de feedback, 1:1, clima e reconhecimento",
    contact_url: "https://www.feedz.com.br/",
    description: "Sistema de gestão de desempenho e engajamento de colaboradores.",
    regions_attended: "nacional",
  },
  {
    provider_id: "qulture-rocks",
    name: "Qulture.Rocks",
    applicable_to_intervention_ids: [
      "communication.bidirectional-feedback",
      "recognition.formal-program",
    ],
    modality: "Plataforma de desempenho, OKRs, 1:1 e reconhecimento",
    contact_url: "https://qulture.rocks/",
    description: "Plataforma de gestão de desempenho e aprendizagem.",
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

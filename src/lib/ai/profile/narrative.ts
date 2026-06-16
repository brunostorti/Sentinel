/**
 * Traduz CompanyProfile (JSONB cru) para prosa, que prompts LLM consomem melhor.
 *
 * Usado por:
 *  - Stage 1 (Analyst): forma COMPACTA — sinais essenciais
 *  - Stage 2 (Curator): forma COMPLETA — todos os campos
 *  - Stage 3 (Consultant): forma COMPLETA + casos setoriais
 *  - Chat (system prompt): forma COMPLETA
 */

import type { CompanyProfile } from "./schema";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

function brl(n: number | null | undefined): string {
  if (n == null) return "não declarado";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/**
 * Forma COMPACTA — usada pelo Analyst (Stage 1) onde queremos só sinais essenciais.
 * ~3-5 linhas.
 */
export function buildPerfilCompacto(
  company: CompanyInfo,
  profile: CompanyProfile
): string {
  const parts: string[] = [];

  parts.push(
    `Empresa: ${company.name}${company.industry ? ` (${company.industry})` : ""}${
      company.employee_count ? ` — ${company.employee_count} colaboradores` : ""
    }`
  );

  const cult = profile.culture_type;
  const speed = profile.decision_speed;
  if (cult || speed) {
    parts.push(
      `Cultura: ${cult ?? "não declarada"}${
        speed ? ` • Decisão: ${speed === "fast" ? "rápida" : speed === "slow" ? "lenta" : "normal"}` : ""
      }`
    );
  }

  if (profile.predominant_role_type) {
    parts.push(`Predominância: ${profile.predominant_role_type}`);
  }

  if (profile.has_remote || profile.has_shift_workers) {
    const flags = [];
    if (profile.has_remote) flags.push("remoto");
    if (profile.has_shift_workers) flags.push("turnos");
    if (profile.has_unionized_workers) flags.push("sindicalizado");
    parts.push(`Modos: ${flags.join(", ")}`);
  }

  return parts.join(" | ");
}

/**
 * Forma COMPLETA — usada pelo Curator, Consultant e Chat.
 * ~10-20 linhas, em prosa rica.
 */
export function buildPerfilNarrativo(
  company: CompanyInfo,
  profile: CompanyProfile,
  history: { title: string; year: number | null; outcome: string | null; notes?: string | null }[] = []
): string {
  const lines: string[] = [];

  // Identificação
  let intro = `${company.name}`;
  if (company.industry) intro += ` é uma empresa do setor de ${company.industry}`;
  if (company.employee_count)
    intro += ` com ${company.employee_count} colaboradores`;
  if (company.work_regime) intro += ` em regime ${company.work_regime}`;
  intro += ".";
  lines.push(intro);

  // Regiões
  if (profile.regions && profile.regions.length > 0) {
    lines.push(
      `Opera nos estados: ${profile.regions.join(", ")}${
        profile.has_remote ? " (com trabalho remoto)" : ""
      }${profile.has_shift_workers ? " e turnos rotativos" : ""}.`
    );
  }

  // Cultura
  const culturaLabel: Record<string, string> = {
    startup: "cultura de startup",
    family: "cultura familiar",
    corporate: "cultura corporativa tradicional",
    public: "cultura de setor público",
    multinational: "cultura multinacional",
    other: "cultura particular",
  };
  if (profile.culture_type) {
    lines.push(
      `Tem ${culturaLabel[profile.culture_type] ?? profile.culture_type}${
        profile.decision_speed
          ? ` com decisão ${
              profile.decision_speed === "fast"
                ? "rápida"
                : profile.decision_speed === "slow"
                  ? "lenta (comitês, conselho)"
                  : "em ritmo normal"
            }`
          : ""
      }.`
    );
  }

  // Estrutura RH
  const rhFlags: string[] = [];
  if (profile.has_dedicated_hr === true) rhFlags.push("RH dedicado");
  if (profile.has_dedicated_hr === false) rhFlags.push("sem RH dedicado");
  if (profile.has_internal_training === true) rhFlags.push("T&D interno");
  if (profile.has_occupational_health === true)
    rhFlags.push("saúde ocupacional in-house");
  if (profile.has_compliance_officer === true) rhFlags.push("compliance próprio");
  if (rhFlags.length > 0) {
    let rhLine = `Estrutura: ${rhFlags.join(", ")}`;
    if (profile.hr_team_size) rhLine += ` (equipe RH: ${profile.hr_team_size})`;
    rhLine += ".";
    lines.push(rhLine);
  }

  // Orçamento
  if (profile.annual_budget_brl != null) {
    const flexLabel: Record<string, string> = {
      rigid: "rígido",
      flexible: "flexível",
      unlocked_for_critical: "liberado para casos críticos",
    };
    lines.push(
      `Orçamento anual para saúde/bem-estar: ${brl(profile.annual_budget_brl)}${
        profile.budget_flexibility
          ? ` (${flexLabel[profile.budget_flexibility]})`
          : ""
      }${
        profile.existing_wellbeing_spend_brl
          ? `. Já gasta ${brl(profile.existing_wellbeing_spend_brl)}/ano em iniciativas atuais`
          : ""
      }.`
    );
  }

  // Restrições
  if (profile.constraints && profile.constraints.length > 0) {
    lines.push(`Restrições declaradas: ${profile.constraints.join("; ")}.`);
  }
  if (profile.avoid_modalities && profile.avoid_modalities.length > 0) {
    lines.push(
      `Modalidades a evitar: ${profile.avoid_modalities.join(", ")}.`
    );
  }
  if (profile.preferred_modalities && profile.preferred_modalities.length > 0) {
    lines.push(
      `Modalidades preferidas: ${profile.preferred_modalities.join(", ")}.`
    );
  }

  // Histórico
  if (history.length > 0) {
    const summarized = history
      .slice(0, 6)
      .map((h) => {
        const outcomeLabel: Record<string, string> = {
          successful: "deu certo",
          partial: "resultado parcial",
          unsuccessful: "não funcionou",
          abandoned: "abandonada",
          in_progress: "em andamento",
          unknown: "resultado desconhecido",
        };
        const year = h.year ? `em ${h.year}` : "no passado";
        const out = h.outcome ? outcomeLabel[h.outcome] ?? h.outcome : "sem registro de resultado";
        const notesStr = h.notes ? `, observações do RH: "${h.notes}"` : "";
        return `"${h.title}" ${year} (${out}${notesStr})`;
      })
      .join("; ");
    lines.push(`Já tentou: ${summarized}.`);
  }

  // Valores declarados
  if (profile.declared_values && profile.declared_values.length > 0) {
    lines.push(
      `Valores que declara seguir: ${profile.declared_values.join(", ")}.`
    );
  }

  // Aviso de perfil incompleto
  if (profile.setup_completeness < 50) {
    lines.push(
      `ATENÇÃO: perfil da empresa está apenas ${Math.round(profile.setup_completeness)}% completo. Personalização será limitada — recomende ao HR completar o perfil em /configuracoes/perfil.`
    );
  }

  return lines.join(" ");
}

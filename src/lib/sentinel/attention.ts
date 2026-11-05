/* Painel Master: pontos de atenção e custo estimado de IA. Funções puras. */

import { findModel, MAUA_MODEL_ID } from "@/lib/ai/models";
import { responseRate, type CompanyOverview } from "./onboarding";

export interface CompanyAttention {
  company_id: string;
  reports_stale: number;
  plans_pending_oldest_at: string | null;
  documents_error: number;
  tasks_overdue: number;
}

export function parseAttentionRow(row: Record<string, unknown>): CompanyAttention {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  return {
    company_id: String(row.company_id),
    reports_stale: n(row.reports_stale),
    plans_pending_oldest_at: row.plans_pending_oldest_at == null ? null : String(row.plans_pending_oldest_at),
    documents_error: n(row.documents_error),
    tasks_overdue: n(row.tasks_overdue),
  };
}

export type AlertLevel = "alta" | "media";

export interface CompanyAlert {
  key: string;
  level: AlertLevel;
  text: string;
}

/** Limites dos alertas (fáceis de ajustar). */
export const ALERT_RULES = {
  lowResponseRate: 30, // % de resposta abaixo disso...
  lowResponseAfterDays: 7, // ...com a pesquisa aberta há pelo menos isso
  planPendingDays: 15,
} as const;

const DAY_MS = 86_400_000;
const daysSince = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** O que pede ação da equipe nesta empresa, da mais urgente para a menos. */
export function companyAlerts(
  overview: CompanyOverview | null,
  attention: CompanyAttention | null,
  now: Date = new Date()
): CompanyAlert[] {
  const alerts: CompanyAlert[] = [];
  if (attention && attention.reports_stale > 0) {
    alerts.push({
      key: "reports_stale",
      level: "alta",
      text: `${plural(attention.reports_stale, "denúncia parada", "denúncias paradas")} há mais de 7 dias`,
    });
  }
  if (overview && !overview.ai_key_configured) {
    alerts.push({ key: "no_ai_key", level: "alta", text: "Sem chave de IA: planos de ação não podem ser gerados" });
  }
  if (overview && overview.last_survey_status === "ACTIVE" && overview.last_survey_at) {
    const rate = responseRate(overview);
    const days = daysSince(overview.last_survey_at, now);
    if (rate !== null && rate < ALERT_RULES.lowResponseRate && days >= ALERT_RULES.lowResponseAfterDays) {
      alerts.push({
        key: "low_response",
        level: "media",
        text: `Pesquisa aberta há ${days} dias com ${rate}% de resposta`,
      });
    }
  }
  if (attention?.plans_pending_oldest_at) {
    const days = daysSince(attention.plans_pending_oldest_at, now);
    if (days >= ALERT_RULES.planPendingDays) {
      alerts.push({ key: "plans_pending", level: "media", text: `Plano aguardando revisão há ${days} dias` });
    }
  }
  if (attention && attention.documents_error > 0) {
    alerts.push({
      key: "documents_error",
      level: "media",
      text: `${plural(attention.documents_error, "documento", "documentos")} com erro de processamento`,
    });
  }
  if (attention && attention.tasks_overdue > 0) {
    alerts.push({
      key: "tasks_overdue",
      level: "media",
      text: `${plural(attention.tasks_overdue, "tarefa atrasada", "tarefas atrasadas")} no Kanban`,
    });
  }
  return alerts;
}

export interface AiUsageRow {
  company_id: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export function parseAiUsageRow(row: Record<string, unknown>): AiUsageRow {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  return {
    company_id: String(row.company_id),
    model: String(row.model),
    calls: n(row.calls),
    input_tokens: n(row.input_tokens),
    output_tokens: n(row.output_tokens),
  };
}

export interface AiUsageSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** Custo estimado em US$ pelos preços de referência; null se nenhum modelo tem preço. */
  costUsd: number | null;
  /** Há modelo usado sem preço conhecido (custo pode estar subestimado). */
  partial: boolean;
}

/** Soma o uso de uma empresa e estima o custo com a tabela de preços de models.ts. */
export function summarizeAiUsage(rows: AiUsageRow[]): AiUsageSummary {
  let cost = 0;
  let priced = false;
  let partial = false;
  for (const r of rows) {
    if (r.model === MAUA_MODEL_ID) {
      priced = true; // gratuita
      continue;
    }
    const price = findModel(r.model)?.priceUsdPerMTok;
    if (!price) {
      partial = true;
      continue;
    }
    priced = true;
    cost += (r.input_tokens * price.input + r.output_tokens * price.output) / 1_000_000;
  }
  return {
    calls: rows.reduce((a, r) => a + r.calls, 0),
    inputTokens: rows.reduce((a, r) => a + r.input_tokens, 0),
    outputTokens: rows.reduce((a, r) => a + r.output_tokens, 0),
    costUsd: priced ? Math.round(cost * 100) / 100 : null,
    partial,
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return String(n);
}

export function formatUsd(v: number | null): string {
  if (v === null) return "—";
  return `US$ ${v.toFixed(2).replace(".", ",")}`;
}

import { Icon } from "@/components/icon";
import type { AIRecommendation } from "@/lib/ai/pipeline/types";
import { StrategyBadge } from "../_components/strategy-badge";

/**
 * Header de visão geral do plano — leitura rápida acima da matriz 5W2H:
 * título da ação, descrição, estratégia (com significado) e KPIs-chave.
 */
export function PlanOverview({
  recommendation,
  timeframe,
}: {
  recommendation: AIRecommendation;
  timeframe: string | null;
}) {
  const r = recommendation;
  const investment =
    r.investment?.total_annual && r.investment.total_annual !== "N/D"
      ? r.investment.total_annual
      : null;
  const payback =
    r.expected_return?.payback_period && r.expected_return.payback_period !== "N/D"
      ? r.expected_return.payback_period
      : null;

  const kpis = [
    investment && { icon: "payments", color: "text-blue-500", label: investment },
    payback && { icon: "timer", color: "text-emerald-500", label: payback },
    timeframe && { icon: "schedule", color: "text-violet-500", label: timeframe },
  ].filter(Boolean) as { icon: string; color: string; label: string }[];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-black leading-tight tracking-tight">{r.title}</h2>
        <StrategyBadge status={r.recommendation_status} withMeaning />
      </div>

      {r.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {r.description}
        </p>
      )}

      {kpis.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4">
          {kpis.map((k, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Icon name={k.icon} size={16} className={k.color} />
              {k.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

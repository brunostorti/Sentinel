"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import type { PlanView } from "./types";

/* ─── Config ─── */

const RISK_CONFIG = {
  RED: {
    bar: "from-red-500 to-red-600",
    bg: "from-red-50/60 to-transparent dark:from-red-950/20 dark:to-transparent",
    dot: "bg-red-500",
    label: "Risco",
    labelCls: "bg-red-500 text-white",
    scoreCls: "text-red-600 dark:text-red-400",
    trackCls: "bg-red-500",
  },
  YELLOW: {
    bar: "from-amber-400 to-amber-500",
    bg: "from-amber-50/60 to-transparent dark:from-amber-950/20 dark:to-transparent",
    dot: "bg-amber-500",
    label: "Intermédio",
    labelCls: "bg-amber-500 text-white",
    scoreCls: "text-amber-600 dark:text-amber-400",
    trackCls: "bg-amber-500",
  },
};

const STATUS_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  PENDING_REVIEW: {
    label: "Pendente",
    icon: "schedule",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  APPROVED: {
    label: "Aprovado",
    icon: "check_circle",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rejeitado",
    icon: "cancel",
    cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  critica: {
    label: "Crítica",
    icon: "emergency",
    cls: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20",
  },
  alta: {
    label: "Alta",
    icon: "priority_high",
    cls: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20",
  },
  media: {
    label: "Média",
    icon: "drag_handle",
    cls: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/20",
  },
  baixa: {
    label: "Baixa",
    icon: "arrow_downward",
    cls: "bg-muted text-muted-foreground",
  },
};

/* ─── Component ─── */

export function PlanCard({
  plan,
  onClick,
}: {
  plan: PlanView;
  onClick: () => void;
}) {
  const rec = plan.recommendation;
  const risk = RISK_CONFIG[plan.riskLevel] ?? RISK_CONFIG.YELLOW;
  const status = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.PENDING_REVIEW;
  const priority = PRIORITY_CONFIG[plan.priority ?? "media"] ?? PRIORITY_CONFIG.media;

  return (
    <Card
      className="card-hover group relative cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Gradient left bar */}
      <div
        className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${risk.bar}`}
      />

      {/* Subtle risk background gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${risk.bg}`}
      />

      <CardContent className="relative flex gap-4 p-4 pl-5">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Top: Dimension + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${priority.cls}`}
            >
              <Icon name={priority.icon} size={10} />
              {priority.label}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${status.cls}`}
            >
              <Icon name={status.icon} size={10} />
              {status.label}
            </span>
            {rec.nr1_compliance && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                <Icon name="gavel" size={10} />
                NR-1
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-2 text-sm font-bold leading-snug tracking-tight line-clamp-2">
            {rec.title}
          </h3>

          {/* Dimension */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plan.dimensionName}
          </p>

          {/* Quick action */}
          {rec.quick_action && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50/80 px-2.5 py-1.5 dark:bg-emerald-950/20">
              <Icon
                name="bolt"
                size={13}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 line-clamp-2">
                {rec.quick_action}
              </p>
            </div>
          )}

          {/* Footer: metrics row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {rec.investment?.total_annual &&
              rec.investment.total_annual !== "N/D" && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="payments" size={13} className="text-blue-500" />
                  <span className="font-semibold text-foreground">
                    {rec.investment.total_annual}
                  </span>
                </span>
              )}
            {rec.expected_return?.payback_period &&
              rec.expected_return.payback_period !== "N/D" && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="timer" size={13} className="text-emerald-500" />
                  Payback:{" "}
                  <span className="font-semibold text-foreground">
                    {rec.expected_return.payback_period}
                  </span>
                </span>
              )}
            {plan.timeframe && (
              <span className="inline-flex items-center gap-1">
                <Icon name="schedule" size={13} className="text-violet-500" />
                {plan.timeframe}
              </span>
            )}
          </div>
        </div>

        {/* Right: mini score visual + arrow */}
        <div className="flex shrink-0 flex-col items-center justify-between">
          {/* Risk indicator circle */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              plan.riskLevel === "RED"
                ? "bg-gradient-to-br from-red-500/15 to-red-600/10"
                : "bg-gradient-to-br from-amber-500/15 to-amber-600/10"
            }`}
          >
            <Icon
              name={plan.riskLevel === "RED" ? "error" : "warning"}
              size={20}
              className={risk.scoreCls}
            />
          </div>

          {/* Chevron hint */}
          <Icon
            name="chevron_right"
            size={18}
            className="mt-auto text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/60"
          />
        </div>
      </CardContent>
    </Card>
  );
}

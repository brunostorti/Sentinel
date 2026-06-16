"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";

interface KPICardsProps {
  activeSurveys: number;
  totalResponses: number;
  responseRate: number;
  totalParticipants: number;
}

const kpis: {
  key: keyof KPICardsProps;
  label: string;
  icon: string;
  gradient: string;
  iconBg: string;
  accentGradient: string;
  suffix?: string;
}[] = [
  {
    key: "activeSurveys",
    label: "Pesquisas Ativas",
    icon: "assignment",
    gradient: "from-blue-500 to-blue-600",
    iconBg: "bg-gradient-to-br from-blue-500/15 to-blue-600/10 text-blue-600 dark:text-blue-400",
    accentGradient: "from-blue-500 via-blue-400 to-blue-600",
  },
  {
    key: "totalResponses",
    label: "Respostas Recebidas",
    icon: "check_circle",
    gradient: "from-emerald-500 to-emerald-600",
    iconBg: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 text-emerald-600 dark:text-emerald-400",
    accentGradient: "from-emerald-500 via-emerald-400 to-emerald-600",
  },
  {
    key: "responseRate",
    label: "Taxa de Resposta",
    icon: "trending_up",
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400",
    accentGradient: "from-amber-500 via-orange-400 to-amber-600",
    suffix: "%",
  },
  {
    key: "totalParticipants",
    label: "Total Convidados",
    icon: "group",
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-gradient-to-br from-violet-500/15 to-purple-600/10 text-violet-600 dark:text-violet-400",
    accentGradient: "from-violet-500 via-purple-400 to-violet-600",
  },
];

export function KPICards(props: KPICardsProps) {
  return (
    <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card
          key={kpi.key}
          className="card-hover group relative overflow-hidden"
        >
          {/* Top gradient accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.accentGradient}`}
          />
          {/* Subtle background glow */}
          <div
            className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.gradient} opacity-[0.04] transition-opacity group-hover:opacity-[0.08]`}
          />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1.5 text-3xl font-black tracking-tight">
                  {props[kpi.key]}
                  {kpi.suffix ?? ""}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.iconBg} transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon name={kpi.icon} size={22} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

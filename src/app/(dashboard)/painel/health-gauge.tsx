"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { DimensionScore } from "@/lib/copsoq/types";

interface HealthGaugeProps {
  scores: DimensionScore[];
  totalResponses: number;
  totalParticipants: number;
  responseRate: number;
}

function getHealthColor(score: number) {
  if (score >= 66) return { color: "#2ecc71", label: "Bom", ring: "ring-emerald-200 dark:ring-emerald-700" };
  if (score >= 40) return { color: "#f1c40f", label: "Atenção", ring: "ring-amber-200 dark:ring-amber-700" };
  return { color: "#e74c3c", label: "Crítico", ring: "ring-red-200 dark:ring-red-700" };
}

export function HealthGauge({
  scores,
  totalResponses,
  totalParticipants,
  responseRate,
}: HealthGaugeProps) {
  const healthIndex =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, s) => {
            if (s.trafficLight === "GREEN") return sum + 100;
            if (s.trafficLight === "YELLOW") return sum + 50;
            return sum;
          }, 0) / scores.length
        )
      : 0;

  const { color, label, ring } = getHealthColor(healthIndex);

  const gaugeData = [
    { value: healthIndex },
    { value: 100 - healthIndex },
  ];

  const greenCount = scores.filter((s) => s.trafficLight === "GREEN").length;
  const yellowCount = scores.filter((s) => s.trafficLight === "YELLOW").length;
  const redCount = scores.filter((s) => s.trafficLight === "RED").length;

  return (
    <Card className="card-hover animate-fade-in-up overflow-hidden">
      <CardContent className="py-6">
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className={`relative h-36 w-36 shrink-0 rounded-full ring-4 ${ring} ring-offset-2 ring-offset-card`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={64}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  <Cell fill={color} />
                  <Cell fill="var(--muted)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tracking-tight">{healthIndex}</span>
              <span className="text-[10px] font-medium text-muted-foreground">de 100</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Índice de Saúde Psicossocial
              </h3>
              <p className="text-xl font-black tracking-tight" style={{ color }}>
                {label}
              </p>
            </div>

            {/* Distribution */}
            <div className="flex gap-4">
              {[
                { count: greenCount, label: "favorável", color: "bg-emerald-500" },
                { count: yellowCount, label: "intermédio", color: "bg-amber-500" },
                { count: redCount, label: "risco", color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{item.count}</span>{" "}
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Response rate bar */}
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Taxa de resposta</span>
                <span className="font-semibold text-foreground">
                  {totalResponses}/{totalParticipants} ({responseRate}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

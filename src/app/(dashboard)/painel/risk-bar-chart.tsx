"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DimensionScore } from "@/lib/copsoq/types";

interface RiskBarChartProps {
  scores: DimensionScore[];
}

const TRAFFIC_COLORS = {
  GREEN: "#2ecc71",
  YELLOW: "#f1c40f",
  RED: "#e74c3c",
};

export function RiskBarChart({ scores }: RiskBarChartProps) {
  if (scores.length === 0) return null;

  const sorted = [...scores].sort((a, b) => {
    const order = { RED: 0, YELLOW: 1, GREEN: 2 };
    const levelDiff = order[a.trafficLight] - order[b.trafficLight];
    if (levelDiff !== 0) return levelDiff;
    return a.displayScore - b.displayScore;
  });

  const data = sorted.map((s) => ({
    name: s.name.length > 28 ? s.name.slice(0, 26) + "…" : s.name,
    fullName: s.name,
    score: Math.round(s.displayScore),
    trafficLight: s.trafficLight,
    category: s.category,
  }));

  return (
    <Card className="card-hover animate-fade-in-up overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Ranking de Dimensões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(350, data.length * 28 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} strokeOpacity={0.5} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--background))",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [`${value}/100`, "Score"]}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName ?? String(label);
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <ReferenceLine x={33} stroke="#f1c40f" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
            <ReferenceLine x={66} stroke="#2ecc71" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={index} fill={TRAFFIC_COLORS[entry.trafficLight]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

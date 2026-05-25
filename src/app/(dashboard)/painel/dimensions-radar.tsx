"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DimensionScore } from "@/lib/copsoq/types";

interface DimensionsRadarProps {
  scores: DimensionScore[];
}

export function DimensionsRadar({ scores }: DimensionsRadarProps) {
  if (scores.length === 0) return null;

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const s of scores) {
    const existing = categoryMap.get(s.category) ?? { total: 0, count: 0 };
    existing.total += s.displayScore;
    existing.count++;
    categoryMap.set(s.category, existing);
  }

  const radarData = Array.from(categoryMap.entries()).map(([category, data]) => {
    const avg = Math.round(data.total / data.count);
    const shortName = category
      .replace("Organização do Trabalho e Conteúdo", "Org. Trabalho")
      .replace("Relações Sociais e Liderança", "Relações Sociais")
      .replace("Exigências no Trabalho", "Exigências")
      .replace("Interface Trabalho-Indivíduo", "Interface T/I")
      .replace("Comportamentos Ofensivos", "Comp. Ofensivos")
      .replace("Saúde e Bem-Estar", "Saúde");
    return {
      category: shortName,
      fullName: category,
      score: avg,
      fullMark: 100,
    };
  });

  return (
    <Card className="card-hover animate-fade-in-up overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Visão por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
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
                const item = radarData.find((r) => r.category === label);
                return item?.fullName ?? String(label);
              }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#1968e6"
              fill="url(#radarGradient)"
              fillOpacity={0.3}
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#1968e6", strokeWidth: 2, stroke: "#fff" }}
              animationDuration={1000}
            />
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1968e6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#1968e6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

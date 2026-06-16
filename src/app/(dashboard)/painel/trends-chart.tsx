"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface TrendsChartProps {
  surveys: { id: string; title: string; closedAt: string }[];
  dimensions: {
    dimensionId: string;
    name: string;
    category: string;
    scores: { surveyId: string; displayScore: number }[];
  }[];
}

const CHART_COLORS = [
  "#1968e6",
  "#e74c3c",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#34495e",
  "#e84393",
  "#00b894",
];

export function TrendsChart({ surveys, dimensions }: TrendsChartProps) {
  const categories = [...new Set(dimensions.map((d) => d.category))];
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "");

  if (surveys.length < 2 || dimensions.length === 0) {
    return null;
  }

  const filteredDimensions = selectedCategory
    ? dimensions.filter((d) => d.category === selectedCategory)
    : dimensions;

  const chartData = surveys.map((survey) => {
    const row: Record<string, string | number> = {
      name: survey.title,
      date: new Date(survey.closedAt).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
    };

    for (const dim of filteredDimensions) {
      const match = dim.scores.find((s) => s.surveyId === survey.id);
      if (match) {
        row[dim.name] = Math.round(match.displayScore);
      }
    }

    return row;
  });

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">
          Tendências Históricas
        </h2>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card className="card-hover overflow-hidden">
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                label={{
                  value: "Score",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12, fill: "var(--muted-foreground)" },
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              />
              {filteredDimensions.map((dim, i) => (
                <Line
                  key={dim.dimensionId}
                  type="monotone"
                  dataKey={dim.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls
                  animationDuration={800}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

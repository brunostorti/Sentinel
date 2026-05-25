"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";
import { UNIVERSAL_CATEGORY_LABELS } from "@/lib/constants";

interface DepartmentFilter {
  id: string;
  name: string;
  responseCount: number;
  invited: number;
}

interface DimensionSemaphoreProps {
  surveyTitle: string;
  generalScores: DimensionScore[];
  generalIsAnonymized: boolean;
  departments: DepartmentFilter[];
  departmentScores: Record<string, { scores: DimensionScore[]; isAnonymized: boolean }>;
}

const TRAFFIC_CONFIG = {
  GREEN: {
    label: "Favorável",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-50/30 dark:from-emerald-950/30 dark:to-emerald-950/10",
    border: "border-emerald-200/60 dark:border-emerald-800",
    dot: "bg-emerald-500",
    icon: "check_circle",
  },
  YELLOW: {
    label: "Intermédio",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-gradient-to-br from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10",
    border: "border-amber-200/60 dark:border-amber-800",
    dot: "bg-amber-500",
    icon: "warning",
  },
  RED: {
    label: "Risco",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-gradient-to-br from-red-50 to-red-50/30 dark:from-red-950/30 dark:to-red-950/10",
    border: "border-red-200/60 dark:border-red-800",
    dot: "bg-red-500",
    icon: "error",
  },
};

export function DimensionSemaphore({
  surveyTitle,
  generalScores,
  generalIsAnonymized,
  departments,
  departmentScores,
}: DimensionSemaphoreProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("general");

  const isGeneral = selectedFilter === "general";
  const currentData = isGeneral
    ? { scores: generalScores, isAnonymized: generalIsAnonymized }
    : departmentScores[selectedFilter] ?? { scores: [], isAnonymized: false };

  const { scores, isAnonymized } = currentData;

  // Group by universal category if available, fall back to original category
  const byCategory = new Map<string, DimensionScore[]>();
  for (const s of scores) {
    const groupKey = s.universalCategory
      ? UNIVERSAL_CATEGORY_LABELS[s.universalCategory] ?? s.category
      : s.category;
    const group = byCategory.get(groupKey) ?? [];
    group.push(s);
    byCategory.set(groupKey, group);
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">
          Semáforo por Dimensão
        </h2>
        <span className="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {surveyTitle}
        </span>
      </div>

      {/* Department filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedFilter("general")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ${
            isGeneral
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Icon name="business" size={14} />
          Geral
        </button>
        {departments.map((dept) => {
          const isSelected = selectedFilter === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedFilter(dept.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon name="apartment" size={14} />
              {dept.name}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                isSelected ? "bg-primary-foreground/20" : "bg-background"
              }`}>
                {dept.responseCount}/{dept.invited}
              </span>
            </button>
          );
        })}
      </div>

      {/* Anonymity warning */}
      {isAnonymized && (
        <Card className="animate-scale-in border-dashed border-amber-300/60 bg-gradient-to-r from-amber-50/80 to-amber-50/30">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/80">
              <Icon name="lock" size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800">
                Dados insuficientes para preservar o anonimato
              </p>
              <p className="mt-0.5 text-sm text-amber-700/80">
                São necessárias pelo menos 5 respostas para exibir os
                resultados deste departamento.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isAnonymized && scores.length === 0 && (
        <Card className="animate-scale-in border-dashed">
          <CardContent className="py-8 text-center">
            <Icon name="inbox" size={32} className="mx-auto text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma resposta registrada
              {!isGeneral ? " neste departamento" : ""} ainda.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dimension cards by category */}
      {!isAnonymized &&
        Array.from(byCategory.entries()).map(([category, dims]) => (
          <Card key={category} className="animate-fade-in overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="stagger-children grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {dims.map((dim) => {
                const config = TRAFFIC_CONFIG[dim.trafficLight];
                return (
                  <div
                    key={dim.dimensionId}
                    className={`group relative flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${config.border} ${config.bg}`}
                  >
                    {/* Colored left accent bar */}
                    <div className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full ${config.dot}`} />
                    <div className="min-w-0 flex-1 pl-2">
                      <p className="truncate text-sm font-bold">{dim.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`text-xs font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(dim.displayScore)}/100
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                        <div
                          className={`h-1.5 rounded-full ${config.dot} transition-all duration-500`}
                          style={{ width: `${Math.round(dim.displayScore)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

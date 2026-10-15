"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";
import { UNIVERSAL_CATEGORY_LABELS } from "@/lib/constants";
import { toFavorability } from "@/lib/copsoq/scoring";

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

type SortOption = "risk" | "favorable" | "copsoq";
type StatusFilterOption = "ALL" | "RED" | "YELLOW" | "GREEN";

const TRAFFIC_CONFIG = {
  GREEN: {
    label: "Favorável",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-50/30 dark:from-card dark:to-card",
    border: "border-emerald-200/60 dark:border-emerald-600/50",
    dot: "bg-emerald-500",
    icon: "check_circle",
  },
  YELLOW: {
    label: "Intermédio",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-gradient-to-br from-amber-50 to-amber-50/30 dark:from-card dark:to-card",
    border: "border-amber-200/60 dark:border-amber-600/50",
    dot: "bg-amber-500",
    icon: "warning",
  },
  RED: {
    label: "Risco",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-gradient-to-br from-red-50 to-red-50/30 dark:from-card dark:to-card",
    border: "border-red-200/60 dark:border-red-600/50",
    dot: "bg-red-500",
    icon: "error",
  },
};

const STATUS_WEIGHT: Record<string, number> = {
  RED: 3,
  YELLOW: 2,
  GREEN: 1,
};

export function DimensionSemaphore({
  surveyTitle,
  generalScores,
  generalIsAnonymized,
  departments,
  departmentScores,
}: DimensionSemaphoreProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("general");
  const [sortOption, setSortOption] = useState<SortOption>("risk");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");

  const isGeneral = selectedFilter === "general";
  const currentData = isGeneral
    ? { scores: generalScores, isAnonymized: generalIsAnonymized }
    : departmentScores[selectedFilter] ?? { scores: [], isAnonymized: false };

  const { scores, isAnonymized } = currentData;

  // Filtragem e ordenação local in-state
  const byCategory = useMemo(() => {
    // 1. Filtrar por status se selecionado
    const filtered = scores.filter((dim) => {
      if (statusFilter === "ALL") return true;
      return dim.trafficLight === statusFilter;
    });

    // 2. Agrupar por categoria universal ou original
    const groups = new Map<string, DimensionScore[]>();
    for (const s of filtered) {
      const groupKey = s.universalCategory
        ? UNIVERSAL_CATEGORY_LABELS[s.universalCategory] ?? s.category
        : s.category;
      const group = groups.get(groupKey) ?? [];
      group.push(s);
      groups.set(groupKey, group);
    }

    // 3. Ordenar dimensões dentro de cada categoria
    for (const [key, dims] of groups.entries()) {
      const sortedDims = [...dims].sort((a, b) => {
        if (sortOption === "risk") {
          // Maior risco primeiro: RED (3) -> YELLOW (2) -> GREEN (1)
          const weightDiff = (STATUS_WEIGHT[b.trafficLight] ?? 0) - (STATUS_WEIGHT[a.trafficLight] ?? 0);
          if (weightDiff !== 0) return weightDiff;
          // Em caso de empate de semáforo, menor favorabilidade = maior risco
          const favA = toFavorability(a.meanScore, a.scoringDirection);
          const favB = toFavorability(b.meanScore, b.scoringDirection);
          return favA - favB;
        }

        if (sortOption === "favorable") {
          // Mais favoráveis primeiro: GREEN -> YELLOW -> RED
          const weightDiff = (STATUS_WEIGHT[a.trafficLight] ?? 0) - (STATUS_WEIGHT[b.trafficLight] ?? 0);
          if (weightDiff !== 0) return weightDiff;
          const favA = toFavorability(a.meanScore, a.scoringDirection);
          const favB = toFavorability(b.meanScore, b.scoringDirection);
          return favB - favA;
        }

        // Ordem padrão (COPSOQ II) - ordem original
        return 0;
      });

      groups.set(key, sortedDims);
    }

    return groups;
  }, [scores, sortOption, statusFilter]);

  const totalMatchingDimensions = useMemo(() => {
    let count = 0;
    for (const dims of byCategory.values()) {
      count += dims.length;
    }
    return count;
  }, [byCategory]);

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Cabeçalho com Título, Indicador e Controles de Ordenação e Filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-tight">
            Semáforo por Dimensão
          </h2>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {surveyTitle}
          </span>
        </div>

        {/* Controles de ordenação e filtro de status */}
        {!isAnonymized && scores.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Status (Pills discretas) */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-muted text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("RED")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === "RED"
                    ? "bg-red-500/15 text-red-700 dark:text-red-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Risco
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("YELLOW")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === "YELLOW"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Intermédio
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("GREEN")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === "GREEN"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Favorável
              </button>
            </div>

            {/* Dropdown de Ordenação */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Ordenar dimensões por"
                className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-8 text-xs font-semibold shadow-2xs transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="risk">Maior risco primeiro (Padrão)</option>
                <option value="favorable">Mais favoráveis primeiro</option>
                <option value="copsoq">Ordem padrão (COPSOQ II)</option>
              </select>
              <Icon
                name="unfold_more"
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* Department filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedFilter("general")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
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
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
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
        <Card className="animate-scale-in border-dashed border-amber-300/60 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:border-amber-800/40 dark:from-amber-950/40 dark:to-amber-950/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/80 dark:bg-amber-900/40">
              <Icon name="lock" size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300">
                Dados insuficientes para preservar o anonimato
              </p>
              <p className="mt-0.5 text-sm text-amber-700/80 dark:text-amber-400/90">
                São necessárias pelo menos 5 respostas para exibir os
                resultados deste departamento.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state quando não há respostas */}
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

      {/* Empty state quando o filtro de status não encontra dimensões */}
      {!isAnonymized && scores.length > 0 && totalMatchingDimensions === 0 && (
        <Card className="animate-scale-in border-dashed">
          <CardContent className="py-8 text-center">
            <Icon name="filter_alt_off" size={28} className="mx-auto text-muted-foreground/40" />
            <p className="mt-2 text-sm font-semibold">
              Nenhuma dimensão com o status selecionado
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Não há dimensões classificadas como {statusFilter === "RED" ? "Risco" : statusFilter === "YELLOW" ? "Intermédio" : "Favorável"} neste grupo.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Limpar filtro de status
            </button>
          </CardContent>
        </Card>
      )}

      {/* Dimension cards by category */}
      {!isAnonymized &&
        Array.from(byCategory.entries()).map(([category, dims]) => {
          if (dims.length === 0) return null;
          return (
            <Card key={category} className="animate-fade-in overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {category}
                  </CardTitle>
                  <span className="text-[10px] font-semibold text-muted-foreground/70">
                    {dims.length} {dims.length === 1 ? "dimensão" : "dimensões"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {dims.map((dim) => {
                    const config = TRAFFIC_CONFIG[dim.trafficLight];
                    return (
                      <div
                        key={dim.dimensionId}
                        className={`group relative flex items-center gap-3 rounded-xl border p-4.5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${config.border} ${config.bg}`}
                      >
                        {/* Colored left accent bar */}
                        <div className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full ${config.dot}`} />
                        <div className="min-w-0 flex-1 pl-2">
                          <p className="truncate text-sm font-bold text-foreground">{dim.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`text-[11px] font-semibold ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(dim.displayScore)}/100
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                            <div
                              className={`h-1.5 rounded-full ${config.dot} transition-all duration-500`}
                              style={{ width: `${Math.round(dim.displayScore)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}

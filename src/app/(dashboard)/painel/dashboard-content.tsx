"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";
import { KPICards } from "./kpi-cards";
import { HealthGauge } from "./health-gauge";
import { DimensionsRadar } from "./dimensions-radar";
import { CriticalAreas } from "./critical-areas";
import { RiskBarChart } from "./risk-bar-chart";
import { DimensionSemaphore } from "./dimension-semaphore";
import { TrendsChart } from "./trends-chart";

interface SurveyOption {
  id: string;
  title: string;
  status: string;
  instrumentName: string | null;
  responseCount: number;
  created_at: string;
}

interface SurveyData {
  scores: DimensionScore[];
  isAnonymized: boolean;
  responseCount: number;
  participantCount: number;
  responseRate: number;
  departments: {
    id: string;
    name: string;
    responseCount: number;
    invited: number;
  }[];
  departmentScores: Record<
    string,
    { scores: DimensionScore[]; isAnonymized: boolean }
  >;
}

interface DashboardContentProps {
  kpis: {
    activeSurveys: number;
    totalResponses: number;
    responseRate: number;
    totalParticipants: number;
  };
  surveys: SurveyOption[];
  surveyDataMap: Record<string, SurveyData>;
  generalData: SurveyData | null;
  trendData: {
    surveys: { id: string; title: string; closedAt: string }[];
    dimensions: {
      dimensionId: string;
      name: string;
      category: string;
      scores: { surveyId: string; displayScore: number }[];
    }[];
  };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  CLOSED: "Encerrada",
};

export function DashboardContent({
  kpis,
  surveys,
  surveyDataMap,
  generalData,
  trendData,
}: DashboardContentProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("general");

  const currentData =
    selectedSurveyId === "general"
      ? generalData
      : surveyDataMap[selectedSurveyId] ?? null;

  const hasScores = currentData && currentData.scores.length > 0;
  const hasSurveys = surveys.length > 0;

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId);
  const displayTitle =
    selectedSurveyId === "general"
      ? "Visão Geral"
      : selectedSurvey?.title ?? "";

  return (
    <div className="space-y-8 pb-14">
      {/* Header */}
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da saúde psicossocial da empresa.
          </p>
        </div>

        {/* Survey selector */}
        {hasSurveys && (
          <div className="relative w-full sm:w-auto sm:max-w-xs">
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="appearance-none w-full truncate rounded-lg border border-border bg-card px-4 py-2.5 pr-10 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="general">Visão Geral (todas as pesquisas)</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {STATUS_LABELS[s.status] ?? s.status}
                  {s.instrumentName ? ` (${s.instrumentName})` : ""}
                  {` · ${s.responseCount} respostas`}
                </option>
              ))}
            </select>
            <Icon
              name="expand_more"
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* KPIs */}
      <KPICards
        activeSurveys={kpis.activeSurveys}
        totalResponses={
          selectedSurveyId === "general"
            ? kpis.totalResponses
            : currentData?.responseCount ?? 0
        }
        responseRate={
          selectedSurveyId === "general"
            ? kpis.responseRate
            : currentData?.responseRate ?? 0
        }
        totalParticipants={
          selectedSurveyId === "general"
            ? kpis.totalParticipants
            : currentData?.participantCount ?? 0
        }
      />

      {hasScores && currentData && (
        <>
          {/* Health Gauge + Critical Areas */}
          <div className="grid gap-6 lg:grid-cols-2">
            <HealthGauge
              scores={currentData.scores}
              totalResponses={currentData.responseCount}
              totalParticipants={currentData.participantCount}
              responseRate={currentData.responseRate}
            />
            <CriticalAreas scores={currentData.scores} />
          </div>

          {/* Radar + Risk Bar Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DimensionsRadar scores={currentData.scores} />
            <RiskBarChart scores={currentData.scores} />
          </div>

          {/* Semaphore */}
          <DimensionSemaphore
            surveyTitle={displayTitle}
            generalScores={currentData.scores}
            generalIsAnonymized={currentData.isAnonymized}
            departments={currentData.departments}
            departmentScores={currentData.departmentScores}
          />
        </>
      )}

      {/* Historical trends */}
      {trendData.surveys.length >= 2 && (
        <TrendsChart
          surveys={trendData.surveys}
          dimensions={trendData.dimensions}
        />
      )}

      {/* Empty states */}
      {!hasSurveys && (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="assignment" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            Nenhuma pesquisa criada ainda
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua primeira pesquisa para ver os resultados aqui.
          </p>
        </div>
      )}

      {hasSurveys && !hasScores && (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/5">
            <Icon
              name="hourglass_empty"
              size={32}
              className="text-amber-500/40"
            />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            Aguardando respostas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pesquisa ativa, mas ainda sem respostas suficientes para exibir os
            resultados.
          </p>
        </div>
      )}
    </div>
  );
}

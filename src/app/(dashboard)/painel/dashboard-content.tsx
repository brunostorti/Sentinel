"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";
import { KPICards } from "./kpi-cards";
import { HealthGauge } from "./health-gauge";
import { DimensionsRadar } from "./dimensions-radar";
import { CriticalAreas } from "./critical-areas";
import { RiskBarChart } from "./risk-bar-chart";
import { DimensionSemaphore } from "./dimension-semaphore";
import { TrendsChart } from "./trends-chart";
import { CycleFilterPills } from "@/components/cycle-filter-pills";

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
  initialSurveyId?: string | null;
  contextualMode?: boolean;
  companyCycles?: { id: string; title: string }[];
  currentCycleId?: string | null;
  currentCycleTitle?: string | null;
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
  initialSurveyId,
  contextualMode = false,
  companyCycles = [],
  currentCycleId = null,
  currentCycleTitle = null,
}: DashboardContentProps) {
  const initialSelection =
    initialSurveyId && surveys.some((survey) => survey.id === initialSurveyId)
      ? initialSurveyId
      : "general";
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(initialSelection);

  useEffect(() => {
    setSelectedSurveyId(initialSelection);
  }, [initialSelection]);

  const currentData =
    selectedSurveyId === "general"
      ? generalData
      : surveyDataMap[selectedSurveyId] ?? null;

  const hasScores = currentData && currentData.scores.length > 0;
  const hasSurveys = surveys.length > 0;
  const isContextual = contextualMode && selectedSurveyId !== "general";

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId);
  const displayTitle =
    selectedSurveyId === "general"
      ? "Visão Geral"
      : selectedSurvey?.title ?? "";

  const pageTitle = isContextual
    ? "Dashboard da pesquisa"
    : currentCycleTitle
      ? `Painel Geral — ${currentCycleTitle}`
      : "Painel Geral";

  const pageSubtitle = isContextual
    ? "Indicadores e riscos calculados para esta pesquisa dentro do fluxo."
    : currentCycleTitle
      ? `Visão da saúde psicossocial correspondente ao ciclo ${currentCycleTitle}.`
      : "Visão geral da saúde psicossocial de toda a empresa.";

  return (
    <div className="space-y-8 pb-14">
      {/* Header com Ciclos e Filtros */}
      <div className="animate-fade-in-up space-y-4">
        {/* Filtro rápido de ciclo no topo */}
        {!isContextual && companyCycles.length > 0 && (
          <CycleFilterPills
            cycles={companyCycles}
            currentCycleId={currentCycleId}
            basePath="/painel"
          />
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight">{pageTitle}</h1>
              {!isContextual && !currentCycleTitle && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Geral
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KPICards
        hideActiveSurveys={isContextual}
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

      {/* Tendencias historicas: comparam pesquisas entre si, entao pertencem ao
          nivel do ciclo. Dentro de UMA pesquisa elas trariam dados de outras
          coletas para uma tela que deve mostrar so aquela. O grafico vive em
          /gerenciar-pesquisas/ciclo/[cycleId]. */}
      {!isContextual && trendData.surveys.length >= 2 && (
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
            {isContextual
              ? "Esta pesquisa ainda não possui respostas suficientes para exibir os resultados."
              : "Pesquisa ativa, mas ainda sem respostas suficientes para exibir os resultados."}
          </p>
        </div>
      )}
    </div>
  );
}

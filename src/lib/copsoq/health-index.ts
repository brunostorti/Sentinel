import type { DimensionScore } from "./types";

/**
 * Índice de Saúde Psicossocial (0-100).
 *
 * Média simples por dimensão: GREEN → 100, YELLOW → 50, RED → 0.
 * Fonte única reusada pelo gauge do painel e pelos cards de planos-acao.
 */
export function computeHealthIndex(scores: DimensionScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => {
    if (s.trafficLight === "GREEN") return sum + 100;
    if (s.trafficLight === "YELLOW") return sum + 50;
    return sum;
  }, 0);
  return Math.round(total / scores.length);
}

export interface HealthColor {
  color: string;
  label: string;
  ring: string;
}

/** Mapeia o índice (0-100) para cor + rótulo semafórico. */
export function getHealthColor(score: number): HealthColor {
  if (score >= 66)
    return { color: "#2ecc71", label: "Bom", ring: "ring-emerald-200 dark:ring-emerald-700" };
  if (score >= 40)
    return { color: "#f1c40f", label: "Atenção", ring: "ring-amber-200 dark:ring-amber-700" };
  return { color: "#e74c3c", label: "Crítico", ring: "ring-red-200 dark:ring-red-700" };
}

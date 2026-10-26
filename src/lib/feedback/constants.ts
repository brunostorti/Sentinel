/* Constantes do feedback, seguras para o navegador (sem cliente admin). */

/** Regra dos 5: abaixo disso, o feedback de um departamento poderia identificar o autor. */
export const MIN_DEPARTMENT_SIZE = 5;

/** Planos em execução: aprovados pelo RH (ou já concluídos, ainda avaliáveis). */
export const ACTIVE_PLAN_STATUSES = ["APPROVED", "COMPLETED"];

export const FEEDBACK_RATINGS = {
  FUNCIONANDO: { label: "Está funcionando", icon: "thumb_up" },
  AJUSTAR: { label: "Precisa de ajustes", icon: "tune" },
  NAO_FUNCIONA: { label: "Não está funcionando", icon: "thumb_down" },
} as const;

export type FeedbackRating = keyof typeof FEEDBACK_RATINGS;

export function isFeedbackRating(value: string): value is FeedbackRating {
  return value in FEEDBACK_RATINGS;
}


/**
 * Só planos que a empresa aprovou (e talvez concluiu) contam para o aprendizado: um plano
 * rejeitado ou ainda pendente nunca foi implantado, então a variação da dimensão não diz
 * nada sobre a intervenção.
 */
export const IMPLEMENTED_PLAN_STATUSES = ["APPROVED", "COMPLETED"] as const;

/* Afastamentos informados por colaboradores. Seguro para o navegador. */

/**
 * Motivos em lista fechada (sem texto livre, sem CID). Lista provisória:
 * validar com o professor ou um advogado antes de ir para produção.
 */
export const LEAVE_REASONS = {
  acidente_de_trabalho: { label: "Acidente de trabalho", icon: "personal_injury" },
  doenca_ocupacional: { label: "Doença relacionada ao trabalho", icon: "work_alert" },
  doenca_comum: { label: "Doença não relacionada ao trabalho", icon: "sick" },
  saude_mental: { label: "Saúde mental", icon: "psychology" },
  outros: { label: "Outros motivos", icon: "more_horiz" },
  prefiro_nao_informar: { label: "Prefiro não informar", icon: "do_not_disturb_on" },
} as const;

export type LeaveReason = keyof typeof LEAVE_REASONS;

export function isLeaveReason(value: unknown): value is LeaveReason {
  return typeof value === "string" && value in LEAVE_REASONS;
}

/** Categoria usada no alerta por setor. */
export const LEAVE_ALERT_CATEGORY = "Afastamento";

/** Quantos meses para trás o colaborador pode informar. */
export const LEAVE_MAX_MONTHS_BACK = 12;

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "AAAA-MM-01" → "março de 2026". */
export function formatMonth(isoMonth: string): string {
  const [y, m] = isoMonth.slice(0, 7).split("-").map(Number);
  if (!y || !m) return isoMonth;
  return `${MONTHS.at(m - 1)} de ${y}`;
}

/**
 * Meses que podem ser escolhidos: do mês atual até LEAVE_MAX_MONTHS_BACK meses atrás.
 * `today` em AAAA-MM-DD. Devolve "AAAA-MM-01", do mais recente ao mais antigo.
 */
export function allowedMonths(today: string, monthsBack = LEAVE_MAX_MONTHS_BACK): string[] {
  let [y, m] = today.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i <= monthsBack; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
}

/** Aceita "AAAA-MM" ou "AAAA-MM-DD" e devolve "AAAA-MM-01" se estiver na janela permitida. */
export function normalizeMonth(value: unknown, today: string): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return null;
  const month = `${value.slice(0, 7)}-01`;
  return allowedMonths(today).includes(month) ? month : null;
}

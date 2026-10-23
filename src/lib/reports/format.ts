/** Rótulos e datas das denúncias, compartilhados pela área do colaborador e pela tela do RH. */

export const REPORT_STATUS: Record<string, { label: string; icon: string; cls: string }> = {
  PENDING: {
    label: "Em análise",
    icon: "schedule",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  RESOLVED: {
    label: "Finalizada",
    icon: "check_circle",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
};

export function reportStatus(status: string) {
  return (
    REPORT_STATUS[status] ?? {
      label: status,
      icon: "info",
      cls: "bg-muted text-muted-foreground",
    }
  );
}

const DAY_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Só o dia da denúncia ("22 de outubro de 2026"), no fuso de Brasília. Aceita o dia
 * (AAAA-MM-DD, como a lista do aparelho guarda) ou o timestamp do banco.
 */
export function formatReportDay(value: string): string {
  const onlyDay = /^\d{4}-\d{2}-\d{2}$/.test(value);
  // Meio-dia UTC cai no mesmo dia em Brasília: evita "voltar" um dia ao converter o fuso.
  const date = new Date(onlyDay ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : DAY_FORMAT.format(date);
}

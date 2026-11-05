/* Tarefas atrasadas do Kanban. Datas no formato AAAA-MM-DD, comparadas pelo dia de Brasília. */

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day.slice(0, 10)}T12:00:00Z`) / DAY_MS);
}

/** Dias de atraso (0 se ainda não venceu). O próprio dia do prazo não conta como atraso. */
export function daysOverdue(dueDate: string, today: string): number {
  const diff = dayNumber(today) - dayNumber(dueDate);
  return Number.isNaN(diff) ? 0 : Math.max(0, diff);
}

export function isTaskOverdue(dueDate: string | null, done: boolean, today: string): boolean {
  return !!dueDate && !done && daysOverdue(dueDate, today) > 0;
}

export function overdueLabel(days: number): string {
  return days === 1 ? "Atrasada há 1 dia" : `Atrasada há ${days} dias`;
}

/**
 * Rascunho da pesquisa salvo SÓ no aparelho (localStorage), por usuário e pesquisa.
 * Nada vai para o servidor, então as respostas parciais nunca ficam ligadas ao e-mail.
 * É apagado ao enviar a pesquisa e ao sair da conta (aparelho compartilhado).
 */

const DRAFT_PREFIX = "sentinel:rascunho:";

/** Segundos por pergunta usados na estimativa de tempo exibida ao colaborador. */
const SECONDS_PER_QUESTION = 8;

export interface SurveyDraft {
  answers: Record<string, number>;
  index: number;
  savedAt: string;
}

/** Perguntas da pesquisa e os valores de resposta permitidos em cada uma. */
export type DraftSchema = { id: string; values: number[] }[];

export function draftKey(userId: string, surveyId: string): string {
  return `${DRAFT_PREFIX}${userId}:${surveyId}`;
}

export function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.ceil((questionCount * SECONDS_PER_QUESTION) / 60));
}

/**
 * Lê um rascunho guardado, descartando perguntas e valores que não existem mais na pesquisa.
 * Devolve null se não houver nada aproveitável.
 */
export function parseDraft(raw: string | null, schema: DraftSchema): SurveyDraft | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { answers, index, savedAt } = data as Record<string, unknown>;
  if (!answers || typeof answers !== "object") return null;

  const allowed = new Map(schema.map((q) => [q.id, new Set(q.values)]));
  const clean: Record<string, number> = {};
  for (const [id, value] of Object.entries(answers as Record<string, unknown>)) {
    if (typeof value === "number" && allowed.get(id)?.has(value)) clean[id] = value;
  }
  if (Object.keys(clean).length === 0) return null;

  const last = Math.max(schema.length - 1, 0);
  const position = typeof index === "number" && Number.isInteger(index) ? index : 0;
  return {
    answers: clean,
    index: Math.min(Math.max(position, 0), last),
    savedAt: typeof savedAt === "string" ? savedAt : new Date().toISOString(),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BRAZIL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** Dias de calendário (em Brasília) entre duas datas: hoje = 0, amanhã = 1. */
function calendarDaysBetween(from: Date, to: Date): number {
  const day = (d: Date) => new Date(`${BRAZIL_DAY.format(d)}T00:00:00Z`).getTime();
  return Math.round((day(to) - day(from)) / DAY_MS);
}

/** Texto do prazo da pesquisa ("Até 30/10 · faltam 8 dias"), no fuso de Brasília. */
export function describeDeadline(expiresAt: string | null, now: Date): string | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt);
  const days = calendarDaysBetween(now, end);
  const date = end.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
  if (days <= 0) return `Encerra hoje (${date})`;
  if (days === 1) return `Encerra amanhã (${date})`;
  return `Até ${date} · faltam ${days} dias`;
}

/** Quantas respostas um rascunho guarda (para o "em andamento" da tela inicial). */
export function countDraftAnswers(raw: string | null): number {
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw) as { answers?: Record<string, unknown> };
    return data?.answers && typeof data.answers === "object" ? Object.keys(data.answers).length : 0;
  } catch {
    return 0;
  }
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readDraftRaw(userId: string, surveyId: string): string | null {
  try {
    return storage()?.getItem(draftKey(userId, surveyId)) ?? null;
  } catch {
    return null;
  }
}

export function writeDraft(userId: string, surveyId: string, draft: SurveyDraft): void {
  try {
    storage()?.setItem(draftKey(userId, surveyId), JSON.stringify(draft));
  } catch {
    // Sem espaço ou armazenamento bloqueado: segue sem rascunho.
  }
}

export function removeDraft(userId: string, surveyId: string): void {
  try {
    storage()?.removeItem(draftKey(userId, surveyId));
  } catch {
    // ignora
  }
}

/** Apaga todos os rascunhos deste usuário no aparelho (ao sair da conta). */
export function clearUserDrafts(userId: string): void {
  const store = storage();
  if (!store) return;
  try {
    const prefix = `${DRAFT_PREFIX}${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((k) => store.removeItem(k));
  } catch {
    // ignora
  }
}

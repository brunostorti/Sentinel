"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useLocalStorageItems } from "@/lib/local-store";
import { countDraftAnswers, draftKey, estimateMinutes } from "@/lib/survey/draft";

export interface EmployeeSurvey {
  id: string;
  title: string;
  expired: boolean;
  /** Prazo já formatado pelo servidor. */
  deadline: string | null;
  answered: boolean;
  questionCount: number;
}

type CardState = "progress" | "pending" | "answered" | "expired";

export function SurveyCards({ userId, surveys }: { userId: string; surveys: EmployeeSurvey[] }) {
  // Rascunhos só existem no navegador (localStorage), por usuário e pesquisa.
  const keys = useMemo(() => surveys.map((s) => draftKey(userId, s.id)), [userId, surveys]);
  const rawDrafts = useLocalStorageItems(keys);
  const drafts: Record<string, number> = {};
  surveys.forEach((s, i) => {
    const count = countDraftAnswers(rawDrafts[i]);
    if (count > 0) drafts[s.id] = count;
  });

  const cards = surveys
    .map((s) => {
      const state: CardState = s.answered
        ? "answered"
        : s.expired
          ? "expired"
          : drafts[s.id]
            ? "progress"
            : "pending";
      return { survey: s, state };
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state]);

  const open = cards.filter((c) => c.state === "pending" || c.state === "progress").length;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Suas pesquisas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {open > 0
            ? open === 1
              ? "Você tem 1 pesquisa para responder."
              : `Você tem ${open} pesquisas para responder.`
            : "Nenhuma pesquisa esperando por você agora."}
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon name="assignment" size={28} className="text-primary" />
          </div>
          <p className="mt-4 font-bold">Nenhuma pesquisa aberta no momento</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Quando sua empresa abrir uma pesquisa de bem-estar, ela aparece aqui e você recebe
            um aviso por e-mail.
          </p>
        </div>
      ) : (
        <div className="stagger-children space-y-3">
          {cards.map(({ survey, state }) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              state={state}
              answeredCount={drafts[survey.id] ?? 0}
            />
          ))}
        </div>
      )}

      <AnonymityNote />
    </div>
  );
}

const ORDER: Record<CardState, number> = { progress: 0, pending: 1, answered: 2, expired: 3 };

function SurveyCard({
  survey,
  state,
  answeredCount,
}: {
  survey: EmployeeSurvey;
  state: CardState;
  answeredCount: number;
}) {
  const total = survey.questionCount;
  const percent = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;
  const deadline = survey.deadline;
  const actionable = state === "pending" || state === "progress";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-shadow",
        state === "progress" ? "border-primary/40" : "border-border",
        actionable && "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-bold leading-snug">{survey.title}</h2>
        <StateBadge state={state} />
      </div>

      {state === "answered" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Obrigado! Suas respostas já foram registradas de forma anônima.
        </p>
      )}
      {state === "expired" && (
        <p className="mt-2 text-sm text-muted-foreground">O prazo para responder terminou.</p>
      )}

      {actionable && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="format_list_numbered" size={16} />
              {total} perguntas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="schedule" size={16} />
              cerca de {estimateMinutes(total)} min
            </span>
            {deadline && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="event" size={16} />
                {deadline}
              </span>
            )}
          </div>

          {state === "progress" && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>
                  {answeredCount} de {total} respondidas
                </span>
                <span>{percent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}

          <Link
            href={`/responder/${survey.id}`}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {state === "progress" ? "Continuar de onde parei" : "Responder agora"}
            <Icon name="arrow_forward" size={18} />
          </Link>
        </>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: CardState }) {
  const config: Record<CardState, { label: string; icon: string; cls: string }> = {
    pending: {
      label: "A responder",
      icon: "radio_button_unchecked",
      cls: "bg-primary/10 text-primary",
    },
    progress: {
      label: "Em andamento",
      icon: "pending",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
    answered: {
      label: "Respondida",
      icon: "check_circle",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
    expired: { label: "Encerrada", icon: "event_busy", cls: "bg-muted text-muted-foreground" },
  };
  const c = config[state];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        c.cls
      )}
    >
      <Icon name={c.icon} size={14} filled={state === "answered"} />
      {c.label}
    </span>
  );
}

function AnonymityNote() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon name="lock" size={18} className="text-primary" />
        Como protegemos você
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        <li>Suas respostas não ficam ligadas ao seu nome nem ao seu e-mail.</li>
        <li>A empresa só vê resultados de grupos com pelo menos 5 pessoas.</li>
        <li>Se você parar no meio, o progresso fica salvo só neste aparelho.</li>
      </ul>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { SurveyResultCard, type PersonalResult } from "@/components/survey-result-card";
import { invertScore, toTrafficLight } from "@/lib/copsoq/scoring";
import type { ScoringDirection } from "@/lib/constants";
import type { TrafficCuts } from "@/lib/copsoq/types";
import { cn } from "@/lib/utils";
import {
  estimateMinutes,
  parseDraft,
  readDraftRaw,
  removeDraft,
  writeDraft,
  type DraftSchema,
} from "@/lib/survey/draft";
import { submitSurveyResponse } from "./actions";

interface ResponseOption {
  label: string;
  value: number;
}

interface Question {
  id: string;
  text: string;
  dimensionName: string;
  category: string;
  scoringDirection: ScoringDirection;
  cuts: TrafficCuts | null;
  isInverted: boolean;
  orderIndex: number;
  responseOptions: ResponseOption[] | null;
}

interface SurveyFormProps {
  surveyId: string;
  surveyTitle: string;
  userId: string;
  questions: Question[];
}

/** Fallback response options when no response format is defined */
const DEFAULT_LIKERT: ResponseOption[] = [
  { value: 0, label: "Nunca / Nada" },
  { value: 25, label: "Raramente / Pouco" },
  { value: 50, label: "Às vezes / Moderado" },
  { value: 75, label: "Frequentemente / Muito" },
  { value: 100, label: "Sempre / Extremamente" },
];

/** Tempo para ver a resposta marcada antes de passar para a próxima pergunta. */
const ADVANCE_DELAY_MS = 320;

type Phase = "intro" | "question" | "milestone" | "review" | "result";

export default function SurveyForm({ surveyId, surveyTitle, userId, questions }: SurveyFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Perguntas agrupadas em partes (mesma ordem de antes). O nome da parte NUNCA aparece:
  // o tema induziria a resposta. Só a posição ("Parte 2 de 6").
  const { ordered, partOf, partSizes } = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) {
      const list = map.get(q.category) ?? [];
      list.push(q);
      map.set(q.category, list);
    }
    const parts = Array.from(map.values());
    return {
      ordered: parts.flat(),
      partOf: parts.flatMap((qs, p) => qs.map(() => p)),
      partSizes: parts.map((qs) => qs.length),
    };
  }, [questions]);

  const total = ordered.length;
  const totalParts = partSizes.length;

  const schema: DraftSchema = useMemo(
    () =>
      ordered.map((q) => ({
        id: q.id,
        values: (q.responseOptions ?? DEFAULT_LIKERT).map((o) => o.value),
      })),
    [ordered]
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [completedPart, setCompletedPart] = useState(0);
  const [resumeFrom, setResumeFrom] = useState<{ answered: number; index: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PersonalResult[] | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedDraft = useRef(false);

  // Rascunho do aparelho: lido uma vez ao abrir.
  useEffect(() => {
    const draft = parseDraft(readDraftRaw(userId, surveyId), schema);
    if (draft) {
      setAnswers(draft.answers);
      setIndex(draft.index);
      setResumeFrom({ answered: Object.keys(draft.answers).length, index: draft.index });
    }
    loadedDraft.current = true;
  }, [userId, surveyId, schema]);

  // Salva a cada resposta (só no aparelho).
  useEffect(() => {
    if (!loadedDraft.current || phase === "result") return;
    if (Object.keys(answers).length === 0) return;
    writeDraft(userId, surveyId, { answers, index, savedAt: new Date().toISOString() });
  }, [answers, index, phase, userId, surveyId]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const answeredCount = ordered.filter((q) => answers[q.id] != null).length;
  const current = ordered[index];
  const firstUnanswered = ordered.findIndex((q) => answers[q.id] == null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  const goTo = useCallback(
    (next: number, dir: 1 | -1) => {
      setDirection(dir);
      setIndex(Math.min(Math.max(next, 0), total - 1));
      setPhase("question");
      scrollTop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );

  /** Depois de responder a pergunta i: próxima pergunta, tela de fim de parte ou revisão. */
  const advanceFrom = useCallback(
    (i: number) => {
      if (i >= total - 1) {
        setPhase("review");
        scrollTop();
        return;
      }
      if (partOf[i + 1] !== partOf[i]) {
        setCompletedPart(partOf[i] + 1);
        setIndex(i + 1);
        setDirection(1);
        setPhase("milestone");
        scrollTop();
        return;
      }
      goTo(i + 1, 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, partOf, goTo]
  );

  const choose = useCallback(
    (value: number) => {
      if (!current) return;
      setAnswers((prev) => ({ ...prev, [current.id]: value }));
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const from = index;
      advanceTimer.current = setTimeout(() => advanceFrom(from), ADVANCE_DELAY_MS);
    },
    [current, index, advanceFrom]
  );

  function cancelAutoAdvance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }

  /** Avanço manual: cancela o automático pendente para não pular uma pergunta. */
  function forward() {
    cancelAutoAdvance();
    advanceFrom(index);
  }

  function goBack() {
    cancelAutoAdvance();
    if (phase === "milestone" || phase === "review") {
      // volta para a última pergunta respondida antes desta tela
      goTo(phase === "review" ? total - 1 : index - 1, -1);
      return;
    }
    if (index > 0) goTo(index - 1, -1);
  }

  // Teclado: 1–9 escolhem a opção, setas navegam.
  useEffect(() => {
    if (phase !== "question" || !current) return;
    const options = current.responseOptions ?? DEFAULT_LIKERT;
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        choose(options[n - 1].value);
      } else if (e.key === "ArrowLeft") {
        goBack();
      } else if (e.key === "ArrowRight" && answers[current.id] != null) {
        forward();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, choose, answers, index, advanceFrom]);

  function start(fromDraft: boolean) {
    if (!fromDraft) {
      setAnswers({});
      removeDraft(userId, surveyId);
      setResumeFrom(null);
      goTo(0, 1);
      return;
    }
    if (firstUnanswered === -1) {
      setIndex(total - 1);
      setPhase("review");
      scrollTop();
      return;
    }
    goTo(Math.min(index, firstUnanswered), 1);
  }

  async function handleSubmit() {
    if (answeredCount !== total || submitting) return;
    setError("");
    setSubmitting(true);

    const result = await submitSurveyResponse({
      surveyId,
      answers: Object.entries(answers).map(([questionId, score]) => ({ questionId, score })),
    });

    if (result.error) {
      if (result.error.includes("já respondeu")) removeDraft(userId, surveyId);
      setError(result.error);
      setSubmitting(false);
      return;
    }

    removeDraft(userId, surveyId);

    // Resultado individual com o mesmo motor de escore do painel do RH (inversão, direção
    // e cortes por escala), calculado só no navegador: nada disso vai para o servidor.
    const dimensions = new Map<string, { scores: number[]; direction: ScoringDirection; cuts: TrafficCuts | null }>();
    for (const q of ordered) {
      const raw = answers[q.id];
      const entry = dimensions.get(q.dimensionName) ?? {
        scores: [],
        direction: q.scoringDirection,
        cuts: q.cuts,
      };
      entry.scores.push(q.isInverted ? invertScore(raw) : raw);
      dimensions.set(q.dimensionName, entry);
    }
    setResults(
      Array.from(dimensions.entries()).map(([name, d]) => {
        const avg = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
        return { name, light: toTrafficLight(avg, d.direction, d.cuts) };
      })
    );
    setSubmitting(false);
    setPhase("result");
    scrollTop();
  }

  if (phase === "result" && results) {
    return <SurveyResultCard results={results} onFinish={() => router.push("/obrigado")} />;
  }

  const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-xl">
      {/* Barra superior: volta ao início e progresso */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/pesquisas"
            className="inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="arrow_back" size={18} />
            Início
          </Link>
          {phase !== "intro" && (
            <span className="text-xs font-medium text-muted-foreground">
              {answeredCount > 0 ? "Progresso salvo neste aparelho" : " "}
            </span>
          )}
        </div>
        {phase !== "intro" && (
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>
                {phase === "question"
                  ? `Pergunta ${index + 1} de ${total}`
                  : phase === "review"
                    ? "Tudo pronto"
                    : `Parte ${completedPart} de ${totalParts}`}
              </span>
              <span>{percent}%</span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da pesquisa"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <Intro
          title={surveyTitle}
          total={total}
          maxKey={Math.max(...ordered.map((q) => (q.responseOptions ?? DEFAULT_LIKERT).length))}
          resumeFrom={resumeFrom}
          onStart={start}
        />
      )}

      {phase === "question" && current && (
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.18 }}
          >
            <QuestionCard
              question={current}
              part={partOf[index] + 1}
              totalParts={totalParts}
              selected={answers[current.id]}
              onChoose={choose}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {phase === "milestone" && (
        <Milestone
          part={completedPart}
          totalParts={totalParts}
          remaining={total - answeredCount}
          onContinue={() => goTo(index, 1)}
        />
      )}

      {phase === "review" && (
        <Review
          total={total}
          answered={answeredCount}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
          onGoToMissing={() => goTo(firstUnanswered, 1)}
        />
      )}

      {/* Voltar (fora da abertura) */}
      {phase !== "intro" && !(phase === "question" && index === 0) && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={submitting} className="gap-1">
            <Icon name="arrow_back" size={18} />
            Voltar
          </Button>
          {phase === "question" && current && answers[current.id] != null && (
            <Button variant="ghost" onClick={forward} className="gap-1">
              Avançar
              <Icon name="arrow_forward" size={18} />
            </Button>
          )}
        </div>
      )}
      {phase === "question" && index === 0 && current && answers[current.id] != null && (
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={forward} className="gap-1">
            Avançar
            <Icon name="arrow_forward" size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Telas ─────────────────────────────────────────────────────────── */

function Intro({
  title,
  total,
  maxKey,
  resumeFrom,
  onStart,
}: {
  title: string;
  total: number;
  maxKey: number;
  resumeFrom: { answered: number; index: number } | null;
  onStart: (fromDraft: boolean) => void;
}) {
  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon name="favorite" size={26} className="text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
            <Icon name="format_list_numbered" size={16} />
            {total} perguntas
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">
            <Icon name="schedule" size={16} />
            cerca de {estimateMinutes(total)} min
          </span>
        </div>

        <ul className="mt-6 space-y-3 text-sm leading-6">
          <IntroItem icon="touch_app">
            Uma pergunta por vez. Toque na resposta e a próxima aparece sozinha.
          </IntroItem>
          <IntroItem icon="psychology">
            Pense no seu dia a dia de trabalho. Não existe resposta certa ou errada.
          </IntroItem>
          <IntroItem icon="undo">
            Você pode voltar e mudar uma resposta a qualquer momento antes de enviar.
          </IntroItem>
          <IntroItem icon="keyboard">
            No computador, as teclas de 1 a {maxKey} também respondem.
          </IntroItem>
        </ul>

        <div className="mt-6 space-y-2">
          {resumeFrom ? (
            <>
              <Button className="h-12 w-full gap-2 text-base font-bold" onClick={() => onStart(true)} autoFocus>
                Continuar de onde parei
                <Icon name="arrow_forward" size={20} />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {resumeFrom.answered} de {total} perguntas já respondidas.
              </p>
              <button
                type="button"
                onClick={() => onStart(false)}
                className="w-full py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Recomeçar do zero
              </button>
            </>
          ) : (
            <Button className="h-12 w-full gap-2 text-base font-bold" onClick={() => onStart(false)} autoFocus>
              Começar
              <Icon name="arrow_forward" size={20} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Icon name="lock" size={20} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">
          Suas respostas não ficam ligadas ao seu nome nem ao seu e-mail, e a empresa só vê
          resultados de grupos com pelo menos 5 pessoas. Se parar no meio, o progresso fica
          salvo só neste aparelho até você enviar ou sair da conta.
        </p>
      </div>
    </div>
  );
}

function IntroItem({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon name={icon} size={16} className="text-primary" />
      </span>
      <span className="text-foreground/85">{children}</span>
    </li>
  );
}

function QuestionCard({
  question,
  part,
  totalParts,
  selected,
  onChoose,
}: {
  question: Question;
  part: number;
  totalParts: number;
  selected: number | undefined;
  onChoose: (value: number) => void;
}) {
  const options = question.responseOptions ?? DEFAULT_LIKERT;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Leitores de tela anunciam a nova pergunta.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [question.id]);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary/80">
        Parte {part} de {totalParts}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-xl font-bold leading-snug tracking-tight outline-none sm:text-2xl"
      >
        {question.text}
      </h2>

      <div role="radiogroup" aria-label={question.text} className="mt-6 grid gap-2.5">
        {options.map((opt, i) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChoose(opt.value)}
              className={cn(
                "group flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base transition-all active:scale-[0.99]",
                isSelected
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 group-hover:border-primary/50"
                )}
              >
                {isSelected && <Icon name="check" size={16} />}
              </span>
              <span className="flex-1">{opt.label}</span>
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline">
                {i + 1}
              </kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Milestone({
  part,
  totalParts,
  remaining,
  onContinue,
}: {
  part: number;
  totalParts: number;
  remaining: number;
  onContinue: () => void;
}) {
  const message =
    part / totalParts >= 0.75
      ? "Reta final. Falta pouco!"
      : part / totalParts >= 0.5
        ? "Você já passou da metade."
        : "Ótimo começo. Continue no seu ritmo.";

  return (
    <div className="animate-scale-in rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
        <Icon name="check_circle" size={36} filled className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight">
        Parte {part} de {totalParts} concluída
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message} {remaining === 1 ? "Falta 1 pergunta." : `Faltam ${remaining} perguntas.`}
      </p>
      <div className="mx-auto mt-5 flex max-w-xs justify-center gap-1.5" aria-hidden>
        {Array.from({ length: totalParts }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i < part ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
      <Button className="mt-6 h-12 w-full gap-2 text-base font-bold" onClick={onContinue} autoFocus>
        Continuar
        <Icon name="arrow_forward" size={20} />
      </Button>
    </div>
  );
}

function Review({
  total,
  answered,
  submitting,
  error,
  onSubmit,
  onGoToMissing,
}: {
  total: number;
  answered: number;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
  onGoToMissing: () => void;
}) {
  const missing = total - answered;
  return (
    <div className="animate-scale-in rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon name={missing === 0 ? "task_alt" : "pending_actions"} size={36} className="text-primary" />
      </div>
      {missing === 0 ? (
        <>
          <p className="mt-4 text-2xl font-black tracking-tight">Tudo respondido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você respondeu as {total} perguntas. Se quiser, volte para revisar. Depois de
            enviar não dá para mudar as respostas.
          </p>
          <Button
            className="mt-6 h-12 w-full gap-2 text-base font-bold"
            onClick={onSubmit}
            disabled={submitting}
            autoFocus
          >
            {submitting ? "Enviando..." : "Enviar respostas"}
            {!submitting && <Icon name="send" size={20} />}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-4 text-2xl font-black tracking-tight">Quase lá</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {missing === 1 ? "Falta 1 pergunta" : `Faltam ${missing} perguntas`} para poder
            enviar.
          </p>
          <Button className="mt-6 h-12 w-full gap-2 text-base font-bold" onClick={onGoToMissing} autoFocus>
            Ir para a pergunta sem resposta
            <Icon name="arrow_forward" size={20} />
          </Button>
        </>
      )}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}{" "}
          {error.includes("já respondeu") && (
            <Link href="/pesquisas" className="font-semibold underline">
              Voltar ao início
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

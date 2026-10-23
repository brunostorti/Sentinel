"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { TrafficLight } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Resultado individual de um tema, calculado só no aparelho do colaborador. */
export interface PersonalResult {
  name: string;
  light: TrafficLight;
}

interface SurveyResultCardProps {
  results: PersonalResult[];
  onFinish: () => void;
}

const GROUPS: {
  light: TrafficLight;
  title: string;
  hint: string;
  icon: string;
  tone: string;
}[] = [
  {
    light: "RED",
    title: "Pontos de atenção",
    hint: "Temas que podem estar pesando para você agora.",
    icon: "flag",
    tone: "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300",
  },
  {
    light: "YELLOW",
    title: "Para observar",
    hint: "Temas no meio do caminho: vale acompanhar.",
    icon: "visibility",
    tone: "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    light: "GREEN",
    title: "Pontos favoráveis",
    hint: "Temas que parecem estar bem para você.",
    icon: "check_circle",
    tone: "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
];

export function SurveyResultCard({ results, onFinish }: SurveyResultCardProps) {
  const reduceMotion = useReducedMotion();
  const hasAttention = results.some((r) => r.light === "RED");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-5"
    >
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <Icon name="task_alt" size={36} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Respostas enviadas</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Obrigado por participar. Abaixo está um retrato das suas respostas, só para você
          refletir. Ele é calculado neste aparelho e não é mostrado à empresa individualmente.
        </p>
      </div>

      {GROUPS.map((group) => {
        const items = results.filter((r) => r.light === group.light);
        if (items.length === 0) return null;
        return (
          <section key={group.light} className={cn("rounded-xl border p-4", group.tone)}>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Icon name={group.icon} size={18} />
              {group.title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {items.map((r) => (
                <li
                  key={r.name}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground"
                >
                  {r.name}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {hasAttention && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Icon name="support" size={18} className="text-primary" />
            Você não precisa passar por isso sozinho(a)
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/85">
            <li>
              <strong>CVV, Centro de Valorização da Vida:</strong> ligue 188 (24 horas,
              gratuito) ou converse pelo site{" "}
              <a
                href="https://cvv.org.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                cvv.org.br
              </a>
              .
            </li>
            <li>
              <strong>RH ou SESMT da sua empresa:</strong> podem orientar sobre o apoio
              disponível no trabalho.
            </li>
            <li>
              <strong>Em uma emergência:</strong> ligue 192 (SAMU).
            </li>
          </ul>
        </section>
      )}

      <Button className="h-12 w-full text-base font-bold" onClick={onFinish}>
        Concluir
      </Button>
    </motion.div>
  );
}

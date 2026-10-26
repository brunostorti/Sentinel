"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_RATINGS,
  MIN_DEPARTMENT_SIZE,
  type FeedbackRating,
} from "@/lib/feedback/constants";
import type { FeedbackCompanyOption } from "@/lib/feedback/options";

const MIN_MESSAGE = 10;
const GENERAL = "";

const GUARANTEES = [
  { icon: "visibility_off", text: "Seu nome e seu e-mail não ficam ligados ao feedback." },
  { icon: "event", text: "Guardamos só o dia do envio, nunca o horário." },
  {
    icon: "groups",
    text: `Só fica disponível em departamentos com ${MIN_DEPARTMENT_SIZE} ou mais pessoas, para ninguém ser identificado.`,
  },
];

export function FeedbackForm({ options }: { options: FeedbackCompanyOption[] }) {
  const [companyId, setCompanyId] = useState(options.length === 1 ? options[0].companyId : "");
  const [planId, setPlanId] = useState(GENERAL);
  const [rating, setRating] = useState<FeedbackRating | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const option = options.find((o) => o.companyId === companyId);

  function reset() {
    setPlanId(GENERAL);
    setRating("");
    setMessage("");
    setError("");
    setSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!option) return setError("Escolha a empresa.");
    if (!rating) return setError("Diga como o plano está funcionando.");
    if (message.trim().length < MIN_MESSAGE) {
      return setError(`Escreva pelo menos ${MIN_MESSAGE} caracteres.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: option.companyId,
          actionPlanId: planId || null,
          rating,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Não foi possível enviar. Tente novamente.");
      else setSent(true);
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
          <Icon name="check_circle" size={32} className="text-emerald-600" />
        </span>
        <h1 className="mt-4 text-xl font-black tracking-tight">Feedback enviado</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Obrigado! O RH vai usar sua opinião para repensar os planos de ação. Ninguém sabe que
          foi você quem enviou.
        </p>
        <Button variant="outline" className="mt-6 rounded-lg" onClick={reset}>
          Enviar outro feedback
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Feedback dos planos de ação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A empresa está colocando em prática ações para melhorar o ambiente de trabalho. Conte,
          de forma anônima, se elas estão funcionando para você e o que poderia mudar.
        </p>
      </div>

      {options.length === 0 && (
        <Notice>
          Seu e-mail não está no cadastro de colaboradores de nenhuma empresa. Fale com o RH para
          atualizar o cadastro.
        </Notice>
      )}

      {options.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
          {options.length > 1 && (
            <Field label="Empresa">
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setPlanId(GENERAL);
                }}
                className={SELECT}
              >
                <option value="">Escolha a empresa</option>
                {options.map((o) => (
                  <option key={o.companyId} value={o.companyId}>
                    {o.companyName}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {option && !option.eligible && (
            <Notice>
              Seu departamento ({option.departmentName}) tem menos de {MIN_DEPARTMENT_SIZE}{" "}
              pessoas. Para proteger seu anonimato (LGPD), o feedback não está disponível para ele.
            </Notice>
          )}

          {option?.eligible && (
            <>
              <Field
                label="Sobre qual plano de ação?"
                hint={`Aparecem os planos em andamento para ${option.departmentName} e para a empresa toda.`}
              >
                <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={SELECT}>
                  <option value={GENERAL}>Não sei qual é / sugestão geral para minha área</option>
                  {option.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.department ?? "Empresa toda"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Como está funcionando?">
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(FEEDBACK_RATINGS) as FeedbackRating[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRating(key)}
                      aria-pressed={rating === key}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                        rating === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <Icon name={FEEDBACK_RATINGS[key].icon} size={18} />
                      {FEEDBACK_RATINGS[key].label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Seu feedback"
                hint="O que está dando certo, o que não está e o que você mudaria. Evite citar nomes ou detalhes que identifiquem você."
              >
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Ex.: As pausas foram boas, mas a carga de trabalho continua alta no fim do mês..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <Icon name="error" size={16} />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full rounded-lg" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar feedback anônimo"}
              </Button>
            </>
          )}
        </form>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Icon name="shield" size={18} className="text-primary" />
          Como seu anonimato é protegido
        </h2>
        <ul className="mt-3 space-y-3">
          {GUARANTEES.map((g) => (
            <li key={g.icon} className="flex gap-3 text-sm leading-6">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon name={g.icon} size={16} className="text-primary" />
              </span>
              <span className="text-foreground/85">{g.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const SELECT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
      <p className="text-sm leading-6 text-foreground/85">{children}</p>
    </div>
  );
}

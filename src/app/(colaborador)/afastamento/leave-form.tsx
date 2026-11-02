"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PrivacyNotice } from "@/components/privacy-notice";
import { LEAVE_REASONS, formatMonth, type LeaveReason } from "@/lib/leave-cases/constants";

const NO_DEPARTMENT = "nao-informar";

interface Props {
  companies: { id: string; name: string }[];
  departmentsByCompany: Record<string, { id: string; name: string }[]>;
  months: string[];
}

export function LeaveForm({ companies, departmentsByCompany, months }: Props) {
  const [companyId, setCompanyId] = useState(companies.length === 1 ? companies[0].id : "");
  const [departmentId, setDepartmentId] = useState("");
  const [month, setMonth] = useState("");
  const [reason, setReason] = useState<LeaveReason | "">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const departments = companyId ? departmentsByCompany[companyId] ?? [] : [];

  function reset() {
    setDepartmentId("");
    setMonth("");
    setReason("");
    setSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!companyId) return setError("Escolha a empresa.");
    if (departments.length > 0 && !departmentId) {
      return setError("Escolha o setor ou \"Prefiro não informar\".");
    }
    if (!month) return setError("Escolha o mês do afastamento.");
    if (!reason) return setError("Escolha o motivo.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/leave-cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId,
          departmentId: departmentId && departmentId !== NO_DEPARTMENT ? departmentId : null,
          month,
          reason,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return setError(result.error ?? "Não foi possível enviar. Tente novamente.");
      setSent(true);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Sem conexão. Verifique a internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-scale-in rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <Icon name="task_alt" size={36} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Afastamento informado</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Obrigado. A empresa vê só o mês, o motivo e, se você escolheu, o setor. Isso ajuda a
          perceber quando um problema se repete.
        </p>
        <Button variant="outline" className="mt-6" onClick={reset}>
          Informar outro afastamento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Informar afastamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu ou de um colega. Sem nome e sem detalhes: só o mês, o motivo e o setor, se quiser.
        </p>
      </div>

      <PrivacyNotice compact />

      {companies.length === 0 ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Seu e-mail não está no cadastro de colaboradores de nenhuma empresa. Fale com o RH.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {companies.length > 1 && (
            <Field label="Empresa">
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setDepartmentId("");
                }}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Escolha a empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {departments.length > 0 && (
            <Field label="Setor" hint="Só aparecem setores com 5 ou mais pessoas, para proteger o anonimato.">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Escolha o setor...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value={NO_DEPARTMENT}>Prefiro não informar</option>
              </select>
            </Field>
          )}

          <Field label="Mês do afastamento" hint="Só o mês, nunca o dia.">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Escolha o mês...</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Motivo">
            <div role="radiogroup" aria-label="Motivo" className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(LEAVE_REASONS) as LeaveReason[]).map((key) => {
                const r = LEAVE_REASONS[key];
                const selected = reason === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setReason(key)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-colors",
                      selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <Icon name={r.icon} size={20} className="shrink-0" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="h-12 w-full gap-2 text-base font-bold" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar"}
            {!submitting && <Icon name="send" size={20} />}
          </Button>
        </form>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-bold">{label}</h2>
      {children}
      {hint && <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </section>
  );
}

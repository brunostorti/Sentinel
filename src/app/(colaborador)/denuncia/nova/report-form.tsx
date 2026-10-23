"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { OCCURRENCE_TYPES } from "@/lib/reports/occurrence-types";
import { addSavedReport } from "@/lib/reports/saved-reports";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MIN_DESCRIPTION = 20;

interface Company {
  id: string;
  name: string;
}

interface Sent {
  protocol: string;
  type: string;
  sentOn: string;
}

export function ReportForm({ userId, companies }: { userId: string; companies: Company[] }) {
  const [companyId, setCompanyId] = useState(companies.length === 1 ? companies[0].id : "");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const askCompany = companies.length > 1;
  const step = (n: number) => (askCompany ? n + 1 : n);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    const incoming = Array.from(list);
    for (const f of incoming) {
      if (!ACCEPTED.includes(f.type)) return setError(`"${f.name}": envie só PDF, JPG ou PNG.`);
      if (f.size > MAX_FILE_BYTES) return setError(`"${f.name}" passa de 10 MB.`);
    }
    const next = [...files, ...incoming];
    if (next.length > MAX_FILES) return setError(`Envie no máximo ${MAX_FILES} arquivos.`);
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!companyId) return setError("Escolha a empresa.");
    if (!type) return setError("Escolha o tipo de ocorrência.");
    if (description.trim().length < MIN_DESCRIPTION) {
      return setError(`Conte um pouco mais (pelo menos ${MIN_DESCRIPTION} caracteres).`);
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("companyId", companyId);
      data.append("occurrenceType", type);
      data.append("description", description.trim());
      files.forEach((f) => data.append("files", f));

      const res = await fetch("/api/reports/submit", { method: "POST", body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.protocol) {
        setError(result.error ?? "Não foi possível enviar. Tente novamente.");
        return;
      }
      const record = { protocol: result.protocol, type: result.type, sentOn: result.sentOn };
      addSavedReport(userId, record);
      setSent(record);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Sem conexão. Verifique a internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) return <Success sent={sent} />;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/denuncia"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" size={18} />
          Canal de denúncia
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Fazer um relato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu nome e seu e-mail não são gravados. Guardamos só o dia do envio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {askCompany && (
          <Section number={1} title="Em qual empresa aconteceu?">
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Escolha a empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Section>
        )}

        <Section number={step(1)} title="O que aconteceu?">
          <div role="radiogroup" aria-label="Tipo de ocorrência" className="grid gap-2 sm:grid-cols-2">
            {OCCURRENCE_TYPES.map((t) => {
              const selected = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    <Icon name={t.icon} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-bold", selected && "text-primary")}>
                      {t.value}
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {t.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section number={step(2)} title="Conte o que aconteceu">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            maxLength={10000}
            placeholder="O que aconteceu, quando, onde e quem estava envolvido. Escreva com suas palavras."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="flex gap-1.5 text-xs leading-5 text-muted-foreground">
              <Icon name="lightbulb" size={16} className="shrink-0 text-primary" />
              Para continuar anônimo(a), evite detalhes que só você saberia, como seu nome ou o
              de quem estava com você.
            </p>
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                description.trim().length < MIN_DESCRIPTION ? "text-muted-foreground" : "text-emerald-600"
              )}
            >
              {description.trim().length}
            </span>
          </div>
        </Section>

        <Section number={step(3)} title="Provas (opcional)">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            <Icon name="attach_file" size={20} />
            Adicionar fotos ou PDFs
          </button>
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <Icon
                    name={f.type === "application/pdf" ? "picture_as_pdf" : "image"}
                    size={18}
                    className="text-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remover ${f.name}`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            PDF, JPG ou PNG, até 5 arquivos de 10 MB. Antes de salvar, removemos dos arquivos a
            localização, o aparelho e o autor.
          </p>
        </Section>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="h-12 w-full gap-2 text-base font-bold" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar relato"}
          {!submitting && <Icon name="send" size={20} />}
        </Button>
      </form>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Success({ sent }: { sent: Sent }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sent.protocol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o código continua visível para anotar
    }
  }

  return (
    <div className="animate-scale-in space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <Icon name="task_alt" size={36} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Relato enviado</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Obrigado pela coragem de relatar. Guarde o protocolo para acompanhar o andamento.
        </p>

        <div className="mt-6 rounded-2xl bg-muted p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Protocolo
          </p>
          <p className="mt-1 break-all font-mono text-2xl font-black tracking-tight text-primary sm:text-3xl">
            {sent.protocol}
          </p>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={copy}>
            <Icon name={copied ? "check" : "content_copy"} size={16} />
            {copied ? "Copiado" : "Copiar protocolo"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Também salvamos o protocolo na lista deste aparelho, no Canal de denúncia.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">O que acontece agora</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-foreground/85">
          <li>1. O RH ou a administração da empresa recebe o relato, sem saber quem enviou.</li>
          <li>2. O status fica &ldquo;Em análise&rdquo; enquanto o caso é apurado.</li>
          <li>3. Quando for concluído, o status muda para &ldquo;Finalizada&rdquo;.</li>
        </ol>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/denuncia"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Voltar ao canal
        </Link>
        <Link
          href={`/denuncia/acompanhar?protocolo=${encodeURIComponent(sent.protocol)}`}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Acompanhar este relato
        </Link>
      </div>
    </div>
  );
}

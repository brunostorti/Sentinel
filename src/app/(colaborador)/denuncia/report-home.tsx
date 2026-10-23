"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatReportDay, reportStatus } from "@/lib/reports/format";
import { useLocalStorageItem } from "@/lib/local-store";
import {
  parseSavedReports,
  removeSavedReport,
  savedReportsKey,
} from "@/lib/reports/saved-reports";

const GUARANTEES = [
  {
    icon: "visibility_off",
    text: "Seu nome e seu e-mail não ficam ligados ao relato. O login só confirma que você é colaborador.",
  },
  { icon: "event", text: "Guardamos só o dia do envio, nunca o horário." },
  {
    icon: "cleaning_services",
    text: "Fotos e PDFs anexados passam por limpeza: removemos localização, aparelho e autor.",
  },
  {
    icon: "admin_panel_settings",
    text: "Só o RH e a administração da empresa leem os relatos. Gestores não têm acesso.",
  },
];

export function ReportHome({ userId, canReport }: { userId: string; canReport: boolean }) {
  const raw = useLocalStorageItem(savedReportsKey(userId));
  const saved = useMemo(() => parseSavedReports(raw), [raw]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Andamento de cada protocolo guardado neste aparelho.
  useEffect(() => {
    for (const r of saved) {
      fetch(`/api/reports/track?protocol=${encodeURIComponent(r.protocol)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.status) setStatuses((prev) => ({ ...prev, [r.protocol]: data.status }));
        })
        .catch(() => {});
    }
  }, [saved]);

  function remove(protocol: string) {
    removeSavedReport(userId, protocol);
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Canal de denúncia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Um espaço sigiloso para relatar assédio, discriminação, violência e outras condutas
          no trabalho.
        </p>
      </div>

      {!canReport && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Icon name="info" size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="text-sm leading-6 text-foreground/85">
            Seu e-mail não está no cadastro de colaboradores de nenhuma empresa, por isso não é
            possível enviar um relato. Fale com o RH para atualizar o cadastro.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          href="/denuncia/nova"
          icon="edit_note"
          title="Fazer um relato"
          text="Conte o que aconteceu. Leva poucos minutos."
          primary
          disabled={!canReport}
        />
        <ActionCard
          href="/denuncia/acompanhar"
          icon="travel_explore"
          title="Acompanhar um relato"
          text="Consulte o andamento pelo protocolo."
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Icon name="shield" size={18} className="text-primary" />
          Como sua identidade é protegida
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

      {saved.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-bold">Relatos enviados neste aparelho</h2>
            <p className="text-xs text-muted-foreground">
              Só este aparelho guarda esta lista; o sistema não sabe quem enviou cada relato.
              Num aparelho compartilhado, remova os itens depois de consultar.
            </p>
          </div>
          <ul className="space-y-2">
            {saved.map((r) => {
              const status = statuses[r.protocol] ? reportStatus(statuses[r.protocol]) : null;
              return (
                <li
                  key={r.protocol}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <Link
                    href={`/denuncia/acompanhar?protocolo=${encodeURIComponent(r.protocol)}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-mono text-sm font-bold tracking-tight">{r.protocol}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type} · {formatReportDay(r.sentOn)}
                    </p>
                  </Link>
                  {status && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                        status.cls
                      )}
                    >
                      <Icon name={status.icon} size={14} />
                      {status.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.protocol)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Remover ${r.protocol} desta lista`}
                    title="Remover desta lista"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  text,
  primary,
  disabled,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </>
  );
  const className = cn(
    "flex items-center gap-4 rounded-xl border bg-card p-4 transition-all",
    primary ? "border-primary/30" : "border-border",
    disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/50 hover:shadow-md"
  );

  if (disabled) {
    return (
      <div className={className} aria-disabled>
        {content}
      </div>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

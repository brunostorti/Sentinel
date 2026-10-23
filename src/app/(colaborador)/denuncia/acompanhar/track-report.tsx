"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatReportDay, reportStatus } from "@/lib/reports/format";

interface Tracked {
  protocol: string;
  status: string;
  occurrence_type: string;
  created_at: string;
}

export function TrackReport({ initialProtocol }: { initialProtocol: string }) {
  const [protocol, setProtocol] = useState(initialProtocol.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Tracked | null>(null);

  const search = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/reports/track?protocol=${encodeURIComponent(value)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Protocolo não encontrado.");
      else setReport(data);
    } catch {
      setError("Sem conexão. Verifique a internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialProtocol) search(initialProtocol);
  }, [initialProtocol, search]);

  const status = report ? reportStatus(report.status) : null;

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
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Acompanhar um relato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Digite o protocolo que você recebeu ao enviar o relato.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(protocol);
        }}
        className="flex gap-2"
      >
        <Input
          value={protocol}
          onChange={(e) => setProtocol(e.target.value.toUpperCase())}
          placeholder="DEN-2026-XXXX-XXXX"
          aria-label="Protocolo"
          autoComplete="off"
          spellCheck={false}
          className="h-12 flex-1 rounded-xl font-mono text-base uppercase"
          required
        />
        <Button type="submit" className="h-12 rounded-xl px-5 font-bold" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {report && status && (
        <div className="animate-fade-in space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Protocolo
              </p>
              <p className="font-mono text-lg font-black tracking-tight">{report.protocol}</p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
                status.cls
              )}
            >
              <Icon name={status.icon} size={18} />
              {status.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo</p>
              <p className="mt-0.5 font-semibold">{report.occurrence_type}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enviado em</p>
              <p className="mt-0.5 font-semibold">{formatReportDay(report.created_at)}</p>
            </div>
          </div>
          <p className="rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
            Por segurança, o texto do relato não aparece aqui. Se tiver informações novas, faça
            um novo relato citando este protocolo.
          </p>
        </div>
      )}
    </div>
  );
}

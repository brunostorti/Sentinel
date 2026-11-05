"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { testCompanyAiKeys, type KeyTestResult } from "./actions";

export function AiKeyTest({ companyId, hasKey }: { companyId: string; hasKey: boolean }) {
  const [results, setResults] = useState<KeyTestResult[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    const res = await testCompanyAiKeys(companyId);
    setLoading(false);
    if (res.error) return setError(res.error);
    setResults(res.results ?? []);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Testar chave de IA</h2>
          <p className="text-sm text-muted-foreground">
            Confere se a chave cadastrada pela empresa é aceita pelo provedor. Não gasta créditos e não confere saldo.
          </p>
        </div>
        <Button onClick={run} disabled={loading || !hasKey}>
          <Icon name={loading ? "sync" : "bolt"} size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Testando…" : "Testar agora"}
        </Button>
      </div>
      {!hasKey && <p className="mt-3 text-sm text-amber-700">A empresa ainda não cadastrou chave de IA.</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {results && (
        <ul className="mt-4 space-y-2">
          {results.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma chave para testar.</li>}
          {results.map((r) => (
            <li key={r.provider} className="flex items-center gap-2 text-sm">
              <Icon
                name={r.ok ? "check_circle" : "error"}
                size={18}
                className={r.ok ? "text-emerald-600" : "text-destructive"}
              />
              <span className="font-semibold">{r.label}:</span>
              <span className={r.ok ? "" : "text-destructive"}>{r.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Counts {
  pending: number;
  failed: number;
  latestSurveyTitle: string | null;
}

export function NewPlansBanner() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    fetch("/api/action-plans/pending-count")
      .then((r) => r.json())
      .then((d) => setCounts(d))
      .catch(() => {});
  }, []);

  if (!counts) return null;
  if (counts.pending === 0 && counts.failed === 0) return null;

  return (
    <div className="space-y-2">
      {counts.pending > 0 && (
        <Link
          href="/planos-acao"
          className="block rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
        >
          <div className="flex items-center gap-4">
            <div className="text-2xl">✨</div>
            <div className="flex-1">
              <p className="font-bold">
                {counts.pending}{" "}
                {counts.pending === 1 ? "plano" : "planos"} aguardando revisão
              </p>
              <p className="text-sm text-muted-foreground">
                {counts.latestSurveyTitle
                  ? `Gerados a partir de "${counts.latestSurveyTitle}".`
                  : "Revise para aprovar ou rejeitar."}
              </p>
            </div>
            <span className="text-sm font-medium">Revisar →</span>
          </div>
        </Link>
      )}
      {counts.failed > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <div className="flex items-center gap-4">
            <div className="text-2xl">⚠</div>
            <div className="flex-1">
              <p className="font-bold">
                Geração de IA falhou em {counts.failed}{" "}
                {counts.failed === 1 ? "pesquisa" : "pesquisas"}
              </p>
              <p className="text-sm text-muted-foreground">
                Acesse a pesquisa em &quot;Gerenciar pesquisas&quot; e clique em &quot;Tentar de novo&quot;.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

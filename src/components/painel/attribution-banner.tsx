"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PendingOutcome {
  id: string;
  intervention_id: string;
  score_before: number;
  score_after: number;
  delta: number;
  questionnaire_scales: { name: string } | null;
  action_plans: { ai_recommendation: { title?: string } } | null;
}

type Attribution = "high" | "medium" | "low" | "none" | "cannot_tell";

const ATTRIBUTION_OPTIONS: { value: Attribution; label: string; description: string }[] = [
  { value: "high", label: "Alta", description: "Foi o motivo principal" },
  { value: "medium", label: "Média", description: "Contribuiu junto com outros fatores" },
  { value: "low", label: "Baixa", description: "Pouco impacto direto" },
  { value: "none", label: "Nenhuma", description: "Outros fatores explicam" },
  { value: "cannot_tell", label: "Não dá pra dizer", description: "Sem como julgar" },
];

export function AttributionBanner() {
  const [pending, setPending] = useState<PendingOutcome[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Attribution | null>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/outcomes/pending")
      .then((r) => r.json())
      .then((d) => setPending(d.outcomes ?? []))
      .catch(() => {});
  }, []);

  if (pending.length === 0) return null;

  const current = pending[cursor];

  function next() {
    setSelected(null);
    setNotes("");
    if (cursor + 1 >= pending.length) {
      setOpen(false);
      setPending([]);
    } else {
      setCursor(cursor + 1);
    }
  }

  function handleConfirm() {
    if (!selected || !current) return;
    startTransition(async () => {
      const res = await fetch("/api/outcomes/attribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          outcomeId: current.id,
          attribution: selected,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Falha ao salvar atribuição.");
        return;
      }
      toast.success("Atribuído.");
      next();
    });
  }

  function handleSkip() {
    if (!current) return;
    startTransition(async () => {
      await fetch("/api/outcomes/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcomeId: current.id }),
      });
      next();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/60"
      >
        <div className="flex items-center gap-4">
          <div className="text-2xl">🎯</div>
          <div className="flex-1">
            <p className="font-bold">
              {pending.length}{" "}
              {pending.length === 1 ? "ação tem" : "ações têm"} impacto medível
            </p>
            <p className="text-sm text-muted-foreground">
              Revise a atribuição para alimentar os próximos planos.
            </p>
          </div>
          <span className="text-sm font-medium">Revisar →</span>
        </div>
      </button>

      {open && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="w-full max-w-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                Atribuição de impacto
              </h2>
              <Badge variant="outline">
                {cursor + 1}/{pending.length}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Ação
              </p>
              <p className="font-semibold">
                {current.action_plans?.ai_recommendation?.title ?? current.intervention_id}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Dimensão impactada
              </p>
              <p>{current.questionnaire_scales?.name ?? "—"}</p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Comparativo
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Antes</p>
                  <p className="text-2xl font-black">{current.score_before}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Depois</p>
                  <p className="text-2xl font-black">{current.score_after}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Δ</p>
                  <p
                    className={`text-2xl font-black ${
                      current.delta > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {current.delta > 0 ? "+" : ""}
                    {current.delta}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold mb-2">
                Você atribui essa variação a esta ação?
              </p>
              <div className="space-y-2">
                {ATTRIBUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelected(opt.value)}
                    className={`block w-full rounded-lg border p-3 text-left transition ${
                      selected === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Notas (opcional)
              </p>
              <textarea
                className="w-full rounded-md border border-input bg-card p-2 text-sm"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleSkip} disabled={isPending}>
                Pular por enquanto
              </Button>
              <Button onClick={handleConfirm} disabled={!selected || isPending}>
                {isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

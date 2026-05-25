"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Outcome = "successful" | "partial" | "unsuccessful" | "in_progress";

const OUTCOME_OPTIONS: { value: Outcome; label: string; description: string; emoji: string }[] = [
  {
    value: "successful",
    label: "Funcionou bem",
    description: "Os colaboradores aderiram, o impacto foi visível.",
    emoji: "✓",
  },
  {
    value: "partial",
    label: "Resultado parcial",
    description: "Aderência ou impacto abaixo do esperado, mas algo melhorou.",
    emoji: "≈",
  },
  {
    value: "unsuccessful",
    label: "Não funcionou",
    description: "Adesão baixa ou nenhum impacto perceptível.",
    emoji: "✗",
  },
  {
    value: "in_progress",
    label: "Ainda em andamento",
    description: "Movi como marco mas a ação continua em execução.",
    emoji: "⋯",
  },
];

export function KanbanOutcomeModal({
  taskId,
  taskTitle,
  onClose,
  onCompleted,
}: {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!outcome) return;
    startTransition(async () => {
      const res = await fetch(`/api/kanban/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Falha ao registrar outcome.");
        return;
      }
      toast.success("Ação registrada no histórico.");
      onCompleted();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-black">Concluindo: {taskTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Como foi essa ação? A IA usa esse feedback para evitar repetir o que
            não funcionou.
          </p>
        </div>

        <div className="space-y-2">
          {OUTCOME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                outcome === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                {opt.emoji}
              </div>
              <div>
                <p className="font-semibold">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Notas (opcional)
          </p>
          <textarea
            className="w-full rounded-md border border-input bg-card p-2 text-sm"
            rows={2}
            placeholder='ex: "adesão de 38% nos primeiros 90 dias"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!outcome || isPending}>
            {isPending ? "Salvando..." : "Concluir e registrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

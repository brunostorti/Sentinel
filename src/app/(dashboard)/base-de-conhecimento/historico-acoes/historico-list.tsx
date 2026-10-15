"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { toast } from "sonner";

interface Action {
  id: string;
  title: string;
  description: string | null;
  universal_category_id: string | null;
  universal_categories?: { name: string; code: string } | null;
  year_started: number | null;
  year_ended: number | null;
  outcome: string | null;
  outcome_notes: string | null;
  source: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

const OUTCOME_LABELS: Record<string, { label: string; className: string }> = {
  successful: {
    label: "Bem-sucedida",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  partial: {
    label: "Parcialmente bem-sucedida",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  unsuccessful: {
    label: "Não funcionou",
    className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400",
  },
  abandoned: {
    label: "Abandonada",
    className: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  },
  in_progress: {
    label: "Em andamento",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  },
  unknown: {
    label: "Resultado desconhecido",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
  },
};

const SOURCE_LABELS: Record<string, string> = {
  manual_entry: "Manual",
  sentinel_kanban: "Kanban",
  sentinel_outcome: "Outcome",
};

export function HistoricoList({
  initialActions,
  categories,
}: {
  initialActions: Action[];
  categories: Category[];
}) {
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [editing, setEditing] = useState<Action | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const res = await fetch("/api/profile/historico");
    const data = (await res.json()) as { actions: Action[] };
    setActions(data.actions);
  }

  function handleSave(form: Partial<Action>) {
    startTransition(async () => {
      const res = await fetch("/api/profile/historico", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { status?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao salvar.");
        return;
      }
      toast.success(form.id ? "Ação atualizada." : "Ação adicionada ao histórico.");
      setEditing(null);
      setCreating(false);
      await refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Apagar essa ação do histórico?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/profile/historico?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Falha ao remover.");
        return;
      }
      toast.success("Ação removida.");
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <Button onClick={() => setCreating(true)} className="gap-1.5 font-semibold">
          <Icon name="add" size={16} />
          Adicionar ação histórica
        </Button>
      )}

      {(creating || editing) && (
        <ActionForm
          initial={editing ?? null}
          categories={categories}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
          isPending={isPending}
        />
      )}

      <div className="space-y-3">
        {actions.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma intervenção ou ação anterior registrada ainda.
          </p>
        )}
        {actions.map((a) => (
          <Card key={a.id} className="rounded-xl border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-base tracking-tight">{a.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {SOURCE_LABELS[a.source] ?? a.source}
                  </Badge>
                  {a.outcome && OUTCOME_LABELS[a.outcome] && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${OUTCOME_LABELS[a.outcome].className}`}
                    >
                      {OUTCOME_LABELS[a.outcome].label}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {a.universal_categories && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="category" size={14} />
                      {a.universal_categories.name}
                    </span>
                  )}
                  {a.year_started && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="calendar_today" size={14} />
                      {a.year_started}
                      {a.year_ended && a.year_ended !== a.year_started
                        ? ` — ${a.year_ended}`
                        : ""}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="text-sm text-foreground/90">{a.description}</p>
                )}
                {a.outcome_notes && (
                  <p className="text-sm italic text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    &ldquo;{a.outcome_notes}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(a)}
                  className="gap-1 text-xs font-semibold"
                >
                  <Icon name="edit" size={14} />
                  Editar
                </Button>
                {a.source === "manual_entry" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Icon name="delete" size={14} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActionForm({
  initial,
  categories,
  onCancel,
  onSave,
  isPending,
}: {
  initial: Action | null;
  categories: Category[];
  onCancel: () => void;
  onSave: (form: Partial<Action>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.universal_category_id ?? "");
  const [yearStarted, setYearStarted] = useState<number | "">(initial?.year_started ?? "");
  const [yearEnded, setYearEnded] = useState<number | "">(initial?.year_ended ?? "");
  const [outcome, setOutcome] = useState(initial?.outcome ?? "unknown");
  const [notes, setNotes] = useState(initial?.outcome_notes ?? "");

  const isManual = !initial || initial.source === "manual_entry";

  function submit() {
    if (!title.trim()) {
      toast.error("Título obrigatório.");
      return;
    }
    onSave({
      id: initial?.id,
      title,
      description: description || undefined,
      universal_category_id: categoryId || undefined,
      year_started: yearStarted === "" ? undefined : Number(yearStarted),
      year_ended: yearEnded === "" ? undefined : Number(yearEnded),
      outcome,
      outcome_notes: notes || undefined,
    });
  }

  return (
    <Card className="rounded-xl border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg tracking-tight">
          {initial ? "Editar ação histórica" : "Nova ação histórica"}
        </h3>
        {!isManual && (
          <Badge variant="outline" className="text-xs">
            Origem automática — apenas notas editáveis
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="action-title" className="text-xs font-semibold">
          Título da ação
        </Label>
        <Input
          id="action-title"
          placeholder="Ex: Programa de ginástica laboral ou Rodízio de turnos"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isManual}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="action-desc" className="text-xs font-semibold">
          Descrição detalhada
        </Label>
        <textarea
          id="action-desc"
          className="w-full rounded-md border border-input bg-card p-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={2}
          placeholder="Descreva brevemente o que foi feito e com qual público..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isManual}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="action-start" className="text-xs font-semibold">
            Ano de início
          </Label>
          <Input
            id="action-start"
            type="number"
            placeholder="Ex: 2024"
            value={yearStarted}
            onChange={(e) => setYearStarted(e.target.value ? Number(e.target.value) : "")}
            disabled={!isManual}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="action-end" className="text-xs font-semibold">
            Ano de encerramento (opcional)
          </Label>
          <Input
            id="action-end"
            type="number"
            placeholder="Ex: 2025"
            value={yearEnded}
            onChange={(e) => setYearEnded(e.target.value ? Number(e.target.value) : "")}
            disabled={!isManual}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="action-category" className="text-xs font-semibold">
            Dimensão / Categoria
          </Label>
          <select
            id="action-category"
            className="w-full rounded-md border border-input bg-card p-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!isManual}
          >
            <option value="">(Não classificada)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="action-outcome" className="text-xs font-semibold">
            Resultado observado
          </Label>
          <select
            id="action-outcome"
            className="w-full rounded-md border border-input bg-card p-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            disabled={!isManual}
          >
            {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="action-notes" className="text-xs font-semibold">
          Notas sobre a eficácia (por que funcionou ou falhou)
        </Label>
        <textarea
          id="action-notes"
          className="w-full rounded-md border border-input bg-card p-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
          placeholder="Ex: Baixa adesão devido a horários incompatíveis com as escalas; ou melhorou a percepção de apoio pela liderança..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={submit} disabled={isPending} className="font-semibold">
          {isPending ? "Salvando..." : "Salvar ação"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}

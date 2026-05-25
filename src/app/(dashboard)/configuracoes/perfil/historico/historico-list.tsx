"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  successful: { label: "Bem-sucedida", color: "text-green-600" },
  partial: { label: "Parcialmente bem-sucedida", color: "text-amber-600" },
  unsuccessful: { label: "Não funcionou", color: "text-red-600" },
  abandoned: { label: "Abandonada", color: "text-zinc-500" },
  in_progress: { label: "Em andamento", color: "text-blue-600" },
  unknown: { label: "Resultado desconhecido", color: "text-zinc-500" },
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
      toast.success(form.id ? "Atualizado." : "Adicionado.");
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
      toast.success("Removida.");
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <Button onClick={() => setCreating(true)}>+ Adicionar ação histórica</Button>
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
            Nenhuma ação registrada ainda.
          </p>
        )}
        {actions.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {SOURCE_LABELS[a.source] ?? a.source}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {a.universal_categories && (
                    <span>📁 {a.universal_categories.name}</span>
                  )}
                  {a.year_started && (
                    <span>
                      📅 {a.year_started}
                      {a.year_ended && a.year_ended !== a.year_started
                        ? ` — ${a.year_ended}`
                        : ""}
                    </span>
                  )}
                  {a.outcome && OUTCOME_LABELS[a.outcome] && (
                    <span className={OUTCOME_LABELS[a.outcome].color}>
                      ✦ {OUTCOME_LABELS[a.outcome].label}
                    </span>
                  )}
                </div>
                {a.description && <p className="text-sm">{a.description}</p>}
                {a.outcome_notes && (
                  <p className="text-sm italic text-muted-foreground">
                    “{a.outcome_notes}”
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                  Editar
                </Button>
                {a.source === "manual_entry" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                  >
                    🗑
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
    <Card className="space-y-4 p-6">
      <h3 className="font-bold">
        {initial ? "Editar ação" : "Nova ação histórica"}
        {!isManual && (
          <Badge variant="outline" className="ml-2 text-xs">
            Origem automática — apenas notas editáveis
          </Badge>
        )}
      </h3>

      <div>
        <Label>Título</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isManual}
        />
      </div>

      <div>
        <Label>Descrição</Label>
        <textarea
          className="w-full rounded-md border border-input bg-card p-2 text-sm"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isManual}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ano início</Label>
          <Input
            type="number"
            value={yearStarted}
            onChange={(e) => setYearStarted(e.target.value ? Number(e.target.value) : "")}
            disabled={!isManual}
          />
        </div>
        <div>
          <Label>Ano fim (opcional)</Label>
          <Input
            type="number"
            value={yearEnded}
            onChange={(e) => setYearEnded(e.target.value ? Number(e.target.value) : "")}
            disabled={!isManual}
          />
        </div>
      </div>

      <div>
        <Label>Categoria</Label>
        <select
          className="w-full rounded-md border border-input bg-card p-2 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={!isManual}
        >
          <option value="">(não classificada)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Resultado</Label>
        <select
          className="w-full rounded-md border border-input bg-card p-2 text-sm"
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

      <div>
        <Label>Notas</Label>
        <textarea
          className="w-full rounded-md border border-input bg-card p-2 text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}

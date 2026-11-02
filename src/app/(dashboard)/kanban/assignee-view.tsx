"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  summarizeByAssignee,
  type AssigneeSummary,
  type ExternalAssignee,
} from "@/lib/kanban/external-assignees";
import type { Task } from "./kanban-card";

interface AssigneeViewProps {
  tasks: Task[];
  companyUsers: { id: string; name: string }[];
  externals: ExternalAssignee[];
  columns: { id: string; name: string }[];
  doneColumnId: string | null;
  canComplete: boolean;
  /** Abre o registro de resultado (mesmo fluxo de arrastar para "Concluído"). */
  onComplete: (task: Task) => void;
}

function belongsTo(task: Task, s: AssigneeSummary): boolean {
  if (s.type === "internal") return task.assignedTo === s.id;
  if (s.type === "external") return task.externalAssigneeId === s.id;
  return !task.assignedTo && !task.externalAssigneeId;
}

/** Visão "Por responsável": escolhe a pessoa e vê as tarefas dela com checkbox. */
export function AssigneeView({
  tasks,
  companyUsers,
  externals,
  columns,
  doneColumnId,
  canComplete,
  onComplete,
}: AssigneeViewProps) {
  const people = useMemo(
    () => summarizeByAssignee(tasks, companyUsers, externals, doneColumnId),
    [tasks, companyUsers, externals, doneColumnId]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const current = people.find((p) => p.key === selected) ?? people[0] ?? null;
  const columnName = new Map(columns.map((c) => [c.id, c.name]));

  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhuma tarefa ainda. Crie uma tarefa e escolha o dono interno ou o executor externo.
      </div>
    );
  }

  const personTasks = current
    ? tasks
        .filter((t) => belongsTo(t, current))
        .sort((a, b) => {
          const doneA = a.columnId === doneColumnId ? 1 : 0;
          const doneB = b.columnId === doneColumnId ? 1 : 0;
          if (doneA !== doneB) return doneA - doneB;
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        })
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <ul className="space-y-1.5" aria-label="Responsáveis">
        {people.map((p) => {
          const active = current?.key === p.key;
          return (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setSelected(p.key)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    p.type === "external"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : p.type === "none"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                  )}
                >
                  <Icon
                    name={p.type === "external" ? "engineering" : p.type === "none" ? "help" : "person"}
                    size={18}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.type === "external" ? `Externo${p.detail ? ` · ${p.detail}` : ""}` : p.type === "internal" ? "Interno" : "Tarefas sem dono"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-black tabular-nums">{p.open}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    abertas
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="rounded-xl border border-border bg-card p-4">
        {current && (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-black">{current.name}</h2>
              <span className="text-xs text-muted-foreground">
                {current.open} abertas · {current.total - current.open} concluídas
              </span>
            </div>
            <ul className="divide-y divide-border">
              {personTasks.map((t) => {
                const done = t.columnId === doneColumnId;
                const overdue = !done && t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <li key={t.id} className="flex items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={done || !canComplete}
                      onChange={() => onComplete(t)}
                      aria-label={done ? `${t.title} concluída` : `Concluir ${t.title}`}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary disabled:opacity-60"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", done && "text-muted-foreground line-through")}>
                        {t.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{columnName.get(t.columnId) ?? "—"}</span>
                        {t.assigneeName && current.type !== "internal" && <span>Dono: {t.assigneeName}</span>}
                        {t.externalName && current.type !== "external" && <span>Externo: {t.externalName}</span>}
                        {t.dueDate && (
                          <span className={cn(overdue && "font-semibold text-red-600 dark:text-red-400")}>
                            Prazo {new Date(t.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!canComplete && (
              <p className="mt-3 text-xs text-muted-foreground">
                Só RH e Admin podem marcar tarefas como concluídas.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

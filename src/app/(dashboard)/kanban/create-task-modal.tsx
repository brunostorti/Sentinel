"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { createTask, updateTask } from "./actions";
import type { Task } from "./kanban-card";

interface CreateTaskModalProps {
  columns: { id: string; name: string }[];
  companyUsers: { id: string; name: string }[];
  onClose: () => void;
  editingTask?: Task | null;
}

export function CreateTaskModal({
  columns,
  companyUsers,
  onClose,
  editingTask,
}: CreateTaskModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!editingTask;

  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [description, setDescription] = useState(editingTask?.description ?? "");
  const [columnId, setColumnId] = useState(editingTask?.columnId ?? columns[0]?.id ?? "");
  const [assignedTo, setAssignedTo] = useState(editingTask?.assignedTo ?? "");
  const [dueDate, setDueDate] = useState(editingTask?.dueDate ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = isEdit
      ? await updateTask({
          taskId: editingTask!.id,
          title: title.trim(),
          description: description.trim() || null,
          columnId,
          assignedTo: assignedTo || null,
          dueDate: dueDate || null,
        })
      : await createTask({
          title: title.trim(),
          description: description.trim() || null,
          columnId,
          assignedTo: assignedTo || null,
          dueDate: dueDate || null,
        });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl animate-scale-in mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon name={isEdit ? "edit" : "add_task"} size={18} className="text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">{isEdit ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Título
            </Label>
            <Input
              id="title"
              placeholder="Ex.: Implementar programa de pausas ativas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descrição
              <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              id="description"
              placeholder="Descreva os detalhes da tarefa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Coluna
              </Label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Responsável
              </Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Sem responsável</option>
                {companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Prazo
              <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <Icon name="error" size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 rounded-lg" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="progress_activity" size={16} className="mr-1 animate-spin" />
                  {isEdit ? "Salvando..." : "Criando..."}
                </>
              ) : (
                isEdit ? "Salvar Alterações" : "Criar Tarefa"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

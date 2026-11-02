"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { createTask, updateTask, createExternalAssignee } from "./actions";
import type { Task } from "./kanban-card";
import {
  EXTERNAL_KINDS,
  externalLabel,
  type ExternalAssignee,
  type ExternalKind,
} from "@/lib/kanban/external-assignees";

const NEW_EXTERNAL = "__novo__";

interface CreateTaskModalProps {
  columns: { id: string; name: string }[];
  companyUsers: { id: string; name: string }[];
  externals: ExternalAssignee[];
  onClose: () => void;
  editingTask?: Task | null;
  sourceSurveyId?: string | null;
}

export function CreateTaskModal({
  columns,
  companyUsers,
  externals: initialExternals,
  onClose,
  editingTask,
  sourceSurveyId,
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
  const [externals, setExternals] = useState<ExternalAssignee[]>(initialExternals);
  const [externalId, setExternalId] = useState(editingTask?.externalAssigneeId ?? "");
  const [newExtName, setNewExtName] = useState("");
  const [newExtOrg, setNewExtOrg] = useState("");
  const [newExtKind, setNewExtKind] = useState<ExternalKind>("prestadora");
  const [savingExt, setSavingExt] = useState(false);

  async function handleCreateExternal() {
    setError("");
    setSavingExt(true);
    const result = await createExternalAssignee({
      name: newExtName,
      organization: newExtOrg,
      kind: newExtKind,
    });
    setSavingExt(false);
    if ("error" in result && result.error) return setError(result.error);
    if ("external" in result && result.external) {
      const created = result.external as ExternalAssignee;
      setExternals((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      );
      setExternalId(created.id);
      setNewExtName("");
      setNewExtOrg("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (externalId === NEW_EXTERNAL) {
      setError("Termine o cadastro do responsável externo ou escolha \"Nenhum\".");
      return;
    }
    setLoading(true);

    const result = isEdit
      ? await updateTask({
          taskId: editingTask!.id,
          title: title.trim(),
          description: description.trim() || null,
          columnId,
          assignedTo: assignedTo || null,
          externalAssigneeId: externalId && externalId !== NEW_EXTERNAL ? externalId : null,
          dueDate: dueDate || null,
        })
      : await createTask({
          title: title.trim(),
          description: description.trim() || null,
          columnId,
          assignedTo: assignedTo || null,
          externalAssigneeId: externalId && externalId !== NEW_EXTERNAL ? externalId : null,
          dueDate: dueDate || null,
          sourceSurveyId: sourceSurveyId ?? null,
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
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
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
                Dono interno
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
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Executor externo
              <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <select
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Nenhum</option>
              {externals.map((x) => (
                <option key={x.id} value={x.id}>
                  {externalLabel(x)}
                </option>
              ))}
              <option value={NEW_EXTERNAL}>+ Cadastrar novo responsável externo</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Prestadora, consultoria de SST ou medicina do trabalho. O dono interno continua
              respondendo pelo prazo e atualiza o status.
            </p>

            {externalId === NEW_EXTERNAL && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Nome (ex.: Carlos Souza)"
                    value={newExtName}
                    onChange={(e) => setNewExtName(e.target.value)}
                    maxLength={120}
                    className="rounded-lg"
                  />
                  <Input
                    placeholder="Empresa (opcional)"
                    value={newExtOrg}
                    onChange={(e) => setNewExtOrg(e.target.value)}
                    maxLength={120}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newExtKind}
                    onChange={(e) => setNewExtKind(e.target.value as ExternalKind)}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {(Object.keys(EXTERNAL_KINDS) as ExternalKind[]).map((k) => (
                      <option key={k} value={k}>
                        {EXTERNAL_KINDS[k].label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    disabled={savingExt || !newExtName.trim()}
                    onClick={handleCreateExternal}
                  >
                    {savingExt ? "Salvando..." : "Cadastrar"}
                  </Button>
                </div>
              </div>
            )}
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

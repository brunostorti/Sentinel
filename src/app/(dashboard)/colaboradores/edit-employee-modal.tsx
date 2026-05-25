"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { updateEmployee, removeEmployee } from "./actions";

interface Employee {
  id: string;
  email: string;
  name: string | null;
  department_id: string;
}

interface EditEmployeeModalProps {
  employee: Employee;
  departments: { id: string; name: string }[];
  onClose: () => void;
}

export function EditEmployeeModal({
  employee,
  departments,
  onClose,
}: EditEmployeeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(employee.name ?? "");
  const [departmentId, setDepartmentId] = useState(employee.department_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await updateEmployee({
      employeeId: employee.id,
      name: name.trim() || null,
      departmentId,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    const result = await removeEmployee(employee.id);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
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
              <Icon name="edit" size={18} className="text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Editar Colaborador</h2>
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
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {employee.email}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome
              <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Departamento
            </Label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <Icon name="error" size={16} />
              {error}
            </div>
          )}

          {/* Delete section */}
          <div className="border-t border-border pt-4">
            {confirmDelete ? (
              <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
                <span className="text-sm text-destructive">Tem certeza?</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Não
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Removendo..." : "Sim, remover"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Icon name="delete" size={14} />
                Remover colaborador
              </button>
            )}
          </div>

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
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { addEmployee } from "./actions";

interface AddEmployeeButtonProps {
  departments: { id: string; name: string }[];
}

export function AddEmployeeButton({ departments }: AddEmployeeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [newDept, setNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  function handleClose() {
    setOpen(false);
    setEmail("");
    setName("");
    setDepartmentId(departments[0]?.id ?? "");
    setNewDept(false);
    setNewDeptName("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await addEmployee({
      email: email.trim(),
      name: name.trim() || null,
      departmentId: newDept ? "" : departmentId,
      newDepartmentName: newDept ? newDeptName.trim() : undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 rounded-lg">
        <Icon name="person_add" size={18} />
        Adicionar Colaborador
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl animate-scale-in mx-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon name="person_add" size={18} className="text-primary" />
                </div>
                <h2 className="text-lg font-black tracking-tight">Adicionar Colaborador</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="emp-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="emp-email"
                  type="email"
                  placeholder="colaborador@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome
                  <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="emp-name"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Departamento
                </Label>
                {!newDept ? (
                  <div className="space-y-2">
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
                    <button
                      type="button"
                      onClick={() => setNewDept(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      + Criar novo departamento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do novo departamento"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      required
                      className="rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewDept(false);
                        setNewDeptName("");
                      }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Cancelar — usar departamento existente
                    </button>
                  </div>
                )}
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
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Icon name="progress_activity" size={16} className="mr-1 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

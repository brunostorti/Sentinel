"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { EditEmployeeModal } from "./edit-employee-modal";

interface Employee {
  id: string;
  email: string;
  name: string | null;
  department_id: string;
  created_at: string;
  departments: { name: string } | null;
}

interface EmployeeTableProps {
  employees: Employee[];
  departments: { id: string; name: string }[];
  canManage: boolean;
}

export function EmployeeTable({
  employees,
  departments,
  canManage,
}: EmployeeTableProps) {
  const [editing, setEditing] = useState<Employee | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="pb-3 pr-4 font-semibold">Nome</th>
              <th className="pb-3 pr-4 font-semibold">Email</th>
              <th className="pb-3 pr-4 font-semibold">Departamento</th>
              <th className="pb-3 pr-4 font-semibold">Adicionado em</th>
              {canManage && <th className="pb-3 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {employees.map((emp) => (
              <tr
                key={emp.id}
                className="group transition-colors hover:bg-muted/30"
              >
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-[10px] font-bold text-primary ring-1 ring-primary/10">
                      {emp.name
                        ? emp.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "?"}
                    </div>
                    <span className="font-medium">
                      {emp.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-muted-foreground">{emp.email}</td>
                <td className="py-3.5 pr-4">
                  <span className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {emp.departments?.name ?? "—"}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                  {new Date(emp.created_at).toLocaleDateString("pt-BR")}
                </td>
                {canManage && (
                  <td className="py-3.5">
                    <button
                      onClick={() => setEditing(emp)}
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                      title="Editar"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditEmployeeModal
          employee={editing}
          departments={departments}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

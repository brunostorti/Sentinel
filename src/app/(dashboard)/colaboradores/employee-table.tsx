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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalItems = employees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentEmployees = employees.slice(startIndex, endIndex);

  // Helper to generate a consistent subtle indicator color based on department name
  function getDeptColorClass(name: string) {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-violet-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-purple-500",
    ];
    return colors[hash % colors.length];
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="pb-3.5 pr-4 font-bold text-left">Nome</th>
              <th className="pb-3.5 pr-4 font-bold text-left">Email</th>
              <th className="pb-3.5 pr-4 font-bold text-left pl-1">Departamento</th>
              <th className="pb-3.5 pr-4 font-bold text-left">Adicionado em</th>
              {canManage && <th className="pb-3.5 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {currentEmployees.map((emp) => (
              <tr
                key={emp.id}
                className="group transition-colors hover:bg-muted/30"
              >
                <td className="py-3.5 pr-4 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-[10px] font-bold text-primary ring-1 ring-primary/10">
                      {emp.name
                         ? emp.name
                             .split(" ")
                             .filter(Boolean)
                             .map((n) => n[0])
                             .slice(0, 2)
                             .join("")
                             .toUpperCase()
                         : "?"}
                    </div>
                    <span className="font-semibold text-foreground/90">
                      {emp.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-left text-muted-foreground">{emp.email}</td>
                <td className="py-3.5 pr-4 text-left">
                  {emp.departments?.name ? (
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/80 pl-1">
                      <span className={`h-2 w-2 rounded-full ${getDeptColorClass(emp.departments.name)} shrink-0`} />
                      <span>{emp.departments.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground pl-1">—</span>
                  )}
                </td>
                <td className="py-3.5 pr-4 text-left text-xs text-muted-foreground">
                  {new Date(emp.created_at).toLocaleDateString("pt-BR")}
                </td>
                {canManage && (
                  <td className="py-3.5 text-center">
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

      {/* Paginação inferior */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
          <p className="text-xs text-muted-foreground">
            Exibindo <span className="font-semibold text-foreground">{startIndex + 1}</span> a{" "}
            <span className="font-semibold text-foreground">{endIndex}</span> de{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> colaboradores
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              title="Página Anterior"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="text-xs font-bold px-2 text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              title="Próxima Página"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>
      )}

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

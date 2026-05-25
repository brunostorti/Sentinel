"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/icon";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  dueDate: string | null;
  dimensionName: string | null;
  assigneeName: string | null;
  assignedTo: string | null;
}

interface KanbanCardProps {
  task: Task;
  canManage: boolean;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  isDragOverlay?: boolean;
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date();
}

export function KanbanCard({
  task,
  canManage,
  onDelete,
  onEdit,
  isDragOverlay,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group cursor-grab rounded-xl border bg-card p-3.5 transition-all duration-200 active:cursor-grabbing
        ${isDragging ? "opacity-30" : ""}
        ${isDragOverlay ? "rotate-2 shadow-xl ring-2 ring-primary/30 scale-105" : ""}
        ${!isDragging && !isDragOverlay ? "border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5" : ""}
      `}
    >
      {/* Dimension badge */}
      {task.dimensionName && (
        <span className="mb-2 inline-flex items-center rounded-lg bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          {task.dimensionName}
        </span>
      )}

      {/* Title */}
      <p className="text-sm font-bold leading-snug">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: assignee + date + actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Assignee */}
          {task.assigneeName && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-[9px] font-bold text-primary ring-1 ring-primary/10">
                {task.assigneeName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {task.assigneeName.split(" ")[0]}
              </span>
            </div>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] ${
                overdue
                  ? "bg-red-100 text-red-700 font-semibold"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <Icon name={overdue ? "warning" : "schedule"} size={12} />
              {new Date(task.dueDate).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canManage && !isDragOverlay && (
          <div className="flex items-center gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="Editar"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon name="edit" size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="Excluir"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

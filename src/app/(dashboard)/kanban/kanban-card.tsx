"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/icon";
import { daysOverdue, isTaskOverdue, overdueLabel } from "@/lib/kanban/overdue";
import { todayInBrazil } from "@/lib/reports/alerts";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  dueDate: string | null;
  dimensionName: string | null;
  surveyTitle: string | null;
  sourceSurveyId: string | null;
  assigneeName: string | null;
  assignedTo: string | null;
  externalAssigneeId: string | null;
  /** "Nome · Organização" do executor externo, quando houver. */
  externalName: string | null;
}

interface KanbanCardProps {
  task: Task;
  canManage: boolean;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  isDragOverlay?: boolean;
  /** Está na coluna de conclusão: nunca aparece como atrasada. */
  done?: boolean;
}

export function KanbanCard({
  task,
  canManage,
  onDelete,
  onEdit,
  isDragOverlay,
  done = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // DragOverlay handles its own positioning — don't let useSortable interfere
  const style = isDragOverlay ? undefined : {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const today = todayInBrazil();
  const overdue = isTaskOverdue(task.dueDate, done, today);
  const lateDays = overdue && task.dueDate ? daysOverdue(task.dueDate, today) : 0;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={`group cursor-grab rounded-xl border bg-card p-3.5 transition-all duration-200 active:cursor-grabbing
        ${isDragging ? "opacity-30" : ""}
        ${isDragOverlay ? "shadow-xl ring-2 ring-primary/30 cursor-grabbing" : ""}
        ${!isDragging && !isDragOverlay ? (overdue ? "border-red-300 shadow-sm ring-1 ring-red-200 hover:shadow-md dark:border-red-500/50 dark:ring-red-500/20" : "border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5") : ""}
      `}
    >
      {overdue && (
        <div className="mb-2 flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-400">
          <Icon name="warning" size={13} />
          {overdueLabel(lateDays)}
        </div>
      )}
      {/* Dimension badge */}
      {(task.dimensionName || task.surveyTitle) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {task.dimensionName && (
            <span className="inline-flex items-center rounded-lg bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {task.dimensionName}
            </span>
          )}
          {task.surveyTitle && (
            <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {task.surveyTitle}
            </span>
          )}
        </div>
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
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
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

          {/* External executor */}
          {task.externalName && (
            <div
              className="flex max-w-[9rem] items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-200"
              title={`Executor externo: ${task.externalName}`}
            >
              <Icon name="engineering" size={12} className="shrink-0" />
              <span className="truncate">{task.externalName}</span>
            </div>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] ${
                overdue
                  ? "bg-red-100 text-red-700 font-semibold dark:bg-red-950/50 dark:text-red-400"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <Icon name={overdue ? "warning" : "schedule"} size={12} />
              {new Date(`${task.dueDate.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
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

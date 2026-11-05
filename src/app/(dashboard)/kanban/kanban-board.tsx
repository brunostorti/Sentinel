"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { moveTask, deleteTask } from "./actions";
import { CreateTaskModal } from "./create-task-modal";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard, type Task } from "./kanban-card";
import { isTaskOverdue } from "@/lib/kanban/overdue";
import { todayInBrazil } from "@/lib/reports/alerts";
import { KanbanOutcomeModal } from "@/components/kanban/outcome-modal";
import type { ExternalAssignee } from "@/lib/kanban/external-assignees";
import { AssigneeView } from "./assignee-view";

interface Column {
  id: string;
  name: string;
  order_index: number;
}

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  companyUsers: { id: string; name: string }[];
  externals: ExternalAssignee[];
  canManage: boolean;
  sourceSurveyId?: string | null;
}

type View = "board" | "people";

const COLUMN_COLORS: Record<number, string> = {
  0: "#6b7280", // gray — A Definir
  1: "#1968e6", // blue — Em Andamento
  2: "#f1c40f", // amber — Quase Concluído
  3: "#2ecc71", // green — Concluído
};

export function KanbanBoard({
  columns,
  tasks: initialTasks,
  companyUsers,
  externals,
  canManage,
  sourceSurveyId,
}: KanbanBoardProps) {
  const [view, setView] = useState<View>("board");
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Última coluna = "Concluído" (maior order_index)
  const doneColumnId = columns.length > 0
    ? [...columns].sort((a, b) => b.order_index - a.order_index)[0].id
    : null;

  const today = todayInBrazil();
  const overdueCount = tasks.filter((t) => isTaskOverdue(t.dueDate, t.columnId === doneColumnId, today)).length;

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      // Check if dropping over a column
      const overColumn = columns.find((c) => c.id === overId);
      // Or dropping over another task
      const overTask = tasks.find((t) => t.id === overId);
      const targetColumnId = overColumn?.id ?? overTask?.columnId;

      if (targetColumnId && activeTask.columnId !== targetColumnId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, columnId: targetColumnId } : t
          )
        );
      }
    },
    [tasks, columns]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active } = event;
      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);

      setActiveTask(null);

      if (!task) return;

      // Find original column
      const originalTask = initialTasks.find((t) => t.id === taskId);
      if (originalTask && originalTask.columnId !== task.columnId) {
        // Se foi solto na coluna "Concluído", abre modal de outcome (não persiste ainda)
        if (doneColumnId && task.columnId === doneColumnId) {
          // Reverte visualmente até o modal confirmar (evita estado inconsistente)
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, columnId: originalTask.columnId } : t
            )
          );
          setCompletingTask({ ...originalTask });
          return;
        }
        await moveTask(taskId, task.columnId);
        router.refresh();
      }
    },
    [tasks, initialTasks, router, doneColumnId]
  );

  async function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await deleteTask(taskId);
    router.refresh();
  }

  const totalTasks = tasks.length;

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist">
            {(
              [
                ["board", "Quadro", "view_kanban"],
                ["people", "Por responsável", "group"],
              ] as [View, string, string][]
            ).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={icon} size={16} />
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {totalTasks} {totalTasks === 1 ? "tarefa" : "tarefas"} em{" "}
            {columns.length} colunas
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreate(true)}
              variant="outline"
              className="gap-1.5 rounded-lg"
            >
              <Icon name="add" size={18} />
              Nova Tarefa
            </Button>
          </div>
        )}
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          <Icon name="warning" size={18} className="shrink-0" />
          <span>
            <strong>{overdueCount === 1 ? "1 tarefa atrasada" : `${overdueCount} tarefas atrasadas`}</strong>: prazo vencido
            e ainda fora de &quot;Concluído&quot;. Estão destacadas em vermelho no quadro.
          </span>
        </div>
      )}

      {view === "people" && (
        <AssigneeView
          tasks={tasks}
          companyUsers={companyUsers}
          externals={externals}
          doneColumnId={doneColumnId}
          columns={columns}
          canComplete={canManage}
          onComplete={(t) => setCompletingTask(t)}
        />
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex gap-4 overflow-x-auto pb-4 ${view === "board" ? "" : "hidden"}`}>
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.columnId === col.id);
            const accentColor =
              COLUMN_COLORS[col.order_index] ?? COLUMN_COLORS[0];
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                name={col.name}
                taskCount={colTasks.length}
                accentColor={accentColor}
              >
                <SortableContext
                  items={colTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-10 text-muted-foreground">
                      <Icon name="inbox" size={28} className="mb-1.5 opacity-30" />
                      <p className="text-xs font-medium opacity-60">Arraste tarefas aqui</p>
                    </div>
                  )}
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      onDelete={handleDelete}
                      onEdit={(t) => setEditingTask(t)}
                      done={task.columnId === doneColumnId}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        {/* Outcome modal (kanban → Concluído) */}
        {completingTask && (
          <KanbanOutcomeModal
            taskId={completingTask.id}
            taskTitle={completingTask.title}
            onClose={() => setCompletingTask(null)}
            onCompleted={() => {
              setCompletingTask(null);
              router.refresh();
            }}
          />
        )}

        {/* Drag overlay — ghost card while dragging.
            Portaled para document.body: o layout (PageTransition) mantém um
            transform residual (translateY(0) com fill-mode both), que viraria
            o bloco de contenção do position:fixed do overlay e o deslocaria.
            No body, o fixed fica relativo à viewport e o card cola no cursor. */}
        {typeof document !== "undefined" &&
          createPortal(
            <DragOverlay>
              {activeTask && (
                <KanbanCard
                  task={activeTask}
                  canManage={false}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  isDragOverlay
                />
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {showCreate && (
        <CreateTaskModal
          columns={columns}
          companyUsers={companyUsers}
          externals={externals}
          sourceSurveyId={sourceSurveyId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingTask && (
        <CreateTaskModal
          columns={columns}
          companyUsers={companyUsers}
          externals={externals}
          editingTask={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}

    </>
  );
}

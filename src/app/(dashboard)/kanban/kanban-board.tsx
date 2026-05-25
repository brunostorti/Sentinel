"use client";

import { useState, useCallback } from "react";
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
import { GeneratePlanModal } from "./generate-plan-modal";
import { KanbanOutcomeModal } from "@/components/kanban/outcome-modal";

interface Column {
  id: string;
  name: string;
  order_index: number;
}

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  companyUsers: { id: string; name: string }[];
  canManage: boolean;
}

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
  canManage,
}: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Última coluna = "Concluído" (maior order_index)
  const doneColumnId = columns.length > 0
    ? [...columns].sort((a, b) => b.order_index - a.order_index)[0].id
    : null;

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
        <div className="flex items-center gap-3">
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
            <Button
              onClick={() => setShowGenerate(true)}
              className="gap-1.5 rounded-lg"
            >
              <Icon name="auto_awesome" size={18} />
              Gerar Plano de IA
            </Button>
          </div>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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

        {/* Drag overlay — ghost card while dragging */}
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
        </DragOverlay>
      </DndContext>

      {showCreate && (
        <CreateTaskModal
          columns={columns}
          companyUsers={companyUsers}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingTask && (
        <CreateTaskModal
          columns={columns}
          companyUsers={companyUsers}
          editingTask={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {showGenerate && (
        <GeneratePlanModal onClose={() => setShowGenerate(false)} />
      )}
    </>
  );
}

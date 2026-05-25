"use client";

import { useDroppable } from "@dnd-kit/core";

interface KanbanColumnProps {
  id: string;
  name: string;
  taskCount: number;
  accentColor: string;
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  name,
  taskCount,
  accentColor,
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col rounded-2xl border transition-all duration-200 ${
        isOver
          ? "border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/5"
          : "border-border/60 bg-muted/20"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <span
          className="h-2.5 w-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}30` }}
        />
        <h3 className="text-xs font-bold uppercase tracking-wider">{name}</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
          {taskCount}
        </span>
      </div>

      {/* Tasks container */}
      <div className="flex flex-1 flex-col gap-2.5 p-2.5 pt-0">
        {children}
      </div>
    </div>
  );
}

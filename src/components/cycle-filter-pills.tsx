"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface CycleFilterOption {
  id: string;
  title: string;
}

interface CycleFilterPillsProps {
  cycles: CycleFilterOption[];
  currentCycleId?: string | null;
  basePath?: string;
  paramName?: string;
  onSelectCycle?: (cycleId: string | null) => void;
  className?: string;
}

export function CycleFilterPills({
  cycles,
  currentCycleId = null,
  basePath,
  paramName = "cycleId",
  onSelectCycle,
  className = "",
}: CycleFilterPillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!cycles || cycles.length === 0) return null;

  const handleSelect = (cycleId: string | null) => {
    if (onSelectCycle) {
      onSelectCycle(cycleId);
      return;
    }

    const currentParams = new URLSearchParams(searchParams?.toString() ?? "");
    // Remove query params that drill down to a single survey when switching cycle
    currentParams.delete("surveyId");

    if (!cycleId || cycleId === "todos") {
      currentParams.delete(paramName);
      currentParams.delete("ciclo");
    } else {
      currentParams.set(paramName, cycleId);
    }

    const targetPath = basePath || pathname;
    const queryString = currentParams.toString();
    const finalUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

    router.push(finalUrl);
  };

  const isAllActive = !currentCycleId || currentCycleId === "todos";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground">
        Ciclo:
      </span>
      <button
        type="button"
        onClick={() => handleSelect(null)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
          isAllActive
            ? "bg-primary text-primary-foreground shadow-xs"
            : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        Todos (Geral)
      </button>
      {cycles.map((c) => {
        const isActive = currentCycleId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelect(c.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {c.title}
          </button>
        );
      })}
    </div>
  );
}

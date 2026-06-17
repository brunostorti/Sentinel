export type CounterAccent = "amber" | "emerald" | "zinc" | "blue";

export const COUNTER_COLORS: Record<CounterAccent, string> = {
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
};

export function Counter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: CounterAccent;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${COUNTER_COLORS[accent]}`}
    >
      <span className="tabular-nums text-sm font-black">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

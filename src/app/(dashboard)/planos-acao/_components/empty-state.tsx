import { Icon } from "@/components/icon";

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-transparent p-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
        <Icon name={icon} size={32} className="text-primary/40" />
      </div>
      <p className="mt-4 text-base font-bold text-foreground/70">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

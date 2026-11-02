import Link from "next/link";
import { Icon } from "@/components/icon";
import type { SectorAlert } from "@/lib/reports/alerts";
import { LEAVE_ALERT_CATEGORY } from "@/lib/leave-cases/constants";

/** Avisos de setor com casos repetidos. Mostra só contagem e categoria. */
export function SectorAlerts({
  alerts,
  departmentNames,
  windowDays,
  threshold,
}: {
  alerts: SectorAlert[];
  departmentNames: Record<string, string>;
  windowDays: number;
  threshold: number;
}) {
  if (alerts.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      aria-label="Alertas por setor"
    >
      <div className="flex items-start gap-3">
        <Icon name="notification_important" size={22} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">
            {alerts.length === 1 ? "1 setor pede atenção" : `${alerts.length} setores pedem atenção`}
          </h2>
          <p className="text-xs text-muted-foreground">
            {threshold} ou mais casos da mesma categoria nos últimos {windowDays} dias. Ajuste em
            Configurações.
          </p>
          <ul className="mt-3 space-y-1.5">
            {alerts.map((a) => {
              const name = departmentNames[a.departmentId] ?? "Setor removido";
              const isLeave = a.category === LEAVE_ALERT_CATEGORY;
              const href = isLeave
                ? "/denuncias?aba=afastamentos"
                : `/denuncias?setor=${encodeURIComponent(name)}`;
              return (
                <li key={`${a.departmentId}-${a.category}`}>
                  <Link
                    href={href}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <strong>{name}</strong>
                    <span className="text-muted-foreground">·</span>
                    <span>
                      {a.count} {isLeave ? (a.count === 1 ? "afastamento" : "afastamentos") : `denúncias de ${a.category.toLowerCase()}`}
                    </span>
                    <Icon name="chevron_right" size={16} className="ml-auto text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function DenunciasTabs({ active, leaveCount }: { active: "denuncias" | "afastamentos"; leaveCount: number }) {
  const tabs = [
    { key: "denuncias", label: "Denúncias", href: "/denuncias", icon: "shield" },
    { key: "afastamentos", label: "Afastamentos", href: "/denuncias?aba=afastamentos", icon: "event_busy" },
  ] as const;
  return (
    <nav className="inline-flex rounded-lg border border-border bg-card p-0.5" aria-label="Seções do canal">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            active === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name={t.icon} size={16} />
          {t.label}
          {t.key === "afastamentos" && leaveCount > 0 && (
            <span className="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{leaveCount}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

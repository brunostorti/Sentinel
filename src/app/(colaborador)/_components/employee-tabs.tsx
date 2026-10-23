"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/pesquisas", label: "Pesquisas", icon: "assignment" },
  { href: "/denuncia", label: "Canal de denúncia", icon: "shield" },
];

/** Abas da área do colaborador; somem durante o formulário para a pessoa se concentrar. */
export function EmployeeTabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/responder")) return null;

  return (
    <nav className="mx-auto flex w-full max-w-3xl gap-1 px-2 sm:px-4" aria-label="Seções">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon name={tab.icon} size={18} filled={active} />
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

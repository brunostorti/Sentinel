"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { ROUTES, type Role } from "@/lib/constants";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const SUPER_ADMIN_NAV: NavItem[] = [
  { label: "Painel", href: ROUTES.SUPER_ADMIN.DASHBOARD, icon: "dashboard" },
  {
    label: "Empresas",
    href: ROUTES.SUPER_ADMIN.COMPANIES,
    icon: "business",
  },
  { label: "Usuários", href: ROUTES.SUPER_ADMIN.USERS, icon: "group" },
];

interface SidebarProps {
  role: Role;
  companyName?: string;
  employeeCount?: number;
}

export function Sidebar({ role, companyName, employeeCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Define the structured groups for dashboard navigation
  const groups = [
    {
      title: "Diagnóstico & Análise",
      items: [
        { label: "Início", href: ROUTES.DASHBOARD.HOME, icon: "home" },
        { label: "Painel", href: ROUTES.DASHBOARD.OVERVIEW, icon: "dashboard" },
        { label: "Pesquisas", href: ROUTES.DASHBOARD.SURVEYS, icon: "assignment" },
        { label: "Relatórios", href: ROUTES.DASHBOARD.REPORTS, icon: "description" },
        { label: "Certificados", href: ROUTES.DASHBOARD.CERTIFICATES, icon: "verified" },
      ],
    },
    {
      title: "Planos & Execução",
      items: [
        { label: "Planos de Ação", href: ROUTES.DASHBOARD.ACTION_PLANS, icon: "lightbulb" },
        { label: "Kanban", href: ROUTES.DASHBOARD.KANBAN, icon: "view_kanban" },
      ],
    },
    {
      title: "Pessoas & Configurações",
      items: [
        { label: "Colaboradores", href: ROUTES.DASHBOARD.EMPLOYEES, icon: "group" },
        { label: "Configurações", href: ROUTES.DASHBOARD.SETTINGS, icon: "settings" },
        { label: "Assistente", href: ROUTES.DASHBOARD.ASSISTANT, icon: "chat" },
      ],
    },
    {
      title: "Canal Seguro",
      items: [
        { label: "Denúncias", href: ROUTES.DASHBOARD.INCIDENTS, icon: "gavel" },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4 shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon name="shield" size={22} filled className="text-primary" />
        </div>
        {!collapsed && (
          <span className="animate-fade-in text-lg font-black tracking-tight">
            Sentinel
          </span>
        )}
      </div>

      {/* Company context */}
      {companyName && (
        <div className="border-b border-border px-4 py-3 shrink-0">
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-[10px] font-black text-primary">
              {companyName.charAt(0)}
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Empresa
              </p>
              <p className="truncate text-sm font-semibold">{companyName}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {role === "SUPER_ADMIN" ? (
          <nav className="space-y-1">
            {SUPER_ADMIN_NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    filled={isActive}
                    className={cn(
                      "shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )}
                  />
                  {!collapsed && (
                    <span className="animate-fade-in">{item.label}</span>
                  )}
                  {isActive && collapsed && (
                    <span className="absolute -right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        ) : (
          groups.map((group, groupIdx) => {
            // Filter elements (like Incidents if employeeCount <= 20)
            const filteredItems = group.items.filter((item) => {
              if (item.href === ROUTES.DASHBOARD.INCIDENTS) {
                return employeeCount > 20;
              }
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1.5">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {group.title}
                  </p>
                )}
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon
                          name={item.icon}
                          size={20}
                          filled={isActive}
                          className={cn(
                            "shrink-0 transition-transform duration-200",
                            !isActive && "group-hover:scale-110"
                          )}
                        />
                        {!collapsed && (
                          <span className="animate-fade-in">{item.label}</span>
                        )}
                        {isActive && collapsed && (
                          <span className="absolute -right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
                {groupIdx < groups.length - 1 && (
                  <div className="pt-2 border-b border-border/40 mx-2" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support / Configuration Group (Metodologia remains in lower/support group) */}
      <nav className="border-t border-border/60 px-3 py-4 space-y-1 shrink-0">
        <Link
          href={ROUTES.DASHBOARD.METHODOLOGY}
          title={collapsed ? "Metodologia" : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            collapsed && "justify-center px-0",
            pathname.startsWith(ROUTES.DASHBOARD.METHODOLOGY)
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon
            name="menu_book"
            size={20}
            filled={pathname.startsWith(ROUTES.DASHBOARD.METHODOLOGY)}
            className="shrink-0"
          />
          {!collapsed && <span className="animate-fade-in">Metodologia</span>}
          {pathname.startsWith(ROUTES.DASHBOARD.METHODOLOGY) && collapsed && (
            <span className="absolute -right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
          )}
        </Link>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3 shrink-0 bg-card">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon
            name={collapsed ? "chevron_right" : "chevron_left"}
            size={20}
            className="transition-transform duration-200"
          />
          {!collapsed && <span className="animate-fade-in">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}

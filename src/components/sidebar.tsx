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

const DASHBOARD_NAV: NavItem[] = [
  { label: "Painel", href: ROUTES.DASHBOARD.OVERVIEW, icon: "dashboard" },
  { label: "Assistente", href: ROUTES.DASHBOARD.ASSISTANT, icon: "chat" },
  { label: "Pesquisas", href: ROUTES.DASHBOARD.SURVEYS, icon: "assignment" },
  {
    label: "Colaboradores",
    href: ROUTES.DASHBOARD.EMPLOYEES,
    icon: "group",
  },
  {
    label: "Planos de Ação",
    href: ROUTES.DASHBOARD.ACTION_PLANS,
    icon: "lightbulb",
  },
  { label: "Kanban", href: ROUTES.DASHBOARD.KANBAN, icon: "view_kanban" },
  { label: "Relatórios", href: ROUTES.DASHBOARD.REPORTS, icon: "description" },
  { label: "Denúncias", href: ROUTES.DASHBOARD.INCIDENTS, icon: "gavel" },
  { label: "Certificados", href: ROUTES.DASHBOARD.CERTIFICATES, icon: "verified" },
  {
    label: "Configurações",
    href: ROUTES.DASHBOARD.SETTINGS,
    icon: "settings",
  },
  {
    label: "Metodologia",
    href: ROUTES.DASHBOARD.METHODOLOGY,
    icon: "menu_book",
  },
];

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
  
  // Filter navigation items
  const filteredDashboardNav = DASHBOARD_NAV.filter(item => {
    if (item.href === ROUTES.DASHBOARD.INCIDENTS) {
      return employeeCount > 20;
    }
    return true;
  });

  const navItems = role === "SUPER_ADMIN" ? SUPER_ADMIN_NAV : filteredDashboardNav;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
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
        <div className="border-b border-border px-4 py-3">
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-[10px] font-black text-primary">
              {companyName.charAt(0)}
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Empresa
              </p>
              <p className="truncate text-sm font-semibold">{companyName}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
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
              {/* Active dot for collapsed mode */}
              {isActive && collapsed && (
                <span className="absolute -right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3">
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
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

/**
 * Módulos que só existem dentro de um ciclo/pesquisa.
 *
 * Ficam aninhados sob "Ciclos" em vez de soltos no primeiro nível: abrir o
 * Kanban ou os Planos direto pela sidebar é um atalho, não um lugar próprio —
 * o contexto (qual pesquisa do ciclo) sempre vem do ciclo.
 */
const CYCLE_MODULES: NavItem[] = [
  { label: "Painel", href: ROUTES.DASHBOARD.OVERVIEW, icon: "dashboard" },
  {
    label: "Planos de Ação",
    href: ROUTES.DASHBOARD.ACTION_PLANS,
    icon: "lightbulb",
  },
  { label: "Kanban", href: ROUTES.DASHBOARD.KANBAN, icon: "view_kanban" },
];

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Diagnóstico & Análise",
    items: [
      { label: "Início", href: ROUTES.DASHBOARD.HOME, icon: "home" },
      // Os módulos internos são renderizados logo abaixo deste item.
      { label: "Ciclos", href: ROUTES.DASHBOARD.SURVEYS, icon: "account_tree" },
      {
        label: "Relatórios",
        href: ROUTES.DASHBOARD.REPORTS,
        icon: "description",
      },
      {
        label: "Certificados",
        href: ROUTES.DASHBOARD.CERTIFICATES,
        icon: "verified",
      },
    ],
  },
  {
    title: "Pessoas & Configurações",
    items: [
      { label: "Colaboradores", href: ROUTES.DASHBOARD.EMPLOYEES, icon: "group" },
      { label: "Meu perfil", href: ROUTES.DASHBOARD.ACCOUNT, icon: "person" },
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

/** Item de primeiro nível — o mesmo visual usado em toda a sidebar. */
function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
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
      {!collapsed && <span className="animate-fade-in">{item.label}</span>}
      {isActive && collapsed && (
        <span className="absolute -right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
    </Link>
  );
}

/**
 * Subnível dos módulos de ciclo.
 *
 * Visual deliberadamente mais leve que o primeiro nível (texto menor, ícone
 * menor, ativo em fundo suave em vez de sólido): o peso visual precisa dizer
 * "isto está dentro daquilo acima", não competir com ele.
 */
function SubNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200",
        isActive
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "absolute -left-3 h-1.5 w-1.5 rounded-full transition-colors",
          isActive ? "bg-primary" : "bg-transparent"
        )}
        aria-hidden
      />
      <Icon
        name={item.icon}
        size={17}
        filled={isActive}
        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      />
      <span className="animate-fade-in">{item.label}</span>
    </Link>
  );
}

interface SidebarProps {
  role: Role;
  companyName?: string;
  employeeCount?: number;
}

export function Sidebar({ role, companyName, employeeCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [cycleModulesOpen, setCycleModulesOpen] = useState(true);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4 shrink-0">
        <BrandLogo size="md" priority />
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
            {SUPER_ADMIN_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname.startsWith(item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>
        ) : (
          GROUPS.map((group, groupIdx) => {
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
                    const isCycles = item.href === ROUTES.DASHBOARD.SURVEYS;

                    // Sidebar recolhida não comporta hierarquia: os módulos do
                    // ciclo viram ícones soltos para não sumirem da navegação.
                    if (isCycles && collapsed) {
                      return (
                        <div key={item.href} className="space-y-1">
                          <NavLink item={item} isActive={isActive} collapsed />
                          {CYCLE_MODULES.map((sub) => (
                            <NavLink
                              key={sub.href}
                              item={sub}
                              isActive={pathname.startsWith(sub.href)}
                              collapsed
                            />
                          ))}
                        </div>
                      );
                    }

                    if (!isCycles) {
                      return (
                        <NavLink
                          key={item.href}
                          item={item}
                          isActive={isActive}
                          collapsed={collapsed}
                        />
                      );
                    }

                    return (
                      <div key={item.href}>
                        <div
                          className={cn(
                            "group relative flex items-center rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <Link
                            href={item.href}
                            className="flex flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium"
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
                            <span className="animate-fade-in">{item.label}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setCycleModulesOpen((v) => !v)}
                            aria-expanded={cycleModulesOpen}
                            aria-label={
                              cycleModulesOpen
                                ? "Recolher módulos do ciclo"
                                : "Expandir módulos do ciclo"
                            }
                            className={cn(
                              "mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isActive
                                ? "hover:bg-primary-foreground/15"
                                : "hover:bg-foreground/10"
                            )}
                          >
                            <Icon
                              name="expand_more"
                              size={18}
                              className={cn(
                                "transition-transform duration-200",
                                cycleModulesOpen ? "rotate-0" : "-rotate-90"
                              )}
                            />
                          </button>
                        </div>

                        {cycleModulesOpen && (
                          <div className="animate-fade-in ml-[22px] mt-1 space-y-0.5 border-l border-border pl-3">
                            <p className="px-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                              Dentro de um ciclo
                            </p>
                            {CYCLE_MODULES.map((sub) => (
                              <SubNavLink
                                key={sub.href}
                                item={sub}
                                isActive={pathname.startsWith(sub.href)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
                {groupIdx < GROUPS.length - 1 && (
                  <div className="pt-2 border-b border-border/40 mx-2" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support / Configuration Group (Metodologia remains in lower/support group) */}
      <nav className="border-t border-border/60 px-3 py-4 space-y-1 shrink-0">
        <NavLink
          item={{
            label: "Metodologia",
            href: ROUTES.DASHBOARD.METHODOLOGY,
            icon: "menu_book",
          }}
          isActive={pathname.startsWith(ROUTES.DASHBOARD.METHODOLOGY)}
          collapsed={collapsed}
        />
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

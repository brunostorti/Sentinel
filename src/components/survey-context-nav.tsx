"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

type SurveyContextTab =
  | "fluxo"
  | "painel"
  | "planos"
  | "kanban"
  | "relatorios"
  | "certificados";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Em coleta",
  CLOSED: "Encerrada",
};

const TABS: Array<{
  key: SurveyContextTab;
  label: string;
  icon: string;
  href: (surveyId: string) => string;
}> = [
  {
    key: "fluxo",
    label: "Fluxo",
    icon: "account_tree",
    href: (surveyId) => `/gerenciar-pesquisas/${surveyId}`,
  },
  {
    key: "painel",
    label: "Dashboard",
    icon: "monitoring",
    href: (surveyId) => `/gerenciar-pesquisas/${surveyId}/dashboard`,
  },
  {
    key: "planos",
    label: "Planos",
    icon: "lightbulb",
    href: (surveyId) => `/planos-acao/pesquisa/${surveyId}`,
  },
  {
    key: "kanban",
    label: "Kanban",
    icon: "view_kanban",
    href: (surveyId) => `/kanban?surveyId=${surveyId}`,
  },
  {
    key: "relatorios",
    label: "Relatório",
    icon: "summarize",
    href: (surveyId) => `/relatorios?surveyId=${surveyId}`,
  },
  {
    key: "certificados",
    label: "Certificado",
    icon: "verified",
    href: (surveyId) => `/certificados?surveyId=${surveyId}`,
  },
];

export function SurveyContextNav({
  surveyId,
  surveyTitle,
  status,
  current,
}: {
  surveyId: string;
  surveyTitle: string;
  status?: string | null;
  current: SurveyContextTab;
}) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-card/95 p-3 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="assignment" size={21} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Você está dentro desta pesquisa
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black tracking-tight">
                {surveyTitle}
              </h2>
              {status && (
                <Badge variant="outline">
                  {STATUS_LABELS[status] ?? status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Link
          href="/gerenciar-pesquisas"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon name="arrow_back" size={14} />
          Todas as pesquisas
        </Link>
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tab.href(surveyId)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

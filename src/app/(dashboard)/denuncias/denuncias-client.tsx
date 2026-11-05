"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OCCURRENCE_TYPES } from "@/lib/reports/occurrence-types";
import { formatReportDay } from "@/lib/reports/format";
import {
  isStaleReport,
  reportAgeDays,
  REPORT_STATUSES,
  REPORT_STATUS_RH,
  STALE_REPORT_DAYS,
  type ReportStatus,
} from "@/lib/reports/stale";

const STATUS_STYLE: Record<ReportStatus, { bar: string; badge: "warning" | "success" | "default" }> = {
  PENDING: { bar: "bg-amber-500", badge: "warning" },
  IN_PROGRESS: { bar: "bg-sky-500", badge: "default" },
  RESOLVED: { bar: "bg-green-500", badge: "success" },
};

/** Cor da barra por tipo (inclui "Assédio", usado pelas denúncias antigas). */
const OCCURRENCE_COLORS: Record<string, string> = {
  "Assédio moral": "bg-amber-500",
  "Assédio sexual": "bg-rose-500",
  "Assédio": "bg-amber-500",
  "Discriminação": "bg-violet-500",
  "Violência ou ameaça": "bg-red-500",
  "Conduta antiética": "bg-sky-500",
};

interface Report {
  id: string;
  company_id: string;
  protocol: string;
  occurrence_type: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  attachments: string[] | null;
  /** Setor informado por quem denunciou (opcional). */
  department_name: string | null;
}

interface DenunciasClientProps {
  initialReports: Report[];
  /** Abas e alertas, mostrados logo abaixo do título. */
  topSlot?: React.ReactNode;
  /** Filtro inicial por setor (vindo do alerta). */
  initialDepartment?: string | null;
}

type FilterStatus = "ALL" | "STALE" | ReportStatus;
type SortOption = "recent" | "oldest" | "pending_first" | "resolved_first";

export function DenunciasClient({ initialReports, topSlot, initialDepartment }: DenunciasClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(initialDepartment ?? null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (initialReports.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Canal de Denúncias</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie, classifique e acompanhe os relatos recebidos de forma totalmente segura.
          </p>
        </div>
        {topSlot}
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Icon name="inbox" size={32} className="text-muted-foreground" />
          </div>
          <CardTitle className="text-xl font-bold">Nenhuma denúncia recebida</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2">
            Os relatos enviados de forma segura pelos colaboradores da sua empresa aparecerão aqui assim que forem registrados.
          </CardDescription>
        </Card>
      </div>
    );
  }

  // 1. Calculate General Metrics (based on all reports)
  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === "PENDING").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;
  const inProgressCount = reports.filter((r) => r.status === "IN_PROGRESS").length;
  const staleCount = reports.filter((r) => isStaleReport(r.status, r.created_at)).length;
  const resolutionRate =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Occurrence type percentages (based on all reports)
  const occurrenceCounts: Record<string, number> = {};
  reports.forEach((r) => {
    occurrenceCounts[r.occurrence_type] =
      (occurrenceCounts[r.occurrence_type] || 0) + 1;
  });

  const occurrenceTypes = [
    ...OCCURRENCE_TYPES.map((t) => t.value as string),
    ...Object.keys(occurrenceCounts).filter(
      (type) => !OCCURRENCE_TYPES.some((t) => t.value === type)
    ),
  ];
  const occurrenceStats = occurrenceTypes
    .map((type) => {
      const count = occurrenceCounts[type] ?? 0;
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return { type, count, percentage };
    })
    .sort((a, b) => b.count - a.count);

  // 2. Filter and Sort Reports
  const filteredReports = reports
    .filter((report) => {
      if (departmentFilter && report.department_name !== departmentFilter) return false;

      // Status Filter
      if (filter === "STALE" && !isStaleReport(report.status, report.created_at)) return false;
      if (filter !== "ALL" && filter !== "STALE" && report.status !== filter) return false;

      // Search Filter (by protocol or description)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesProtocol = report.protocol.toLowerCase().includes(query);
        const matchesDesc = report.description.toLowerCase().includes(query);
        const matchesType = report.occurrence_type.toLowerCase().includes(query);
        return matchesProtocol || matchesDesc || matchesType;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "pending_first") {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "resolved_first") {
        if (a.status === "RESOLVED" && b.status !== "RESOLVED") return -1;
        if (a.status !== "RESOLVED" && b.status === "RESOLVED") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

  // 3. Update Status Handler
  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    setLoadingId(reportId);

    try {
      const response = await fetch(`/api/reports/${reportId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar o status.");
      }

      // Update local state
      setReports((prevReports) =>
        prevReports.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, updated_at: new Date().toISOString() }
            : r
        )
      );

      toast.success(`Status alterado para "${REPORT_STATUS_RH[newStatus]}".`);
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro de rede. Tente novamente."
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-14">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Canal de Denúncias</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie, classifique e acompanhe os relatos recebidos de forma totalmente segura.
          </p>
        </div>
      </div>

      {topSlot}

      {staleCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <Icon name="warning" size={20} className="shrink-0 text-amber-600" />
          <span>
            <strong>
              {staleCount === 1 ? "1 denúncia está" : `${staleCount} denúncias estão`} aguardando há mais de{" "}
              {STALE_REPORT_DAYS} dias
            </strong>{" "}
            sem ninguém começar a tratar. Mude para &quot;Em andamento&quot; quando iniciar a apuração.
          </span>
          <button
            type="button"
            onClick={() => setFilter("STALE")}
            className="ml-auto text-xs font-bold text-amber-800 hover:underline dark:text-amber-200"
          >
            Ver paradas
          </button>
        </div>
      )}

      {departmentFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Icon name="filter_alt" size={16} className="text-primary" />
          Mostrando só o setor <strong>{departmentFilter}</strong>
          <button
            type="button"
            onClick={() => setDepartmentFilter(null)}
            className="ml-auto text-xs font-bold text-primary hover:underline"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Metrics Section */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Denúncias
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
              <Icon name="folder" size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registradas na plataforma</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Icon name="pending_actions" size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {inProgressCount > 0 ? `${inProgressCount} em andamento` : "Ainda sem tratamento"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concluídas
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <Icon name="check_circle" size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-500">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Encerrados e solucionados</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxa de Resolução
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Icon name="insights" size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-violet-500">{resolutionRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${resolutionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occurrence Types Distribution */}
      {totalCount > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icon name="analytics" className="text-primary" size={20} />
              Distribuição por Tipo de Ocorrência
            </CardTitle>
            <CardDescription>
              Representação percentual das denúncias registradas para identificar pontos críticos de atenção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {occurrenceStats.map((stat) => {
                const empty = stat.count === 0;
                return (
                  <div
                    key={stat.type}
                    className={cn(
                      "rounded-xl border border-border/40 p-4 space-y-3",
                      empty ? "bg-muted/5 opacity-50" : "bg-muted/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("font-semibold text-sm", empty && "text-muted-foreground")}>
                          {stat.type}
                        </span>
                        {!empty && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {stat.count} {stat.count === 1 ? "caso" : "casos"}
                          </Badge>
                        )}
                      </div>
                      <span className={cn("text-lg font-black", empty ? "text-muted-foreground" : "text-foreground")}>
                        {stat.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          OCCURRENCE_COLORS[stat.type] ?? "bg-slate-500"
                        )}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
        {/* Tabs */}
        <div className="flex flex-wrap rounded-lg bg-muted p-1 self-start sm:self-auto">
          {(
            [
              { key: "ALL", label: "Todas", count: 0, active: "text-foreground" },
              { key: "PENDING", label: "Aguardando", count: pendingCount, active: "text-amber-500" },
              { key: "IN_PROGRESS", label: "Em andamento", count: inProgressCount, active: "text-sky-600" },
              { key: "RESOLVED", label: "Concluídas", count: 0, active: "text-green-500" },
              ...(staleCount > 0
                ? [{ key: "STALE", label: "Paradas", count: staleCount, active: "text-amber-700" }]
                : []),
            ] as { key: FilterStatus; label: string; count: number; active: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all select-none flex items-center gap-1",
                filter === tab.key
                  ? `bg-background shadow-sm ${tab.active}`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.key === "STALE" && <Icon name="warning" size={12} />}
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-amber-500/15 text-amber-600 px-1.5 rounded-full text-[9px] font-black">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Buscar por protocolo, relato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Icon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="relative sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-xs font-medium shadow-sm transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="pending_first">Aguardando primeiro</option>
              <option value="resolved_first">Concluídas primeiro</option>
            </select>
            <Icon
              name="sort"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Icon
              name="expand_more"
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Icon name="search_off" size={28} className="text-muted-foreground" />
          </div>
          <CardTitle className="text-lg font-bold">Nenhum relato encontrado</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2">
            Não encontramos nenhuma denúncia correspondente aos filtros selecionados. Tente alterar suas opções de busca ou filtros.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className="overflow-hidden border border-border transition-all hover:shadow-md duration-300"
            >
              <div
                className={cn(
                  "h-1 w-full transition-colors duration-500",
                  STATUS_STYLE[report.status]?.bar ?? "bg-muted"
                )}
              />
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {report.protocol}
                    </span>
                    <Badge variant={STATUS_STYLE[report.status]?.badge ?? "default"}>
                      {REPORT_STATUS_RH[report.status] ?? report.status}
                    </Badge>
                    {isStaleReport(report.status, report.created_at) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                        <Icon name="warning" size={13} />
                        Parada há {reportAgeDays(report.created_at)} dias
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                    {report.occurrence_type}
                  </CardTitle>
                  {report.department_name && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      <Icon name="apartment" size={14} />
                      {report.department_name}
                    </span>
                  )}
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <Icon name="schedule" size={14} className="text-muted-foreground" />
                    Recebido em {formatReportDay(report.created_at)}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Status: o RH acompanha o próprio trabalho; nada é enviado ao colaborador por e-mail. */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    Status
                    <select
                      value={report.status}
                      disabled={loadingId === report.id}
                      onChange={(e) => handleUpdateStatus(report.id, e.target.value as ReportStatus)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground disabled:opacity-50"
                    >
                      {REPORT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {REPORT_STATUS_RH[st]}
                        </option>
                      ))}
                    </select>
                    {loadingId === report.id && <Icon name="sync" className="animate-spin" size={14} />}
                  </label>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relato do Colaborador</p>
                  <div className="rounded-xl bg-muted/40 p-4 border border-border/40 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {report.description}
                  </div>
                </div>

                {report.attachments && report.attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <Icon name="attach_file" size={12} />
                      Anexos Enviados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {report.attachments.map((url: string, index: number) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2 text-xs font-semibold hover:bg-muted hover:border-muted-foreground/30 transition-all shadow-sm"
                        >
                          <Icon name="open_in_new" size={14} className="text-primary" />
                          <span>Arquivo Anexo {index + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

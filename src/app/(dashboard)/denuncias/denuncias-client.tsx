"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Report {
  id: string;
  company_id: string;
  protocol: string;
  occurrence_type: string;
  description: string;
  is_anonymous: boolean;
  status: "PENDING" | "RESOLVED";
  created_at: string;
  updated_at: string;
  attachments: string[] | null;
}

interface DenunciasClientProps {
  initialReports: Report[];
}

type FilterStatus = "ALL" | "PENDING" | "RESOLVED";
type SortOption = "recent" | "oldest" | "pending_first" | "resolved_first";

export function DenunciasClient({ initialReports }: DenunciasClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
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
  const resolutionRate =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Occurrence type percentages (based on all reports)
  const occurrenceCounts: Record<string, number> = {};
  reports.forEach((r) => {
    occurrenceCounts[r.occurrence_type] =
      (occurrenceCounts[r.occurrence_type] || 0) + 1;
  });

  const occurrenceStats = Object.entries(occurrenceCounts).map(([type, count]) => {
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { type, count, percentage };
  }).sort((a, b) => b.count - a.count);

  // 2. Filter and Sort Reports
  const filteredReports = reports
    .filter((report) => {
      // Status Filter
      if (filter === "PENDING" && report.status !== "PENDING") return false;
      if (filter === "RESOLVED" && report.status !== "RESOLVED") return false;

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
  const handleUpdateStatus = async (reportId: string, currentStatus: "PENDING" | "RESOLVED") => {
    const newStatus = currentStatus === "PENDING" ? "RESOLVED" : "PENDING";
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

      toast.success(
        newStatus === "RESOLVED"
          ? "Denúncia marcada como Resolvida com sucesso!"
          : "Denúncia reaberta com sucesso!"
      );
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
              Aguardando Análise
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Icon name="pending_actions" size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requerem atenção ou providências</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Casos Resolvidos
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
                let barColor = "bg-slate-500";
                let badgeVariant: "default" | "secondary" | "warning" | "destructive" | "outline" | "success" = "default";
                
                if (stat.type === "Assédio") {
                  barColor = "bg-amber-500";
                  badgeVariant = "warning";
                } else if (stat.type === "Discriminação") {
                  barColor = "bg-violet-500";
                  badgeVariant = "secondary";
                }

                return (
                  <div key={stat.type} className="rounded-xl border border-border/40 p-4 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{stat.type}</span>
                        <Badge variant={badgeVariant} className="h-5 px-1.5 text-[10px]">
                          {stat.count} {stat.count === 1 ? "caso" : "casos"}
                        </Badge>
                      </div>
                      <span className="text-lg font-black text-foreground">{stat.percentage}%</span>
                    </div>

                    <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* In case some types are missing from database but we want to show a clean placeholder layout */}
              {!occurrenceCounts["Assédio"] && (
                <div className="rounded-xl border border-border/40 p-4 bg-muted/5 opacity-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-muted-foreground">Assédio</span>
                    <span className="text-lg font-black text-muted-foreground">0%</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden" />
                </div>
              )}
              {!occurrenceCounts["Discriminação"] && (
                <div className="rounded-xl border border-border/40 p-4 bg-muted/5 opacity-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-muted-foreground">Discriminação</span>
                    <span className="text-lg font-black text-muted-foreground">0%</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden" />
                </div>
              )}
              {!occurrenceCounts["Outro"] && (
                <div className="rounded-xl border border-border/40 p-4 bg-muted/5 opacity-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-muted-foreground">Outro</span>
                    <span className="text-lg font-black text-muted-foreground">0%</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1 self-start sm:self-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all select-none",
              filter === "ALL"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all select-none flex items-center gap-1",
              filter === "PENDING"
                ? "bg-background text-amber-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pendentes
            {pendingCount > 0 && (
              <span className="bg-amber-500/15 text-amber-500 px-1.5 py-0.2 rounded-full text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("RESOLVED")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all select-none",
              filter === "RESOLVED"
                ? "bg-background text-green-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Resolvidas
          </button>
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
              <option value="pending_first">Pendentes primeiro</option>
              <option value="resolved_first">Resolvidas primeiro</option>
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
                  report.status === "PENDING" ? "bg-amber-500" : "bg-green-500"
                )}
              />
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {report.protocol}
                    </span>
                    <Badge variant={report.status === "PENDING" ? "warning" : "success"}>
                      {report.status === "PENDING" ? "Pendente" : "Resolvido"}
                    </Badge>
                    {report.is_anonymous && (
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                        Anônimo
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                    {report.occurrence_type}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <Icon name="schedule" size={14} className="text-muted-foreground" />
                    Recebido em {format(new Date(report.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Status toggle action button */}
                  <Button
                    variant={report.status === "PENDING" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-semibold text-xs transition-all duration-300 flex items-center gap-1.5",
                      report.status === "PENDING"
                        ? "bg-green-600 text-white hover:bg-green-700 hover:scale-[1.02]"
                        : "hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30"
                    )}
                    disabled={loadingId === report.id}
                    onClick={() => handleUpdateStatus(report.id, report.status)}
                  >
                    {loadingId === report.id ? (
                      <>
                        <Icon name="sync" className="animate-spin" size={14} />
                        Processando...
                      </>
                    ) : report.status === "PENDING" ? (
                      <>
                        <Icon name="check" size={14} />
                        Marcar como Resolvido
                      </>
                    ) : (
                      <>
                        <Icon name="lock_open" size={14} />
                        Reabrir Denúncia
                      </>
                    )}
                  </Button>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { toast } from "sonner";
import { activateSurvey, closeSurvey, type AccessLinksResult } from "../actions";
import { ReminderButton } from "../reminder-button";
import { showAccessLinksResult } from "../access-links-toast";

interface CollectionPanelProps {
  surveyId: string;
  status: string;
  responded: number;
  invited: number;
  responseRate: number;
  expiresAt: string | null;
  closedAt: string | null;
  canManage: boolean;
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("pt-BR");
}

export function CollectionPanel({
  surveyId,
  status,
  responded,
  invited,
  responseRate,
  expiresAt,
  closedAt,
  canManage,
}: CollectionPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"activate" | "close" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function run(
    kind: "activate" | "close",
    fn: () => Promise<{ error?: string; message?: string; emails?: AccessLinksResult }>
  ) {
    setBusy(kind);
    setError("");
    setSuccess("");
    const result = await fn();
    setBusy(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.emails) showAccessLinksResult(result.emails, "Pesquisa ativada e links enviados!");
    if (result.message) {
      setSuccess(result.message);
      return;
    }
    if (kind === "close") {
      toast("Gerando planos de ação com IA...", {
        description:
          "Pode levar alguns minutos. Você pode continuar usando o sistema normalmente — os planos aparecem em Planos de Ação quando ficarem prontos.",
        duration: 12000,
      });
    }
    router.refresh();
  }

  const isClosed = status === "CLOSED";
  const pending = Math.max(invited - responded, 0);

  // Renderização específica para Coleta Encerrada conforme novos requisitos de UX
  if (isClosed) {
    return (
      <Card className="rounded-xl border-slate-200 bg-card p-6 shadow-xs">
        <div className="space-y-4">
          {/* Topo: Identificação Clara de Status com Badge destacado e término */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Badge
                variant="outline"
                className="rounded-lg border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Icon name="check_circle" size={14} className="text-slate-600 dark:text-slate-400" />
                Coleta Encerrada
              </Badge>
              {closedAt && (
                <span className="text-xs font-semibold text-muted-foreground">
                  Encerrada em {formatDate(closedAt)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Resultados consolidados
            </span>
          </div>

          {/* Barra de Progresso e Métricas limpas sem artefatos */}
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-sm font-bold text-foreground">
                {responded} de {invited} responderam ({responseRate}% de adesão)
              </span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                {responded}/{invited}
              </span>
            </div>

            {/* Barra de progresso horizontal em largura total, limpa e sólida */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-600 dark:bg-slate-400 transition-all duration-500"
                style={{ width: `${Math.min(responseRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Estado para Coleta em Rascunho (DRAFT) ou Em Andamento (ACTIVE)
  const state =
    status === "DRAFT"
      ? {
          icon: "schedule",
          tone: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10",
          title: "Ainda não enviada",
          hint: "Os convites só saem quando você ativar a pesquisa.",
        }
      : {
          icon: "send",
          tone: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/10",
          title: "Coleta em andamento",
          hint:
            pending > 0
              ? `${pending} pessoa(s) ainda não responderam.`
              : "Todos os convidados já responderam.",
        };

  return (
    <Card className="rounded-xl border-primary/20 shadow-xs">
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${state.bg} ${state.tone}`}
            >
              <Icon name={state.icon} size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Acompanhamento da coleta
              </p>
              <p className="text-lg font-black leading-tight">{state.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{state.hint}</p>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              {status === "DRAFT" && (
                <Button
                  onClick={() => run("activate", () => activateSurvey(surveyId))}
                  disabled={busy !== null}
                  className="gap-1.5"
                >
                  <Icon name="play_arrow" size={17} />
                  {busy === "activate" ? "Ativando..." : "Ativar pesquisa"}
                </Button>
              )}

              {status === "ACTIVE" && (
                <>
                  <ReminderButton surveyId={surveyId} iconSize={17} disabled={busy !== null} />
                  <Button
                    onClick={() => run("close", () => closeSurvey(surveyId))}
                    disabled={busy !== null}
                    className="gap-1.5"
                  >
                    <Icon name="stop_circle" size={17} />
                    {busy === "close" ? "Encerrando..." : "Encerrar pesquisa"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-bold">
              {responded} de {invited} responderam ({responseRate}% de adesão)
            </span>
            <span className="font-black tabular-nums">{responseRate}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(responseRate, 100)}%` }}
            />
          </div>
          {status === "ACTIVE" && expiresAt && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Prazo para responder: {formatDate(expiresAt)}
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

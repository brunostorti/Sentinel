"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import {
  activateSurvey,
  closeSurvey,
  sendReminders,
} from "../actions";

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
  const [busy, setBusy] = useState<"activate" | "close" | "remind" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function run(
    kind: "activate" | "close" | "remind",
    fn: () => Promise<{ error?: string; message?: string }>
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
    if (result.message) {
      setSuccess(result.message);
      return;
    }
    router.refresh();
  }

  const pending = Math.max(invited - responded, 0);

  // Cada estado tem uma proxima acao obvia. O painel diz onde a coleta esta e
  // qual e essa acao, em vez de listar todos os botoes o tempo todo.
  const state =
    status === "DRAFT"
      ? {
          icon: "schedule",
          tone: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10",
          title: "Ainda não enviada",
          hint: "Os convites só saem quando você ativar a pesquisa.",
        }
      : status === "ACTIVE"
        ? {
            icon: "send",
            tone: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-500/10",
            title: "Coleta em andamento",
            hint: pending > 0
              ? `${pending} pessoa(s) ainda não responderam.`
              : "Todos os convidados já responderam.",
          }
        : {
            icon: "task_alt",
            tone: "text-muted-foreground",
            bg: "bg-muted",
            title: "Coleta encerrada",
            hint: closedAt
              ? `Encerrada em ${formatDate(closedAt)}.`
              : "Os resultados já podem ser analisados.",
          };

  return (
    <Card className="border-primary/20">
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
                  <Button
                    variant="outline"
                    onClick={() => run("remind", () => sendReminders(surveyId))}
                    disabled={busy !== null}
                    className="gap-1.5"
                  >
                    <Icon name="mail" size={17} />
                    {busy === "remind" ? "Enviando..." : "Enviar lembretes"}
                  </Button>
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
              {responded} de {invited} responderam
            </span>
            <span className="font-black tabular-nums">{responseRate}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                status === "CLOSED" ? "bg-muted-foreground/50" : "bg-primary"
              }`}
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

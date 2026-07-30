"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { SurveyContextNav } from "@/components/survey-context-nav";

interface ClosedSurvey {
  id: string;
  title: string;
  closed_at: string;
}

interface SurveyContext {
  id: string;
  title: string;
  status: string;
}

export default function CertificadosPage() {
  const [surveys, setSurveys] = useState<ClosedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [surveyContext, setSurveyContext] = useState<SurveyContext | null>(null);
  const [queryReady, setQueryReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedSurveyId(params.get("surveyId"));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;
    fetchClosedSurveys(selectedSurveyId);
  }, [queryReady, selectedSurveyId]);

  useEffect(() => {
    if (!selectedSurveyId) {
      setSurveyContext(null);
      return;
    }

    async function fetchSurveyContext() {
      const supabase = createClient();
      const { data } = await supabase
        .from("surveys")
        .select("id, title, status")
        .eq("id", selectedSurveyId)
        .maybeSingle();

      if (data) setSurveyContext(data as SurveyContext);
    }

    fetchSurveyContext();
  }, [selectedSurveyId]);

  async function fetchClosedSurveys(surveyId: string | null) {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("surveys")
      .select("id, title, closed_at")
      .eq("status", "CLOSED")
      .order("closed_at", { ascending: false });

    if (surveyId) query = query.eq("id", surveyId);

    const { data, error } = await query;

    if (!error && data) {
      setSurveys(data as ClosedSurvey[]);
    }
    setLoading(false);
  }

  async function handleGenerate(surveyId: string, title: string) {
    setError(null);
    setGeneratingId(surveyId);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao emitir certificado.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao emitir certificado.");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background p-8">
      {selectedSurveyId && (
        <div className="mb-6">
          <SurveyContextNav
            surveyId={selectedSurveyId}
            surveyTitle={surveyContext?.title ?? "Pesquisa selecionada"}
            status={surveyContext?.status}
            current="certificados"
          />
        </div>
      )}

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {selectedSurveyId ? "Certificado da Pesquisa" : "Certificados NR1"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {selectedSurveyId
              ? "Emita o certificado ligado exclusivamente a este ciclo."
              : "Emita certificados para ciclos de pesquisa fechados com participação suficiente."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/15 p-4 text-destructive">
          <Icon name="error" size={24} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Icon name="refresh" className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border p-12 text-center">
          <Icon name="verified" className="mb-4 text-muted-foreground opacity-50" size={48} />
          <h3 className="text-lg font-bold">
            {selectedSurveyId ? "Pesquisa ainda não elegível" : "Nenhuma pesquisa concluída"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Certificados só podem ser gerados para pesquisas fechadas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon name="assignment_turned_in" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-snug">{survey.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Fechada em {new Date(survey.closed_at).toLocaleDateString("pt-BR")}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                      Elegível para emissão
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <button
                  onClick={() => handleGenerate(survey.id, survey.title)}
                  disabled={generatingId === survey.id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {generatingId === survey.id ? (
                    <Icon name="refresh" size={18} className="animate-spin" />
                  ) : (
                    <Icon name="download" size={18} />
                  )}
                  Emitir PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

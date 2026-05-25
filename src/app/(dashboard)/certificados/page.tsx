"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";

interface ClosedSurvey {
  id: string;
  title: string;
  closed_at: string;
}

export default function CertificadosPage() {
  const [surveys, setSurveys] = useState<ClosedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClosedSurveys();
  }, []);

  async function fetchClosedSurveys() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("surveys")
      .select("id, title, closed_at")
      .eq("status", "CLOSED")
      .order("closed_at", { ascending: false });
    
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col p-8 bg-background">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Certificados NR1
          </h1>
          <p className="mt-2 text-muted-foreground">
            Emita certificados para ciclos de pesquisa concluídos. A emissão está sujeita a regras automatizadas (Gatekeeper).
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/15 p-4 text-destructive border border-destructive/20 flex items-center gap-3">
          <Icon name="error" size={24} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Icon name="refresh" className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : surveys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center flex flex-col items-center">
          <Icon name="verified" className="text-muted-foreground opacity-50 mb-4" size={48} />
          <h3 className="text-lg font-bold">Nenhuma pesquisa concluída</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Certificados só podem ser gerados para pesquisas fechadas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  <Icon name="assignment_turned_in" size={24} />
                </div>
                <div>
                  <h3 className="font-bold line-clamp-1">{survey.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Fechada em {new Date(survey.closed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-4 flex gap-2">
                <button
                  onClick={() => handleGenerate(survey.id, survey.title)}
                  disabled={generatingId === survey.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
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

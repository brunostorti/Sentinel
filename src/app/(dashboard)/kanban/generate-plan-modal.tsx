"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

interface Survey {
  id: string;
  title: string;
  status: string;
}

interface Department {
  id: string;
  name: string;
}

interface GeneratePlanModalProps {
  onClose: () => void;
}

export function GeneratePlanModal({ onClose }: GeneratePlanModalProps) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [surveysRes, depsRes] = await Promise.all([
          fetch("/api/action-plans/surveys"),
          fetch("/api/action-plans/departments"),
        ]);
        const surveysData = await surveysRes.json();
        const depsData = await depsRes.json();
        setSurveys(surveysData.surveys ?? []);
        setDepartments(depsData.departments ?? []);
      } catch {
        setError("Erro ao carregar dados. Tente novamente.");
      } finally {
        setFetchingData(false);
      }
    }
    fetchData();
  }, []);

  async function handleGenerate() {
    if (!selectedSurvey || !selectedDepartment) {
      setError("Selecione uma pesquisa e um setor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/action-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: selectedSurvey,
          departmentId: selectedDepartment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar plano de ação.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1500);
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">
              Gerar Plano de Ação com IA
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A IA analisará as métricas do setor e criará um plano baseado em
              práticas reais de saúde ocupacional.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Icon name="check_circle" size={32} />
            </div>
            <p className="font-semibold text-green-700">
              Plano gerado com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
              O card foi adicionado à coluna &quot;A Definir&quot; do Kanban.
            </p>
          </div>
        ) : fetchingData ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Icon name="sync" size={20} className="animate-spin" />
            <span className="text-sm">Carregando dados...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Survey select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pesquisa</label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecione uma pesquisa...</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.status === "CLOSED" ? " (Encerrada)" : " (Ativa)"}
                  </option>
                ))}
              </select>
              {surveys.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma pesquisa com respostas encontrada.
                </p>
              )}
            </div>

            {/* Department select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Setor</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecione um setor...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {departments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum setor encontrado.
                </p>
              )}
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex gap-2">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  A IA agrupará todas as dimensões em risco do setor selecionado
                  e gerará um plano de ação integrado com motivo, ações
                  concretas e resultado esperado.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleGenerate}
                disabled={loading || !selectedSurvey || !selectedDepartment}
              >
                {loading ? (
                  <>
                    <Icon name="sync" size={16} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" size={16} />
                    Gerar Plano
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

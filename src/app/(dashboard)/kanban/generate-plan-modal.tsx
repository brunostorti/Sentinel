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

const STEPS = [
  "Carregando dados da pesquisa",
  "Analisando dimensões em risco",
  "Selecionando intervenções aplicáveis",
  "Redigindo plano de ação",
];

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
  const [currentStep, setCurrentStep] = useState(0);
  const [plansCreated, setPlansCreated] = useState(0);

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
    setCurrentStep(0);

    try {
      const res = await fetch("/api/action-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: selectedSurvey, departmentId: selectedDepartment }),
      });

      if (!res.body) throw new Error("Sem resposta do servidor.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6)) as {
            step?: number;
            label?: string;
            done?: boolean;
            plans_created?: number;
            error?: string;
          };

          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }
          if (data.step) setCurrentStep(data.step);
          if (data.done) {
            setPlansCreated(data.plans_created ?? 0);
            setSuccess(true);
            setLoading(false);
            setTimeout(() => {
              onClose();
              router.push(`/planos-acao/pesquisa/${selectedSurvey}`);
            }, 2000);
          }
        }
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
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
          {!loading && (
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Icon name="close" size={20} />
            </button>
          )}
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Icon name="check_circle" size={32} />
            </div>
            <p className="font-semibold text-green-700">
              {plansCreated > 0
                ? `${plansCreated} plano${plansCreated > 1 ? "s gerados" : " gerado"} com sucesso!`
                : "Análise concluída!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {plansCreated > 0
                ? "Redirecionando para revisão — aprove os planos para adicioná-los ao Kanban."
                : "Nenhuma dimensão em risco encontrada nesta pesquisa."}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-5 py-2">
            {/* Barra de progresso */}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Etapas */}
            <div className="space-y-3">
              {STEPS.map((label, i) => {
                const stepNum = i + 1;
                const isDone = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 text-sm transition-colors ${
                      isDone
                        ? "text-foreground"
                        : isActive
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isDone ? (
                        <Icon name="check_circle" size={18} className="text-green-500" />
                      ) : isActive ? (
                        <Icon name="sync" size={18} className="animate-spin text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/25" />
                      )}
                    </div>
                    <span className={isActive ? "font-medium" : ""}>{label}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Isso pode levar até 60 segundos — não feche esta janela.
            </p>
          </div>
        ) : fetchingData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
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
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
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
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-950/40">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleGenerate}
                disabled={!selectedSurvey || !selectedDepartment}
              >
                <Icon name="auto_awesome" size={16} />
                Gerar Plano
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

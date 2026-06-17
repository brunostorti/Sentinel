"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { createSurvey } from "./actions";

interface Instrument {
  id: string;
  code: string;
  name: string;
  description: string | null;
  total_questions: number | null;
  estimated_minutes: number | null;
}

interface CreateSurveyButtonProps {
  companyId: string;
  departments: { id: string; name: string }[];
  instruments: Instrument[];
}

/** Instruments that support COPSOQ-style Short/Medium/Long versions */
const VERSIONED_INSTRUMENTS = ["copsoq_ii"];

export function CreateSurveyButton({
  companyId,
  departments,
  instruments,
}: CreateSurveyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [expiresAt, setExpiresAt] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  const hasVersions = selectedInstrument
    ? VERSIONED_INSTRUMENTS.includes(selectedInstrument.code)
    : false;

  function handleClose() {
    setOpen(false);
    setStep(1);
    setSelectedInstrument(null);
    setTitle("");
    setVersion("SHORT");
    setExpiresAt("");
    setTargetAll(true);
    setSelectedDepartments([]);
    setError("");
    setLoading(false);
  }

  function handleSelectInstrument(inst: Instrument) {
    setSelectedInstrument(inst);
    setStep(2);
    setError("");
  }

  function toggleDepartment(deptId: string) {
    setSelectedDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedInstrument) {
      setError("Selecione um instrumento.");
      return;
    }

    if (!targetAll && selectedDepartments.length === 0) {
      setError("Selecione ao menos um setor.");
      return;
    }

    setLoading(true);

    const result = await createSurvey({
      companyId,
      title: title.trim(),
      instrumentId: selectedInstrument.id,
      version: hasVersions ? version : null,
      expiresAt: expiresAt || null,
      targetDepartmentIds: targetAll ? departments.map(d => d.id) : selectedDepartments,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 rounded-lg">
        <Icon name="add" size={18} />
        Nova Pesquisa
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl animate-scale-in mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="assignment" size={18} className="text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">
              {step === 1 ? "Escolha o Instrumento" : "Nova Pesquisa"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Step 1: Instrument selection */}
        {step === 1 && (
          <div className="space-y-3 px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Selecione o questionário que será aplicado nesta pesquisa.
            </p>
            <div className="space-y-2">
              {instruments.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => handleSelectInstrument(inst)}
                  className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{inst.name}</p>
                      {inst.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {inst.description}
                        </p>
                      )}
                    </div>
                    <Icon name="chevron_right" size={18} className="mt-0.5 text-muted-foreground shrink-0" />
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    {inst.total_questions && (
                      <span className="flex items-center gap-1">
                        <Icon name="quiz" size={14} />
                        {inst.total_questions} questões
                      </span>
                    )}
                    {inst.estimated_minutes && (
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={14} />
                        ~{inst.estimated_minutes} min
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {instruments.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum instrumento disponível. Contacte o administrador.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Survey details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {/* Selected instrument badge */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Icon name="arrow_back" size={14} />
              {selectedInstrument?.name}
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Título
              </Label>
              <Input
                id="title"
                placeholder="Ex: Pesquisa Q1 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                className="rounded-lg"
              />
            </div>

            {/* Version selector — only for COPSOQ II */}
            {hasVersions && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Versão
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "SHORT", label: "Curta", desc: "41 perguntas" },
                      { key: "MEDIUM", label: "Média", desc: "76 perguntas" },
                      { key: "LONG", label: "Longa", desc: "119 perguntas" },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVersion(v.key)}
                      className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                        version === v.key
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="expires" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data de expiração
                <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="rounded-lg"
              />
            </div>

            {/* Department targeting */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Setores participantes
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetAll(true);
                    setSelectedDepartments([]);
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    targetAll
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  Todos os setores
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAll(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    !targetAll
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  Selecionar setores
                </button>
              </div>

              {!targetAll && (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {departments.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Nenhum departamento cadastrado. Adicione colaboradores primeiro.
                    </p>
                  ) : (
                    departments.map((dept) => (
                      <label
                        key={dept.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 ${
                          selectedDepartments.includes(dept.id)
                            ? "bg-primary/5 text-primary"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                        />
                        {dept.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <Icon name="error" size={16} />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 rounded-lg" disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="progress_activity" size={16} className="mr-1 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Pesquisa"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
      )}
    </>
  );
}

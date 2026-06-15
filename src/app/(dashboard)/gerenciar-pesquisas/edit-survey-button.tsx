"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { editSurvey } from "./actions";

interface Instrument {
  id: string;
  code: string;
  name: string;
  description: string | null;
  total_questions: number | null;
  estimated_minutes: number | null;
}

interface EditSurveyButtonProps {
  companyId: string;
  departments: { id: string; name: string }[];
  instruments: Instrument[];
  survey: {
    id: string;
    title: string;
    instrument_id: string;
    version: string | null;
    expires_at: string | null;
    targetDepartments: string[]; // names or ids? In page.tsx we have names, but we need IDs. I will pass IDs.
  };
}

const VERSIONED_INSTRUMENTS = ["copsoq_ii"];

export function EditSurveyButton({
  companyId,
  departments,
  instruments,
  survey,
}: EditSurveyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(survey.title);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [version, setVersion] = useState<"SHORT" | "MEDIUM" | "LONG">((survey.version as any) || "SHORT");
  const [expiresAt, setExpiresAt] = useState(
    survey.expires_at ? new Date(survey.expires_at).toISOString().split("T")[0] : ""
  );
  const [targetAll, setTargetAll] = useState(survey.targetDepartments.length === 0);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(survey.targetDepartments);
  
  // Fake state for mockup
  const [matriculaOption, setMatriculaOption] = useState<string>("manter");

  useEffect(() => {
    const inst = instruments.find((i) => i.id === survey.instrument_id);
    if (inst) setSelectedInstrument(inst);
  }, [survey, instruments]);

  const hasVersions = selectedInstrument
    ? VERSIONED_INSTRUMENTS.includes(selectedInstrument.code)
    : false;

  function handleClose() {
    setOpen(false);
    setError("");
    setLoading(false);
    // Reset state to initial props
    setTitle(survey.title);
    setVersion((survey.version as any) || "SHORT");
    setExpiresAt(survey.expires_at ? new Date(survey.expires_at).toISOString().split("T")[0] : "");
    setTargetAll(survey.targetDepartments.length === 0);
    setSelectedDepartments(survey.targetDepartments);
    const inst = instruments.find((i) => i.id === survey.instrument_id);
    if (inst) setSelectedInstrument(inst);
    setMatriculaOption("manter");
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

    const result = await editSurvey(survey.id, {
      companyId,
      title: title.trim(),
      instrumentId: selectedInstrument.id,
      version: hasVersions ? version : null,
      expiresAt: expiresAt || null,
      targetDepartmentIds: targetAll ? null : selectedDepartments,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Icon name="edit" size={16} />
        Editar
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl animate-scale-in mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon name="edit" size={18} className="text-primary" />
                </div>
                <h2 className="text-lg font-black tracking-tight">
                  Editar Pesquisa
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Título
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Instrumento
                </Label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedInstrument?.id || ""}
                    onChange={(e) => {
                      const inst = instruments.find(i => i.id === e.target.value);
                      if (inst) setSelectedInstrument(inst);
                    }}
                  >
                    {instruments.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                  <Icon name="expand_more" size={18} className="absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

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
                        <p className="text-[10px] text-muted-foreground mt-0.5">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {departments.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        Nenhum departamento cadastrado.
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

              <div className="space-y-1.5">
                <Label htmlFor="expires" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Data de expiração
                  <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="rounded-lg appearance-none w-full pr-10"
                  />
                  <Icon name="calendar_today" size={16} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* MATRÍCULA DE COLABORADORES MOCKUP */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Matrícula de Colaboradores
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setMatriculaOption("manter")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      matriculaOption === "manter"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">Manter atuais</p>
                    <p className="text-[10px] opacity-70 mt-0.5">Nenhuma alteração nos participantes.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatriculaOption("todos");
                      setTargetAll(false);
                      setSelectedDepartments(departments.map(d => d.id));
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      matriculaOption === "todos"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">Todos da empresa</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Associa todos os funcionários.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatriculaOption("setor")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      matriculaOption === "setor"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">Pelo Setor</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Associa quem é do setor alvo.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatriculaOption("custom")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      matriculaOption === "custom"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">Customizado</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Seleciona individualmente.</p>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <Icon name="error" size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border/50 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-lg"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-lg bg-[#1D5ED8] hover:bg-[#1D5ED8]/90 text-white" disabled={loading}>
                  {loading ? (
                    <>
                      <Icon name="progress_activity" size={16} className="mr-1 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

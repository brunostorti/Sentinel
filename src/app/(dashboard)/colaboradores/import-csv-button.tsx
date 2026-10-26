"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { importEmployees } from "./actions";
import { parseEmployeesCsv, type ParsedEmployee } from "@/lib/employees/parse-csv";

interface ImportCSVButtonProps {
  departments: { id: string; name: string }[];
}

export function ImportCSVButton({ departments }: ImportCSVButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [csvData, setCsvData] = useState<ParsedEmployee[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseEmployeesCsv(ev.target?.result as string);
      setCsvData(parsed);
      setError("");
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (csvData.length === 0) {
      setError("Nenhum email válido encontrado no CSV.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const result = await importEmployees({
      participants: csvData,
      departments,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(`${result.imported} colaboradores importados com sucesso.`);
    setLoading(false);
    setCsvData([]);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setCsvData([]);
    setError("");
    setSuccess("");
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5 rounded-lg">
        <Icon name="upload_file" size={18} />
        Importar CSV
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
              <Icon name="upload_file" size={18} className="text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Importar CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Arquivo CSV
            </Label>
            <p className="text-xs text-muted-foreground">
              Colunas: <code className="rounded bg-muted px-1">email,departamento,nome,terceiro,empresa_prestadora</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Só email e departamento são obrigatórios. Para terceiros, use{" "}
              <code className="rounded bg-muted px-1">sim</code> na coluna terceiro ou preencha a
              empresa prestadora.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
            />
          </div>

          {csvData.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-sm font-medium">
                {csvData.length} emails encontrados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Departamentos:{" "}
                {[...new Set(csvData.map((d) => d.department).filter(Boolean))].join(
                  ", "
                ) || "não especificados"}
              </p>
              {csvData.some((d) => d.isThirdParty) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Terceiros: {csvData.filter((d) => d.isThirdParty).length}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <Icon name="error" size={16} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">
              <Icon name="check_circle" size={16} />
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={handleClose}
            >
              Fechar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-lg"
              disabled={loading || csvData.length === 0}
            >
              {loading ? (
                <>
                  <Icon name="progress_activity" size={16} className="mr-1 animate-spin" />
                  Importando...
                </>
              ) : (
                "Importar"
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

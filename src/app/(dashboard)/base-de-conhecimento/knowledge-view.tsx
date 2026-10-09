"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import { SOURCE_TYPE_LABELS, type KbSourceType } from "@/lib/rag/config";

interface CompanyDocument {
  id: string;
  title: string;
  file_name: string | null;
  status: "processing" | "ready" | "error";
  error_message: string | null;
  chunk_count: number;
  flagged_chunk_count: number;
  created_at: string;
  uploaded_by: string | null;
  flagged: { reason: string | null; page: number | null; excerpt: string }[];
}

interface GlobalDocument {
  id: string;
  title: string;
  source_type: KbSourceType;
  publisher: string | null;
  year: number | null;
  url: string | null;
  chunk_count: number;
}

interface KnowledgeData {
  canEdit: boolean;
  searchEnabled: boolean;
  documents: CompanyDocument[];
  global: GlobalDocument[];
}

const trechos = (n: number) => `${n} ${n === 1 ? "trecho" : "trechos"}`;

const STATUS: Record<CompanyDocument["status"], { label: string; className: string }> = {
  ready: { label: "Pronto", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  processing: { label: "Processando", className: "border-amber-200 bg-amber-50 text-amber-700" },
  error: { label: "Erro", className: "border-red-200 bg-red-50 text-red-700" },
};

export function KnowledgeView() {
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/knowledge/documents");
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Falha ao carregar documentos.");
      return;
    }
    setData(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    if (title.trim()) form.append("title", title.trim());
    try {
      const res = await fetch("/api/knowledge/documents", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) toast.error(json.error ?? "Falha ao enviar.");
      else if (json.flaggedCount > 0)
        toast.warning(`Documento indexado. ${json.flaggedCount} trecho(s) ficaram fora da busca pela triagem de segurança.`);
      else toast.success(`Documento indexado em ${json.chunkCount} trechos.`);
      setFile(null);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
      void load();
    }
  }

  async function remove(doc: CompanyDocument) {
    if (!window.confirm(`Excluir "${doc.title}"? O arquivo e os trechos indexados serão apagados.`)) return;
    const res = await fetch(`/api/knowledge/documents/${doc.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "Falha ao excluir.");
    else toast.success("Documento excluído.");
    void load();
  }

  if (!data) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      {!data.searchEnabled && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A busca em documentos está desativada neste servidor (falta a chave de embeddings). O
          assistente e os planos funcionam, mas sem citar documentos.
        </Card>
      )}

      {/* ── Documentos da empresa ── */}
      <Card className="rounded-xl border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="folder_open" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Documentos da empresa</h2>
            <p className="text-sm text-muted-foreground">
              Políticas internas, atas da CIPA, PGR anterior, relatórios de clima… O assistente e o
              gerador de planos consultam esses documentos e citam o trecho usado. Só a sua empresa
              tem acesso a eles.
            </p>
          </div>
        </div>

        {data.canEdit && (
          <div className="mt-5 rounded-lg border border-dashed border-border p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="kb-file">
                  Arquivo (PDF, TXT ou MD, até 10 MB)
                </label>
                <input
                  id="kb-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="kb-title">
                  Título (opcional)
                </label>
                <Input
                  id="kb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Política de jornada e banco de horas"
                  className="mt-1"
                />
              </div>
              <Button onClick={upload} disabled={!file || uploading}>
                {uploading ? "Processando…" : "Enviar"}
              </Button>
            </div>
            <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground">
              <Icon name="privacy_tip" size={14} className="mt-px shrink-0" />
              Não envie documentos com dados pessoais (nomes, CPF, prontuários, laudos). O texto é
              enviado à OpenAI para gerar a indexação (veja Privacidade) e trechos com cara de
              instrução para IA ficam fora da busca.
            </p>
          </div>
        )}

        <div className="mt-5 divide-y divide-border">
          {data.documents.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
          )}
          {data.documents.map((doc) => (
            <div key={doc.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{doc.title}</p>
                <Badge variant="outline" className={STATUS[doc.status].className}>
                  {STATUS[doc.status].label}
                </Badge>
                {doc.status === "ready" && (
                  <span className="text-xs text-muted-foreground">{trechos(doc.chunk_count)}</span>
                )}
                {data.canEdit && (
                  <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => remove(doc)}>
                    <Icon name="delete" size={16} />
                    Excluir
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.file_name} · enviado em {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                {doc.uploaded_by ? ` por ${doc.uploaded_by}` : ""}
              </p>
              {doc.status === "error" && doc.error_message && (
                <p className="mt-1 text-xs text-red-600">{doc.error_message}</p>
              )}
              {doc.flagged.length > 0 && (
                <details className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <summary className="cursor-pointer font-semibold">
                    {doc.flagged.length === 1 ? "1 trecho ficou" : `${doc.flagged.length} trechos ficaram`} fora da busca pela triagem de segurança
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {doc.flagged.map((f, i) => (
                      <li key={i}>
                        <span className="font-semibold">Motivo: {f.reason}</span>
                        {f.page ? ` (p. ${f.page})` : ""}
                        <blockquote className="mt-0.5 border-l-2 border-amber-300 pl-2">{f.excerpt}…</blockquote>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Base global ── */}
      <Card className="rounded-xl border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="account_balance" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Base global</h2>
            <p className="text-sm text-muted-foreground">
              Normas, guias oficiais e referências científicas que valem para todas as empresas,
              mantidos pela equipe do Sentinel.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-3 text-sm">
          {data.global
            .filter((d) => d.source_type !== "referencia_cientifica")
            .map((d) => (
              <li key={d.id} className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 w-28 shrink-0 justify-center text-[10px]">
                  {SOURCE_TYPE_LABELS[d.source_type]}
                </Badge>
                <div className="min-w-0">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {d.title}
                    </a>
                  ) : (
                    <span className="font-medium">{d.title}</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {[d.publisher, d.year].filter(Boolean).join(", ")} · {trechos(d.chunk_count)}
                  </p>
                </div>
              </li>
            ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          + {data.global.filter((d) => d.source_type === "referencia_cientifica").length} referências
          científicas curadas (lista completa em Metodologia).
        </p>
      </Card>
    </div>
  );
}

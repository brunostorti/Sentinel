"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import { SOURCE_TYPE_LABELS, type KbSourceType } from "@/lib/rag/config";
import {
  DOCUMENT_USAGES,
  DOCUMENT_USAGE_LABELS,
  TRASH_RETENTION_DAYS,
  trashDaysLeft,
  type DocumentUsage,
} from "@/lib/rag/document-usage";
import { describeKinds, type PersonalDataKind } from "@/lib/privacy/personal-data";
import { ActivityLog } from "./activity-log";

interface CompanyDocument {
  id: string;
  title: string;
  file_name: string | null;
  status: "processing" | "ready" | "error";
  error_message: string | null;
  chunk_count: number;
  flagged_chunk_count: number;
  usage: DocumentUsage;
  personal_data_kinds: PersonalDataKind[];
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

interface TrashDocument {
  id: string;
  title: string;
  file_name: string | null;
  deleted_at: string;
  deleted_by: string | null;
}

interface KnowledgeData {
  canEdit: boolean;
  trash: TrashDocument[];
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
      if (!res.ok) toast.error(json.error ?? "Falha ao enviar.", { duration: 8000 });
      else if (json.personalDataWarning)
        toast.warning(
          `Documento indexado, mas encontramos ${json.personalDataWarning}. Se forem de pessoas (e não contatos institucionais), remova e envie de novo.`,
          { duration: 8000 }
        );
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

  async function changeUsage(doc: CompanyDocument, usage: DocumentUsage) {
    const res = await fetch(`/api/knowledge/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usage }),
    });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "Falha ao salvar.");
    else toast.success(`"${doc.title}": ${DOCUMENT_USAGE_LABELS[usage].toLowerCase()}.`);
    void load();
  }

  async function remove(doc: CompanyDocument) {
    if (
      !window.confirm(
        `Mover "${doc.title}" para a lixeira? Ele sai da busca na hora e pode ser restaurado por ${TRASH_RETENTION_DAYS} dias.`
      )
    )
      return;
    const res = await fetch(`/api/knowledge/documents/${doc.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "Falha ao excluir.");
    else toast.success("Documento movido para a lixeira.");
    void load();
  }

  async function restore(doc: TrashDocument) {
    const res = await fetch(`/api/knowledge/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "Falha ao restaurar.");
    else toast.success(`"${doc.title}" restaurado.`);
    void load();
  }

  async function purge(doc: TrashDocument) {
    if (!window.confirm(`Excluir "${doc.title}" de vez? O arquivo e os trechos serão apagados e não dá para desfazer.`))
      return;
    const res = await fetch(`/api/knowledge/documents/${doc.id}?permanent=1`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "Falha ao excluir.");
    else toast.success("Documento excluído definitivamente.");
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

      {/* ── Atalho: Histórico de Ações da Empresa ── */}
      <Card className="rounded-xl border-slate-200 p-6 shadow-sm bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="history_edu" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  Histórico de Ações & Intervenções Anteriores
                </h2>
                <Badge variant="outline" className="text-[11px] font-semibold border-primary/20 text-primary">
                  Memória da IA
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Iniciativas, programas e intervenções já testadas pela empresa. Usado diretamente pela IA para evitar sugerir abordagens que já falharam.
              </p>
            </div>
          </div>
          <Link
            href="/base-de-conhecimento/historico-acoes"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            <Icon name="manage_history" size={16} />
            Gerenciar histórico
          </Link>
        </div>
      </Card>

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
              Não envie documentos com dados pessoais (nomes, CPF, prontuários, laudos). Documento
              com CPF é recusado antes de qualquer processamento; e-mail e telefone geram aviso. O
              texto é enviado à OpenAI para gerar a indexação (veja Privacidade) e trechos com cara
              de instrução para IA ficam fora da busca.
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
                <a
                  href={`/api/knowledge/documents/${doc.id}`}
                  download={doc.file_name}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                  title="Clique para baixar o arquivo original"
                >
                  {doc.title}
                </a>
                <Badge variant="outline" className={STATUS[doc.status].className}>
                  {STATUS[doc.status].label}
                </Badge>
                {doc.status === "ready" && (
                  <span className="text-xs text-muted-foreground">{trechos(doc.chunk_count)}</span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <a
                    href={`/api/knowledge/documents/${doc.id}`}
                    download={doc.file_name}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Baixar arquivo"
                  >
                    <Icon name="download" size={15} />
                    Baixar
                  </a>
                  {data.canEdit && (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(doc)}>
                      <Icon name="delete" size={16} />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <a
                  href={`/api/knowledge/documents/${doc.id}`}
                  download={doc.file_name}
                  className="hover:underline hover:text-foreground"
                >
                  {doc.file_name}
                </a>
                {" "}· enviado em {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                {doc.uploaded_by ? ` por ${doc.uploaded_by}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-muted-foreground">Usado em:</span>
                {data.canEdit ? (
                  <select
                    value={doc.usage}
                    onChange={(e) => changeUsage(doc, e.target.value as DocumentUsage)}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs font-semibold"
                    aria-label={`Onde "${doc.title}" pode ser consultado`}
                  >
                    {DOCUMENT_USAGES.map((u) => (
                      <option key={u} value={u}>
                        {DOCUMENT_USAGE_LABELS[u]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant="outline">{DOCUMENT_USAGE_LABELS[doc.usage]}</Badge>
                )}
              </div>
              {doc.personal_data_kinds.length > 0 && (
                <p className="mt-2 flex gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Icon name="privacy_tip" size={14} className="mt-px shrink-0" />
                  Possíveis dados pessoais neste documento: {describeKinds(doc.personal_data_kinds)}. Se forem de
                  pessoas, e não contatos institucionais, exclua e envie uma versão sem eles.
                </p>
              )}
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

      {/* ── Lixeira ── */}
      {data.canEdit && data.trash.length > 0 && (
        <Card className="rounded-xl border-slate-200 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon name="delete" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Lixeira</h2>
              <p className="text-sm text-muted-foreground">
                Documentos excluídos ficam aqui por {TRASH_RETENTION_DAYS} dias, fora da busca, e depois são apagados de
                vez automaticamente.
              </p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-border text-sm">
            {data.trash.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Excluído em {new Date(d.deleted_at).toLocaleDateString("pt-BR")}
                    {d.deleted_by ? ` por ${d.deleted_by}` : ""} · apagado de vez em {trashDaysLeft(d.deleted_at)}{" "}
                    {trashDaysLeft(d.deleted_at) === 1 ? "dia" : "dias"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => restore(d)}>
                  <Icon name="restore_from_trash" size={16} />
                  Restaurar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => purge(d)}
                >
                  <Icon name="delete_forever" size={16} />
                  Excluir de vez
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Registro de auditoria (expande na página) ── */}
      {data.canEdit && <ActivityLog />}

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

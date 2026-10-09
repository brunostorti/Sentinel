"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import { SOURCE_TYPE_LABELS } from "@/lib/rag/config";
import type { StoredSource } from "@/lib/rag/prompt";

/**
 * Fontes citadas numa resposta da IA: número da citação, documento, seção e página.
 * Clicar abre o trecho usado e o link do documento oficial.
 */
export function MessageSources({
  sources,
  title = "Fontes",
}: {
  sources?: StoredSource[] | null;
  title?: string;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" />
        {title}
      </p>
      <ol className="mt-1.5 space-y-1.5">
        {sources.map((s) => (
          <li key={s.ref}>
            <details className="group">
              <summary className="flex cursor-pointer list-none gap-1.5 [&::-webkit-details-marker]:hidden">
                <span className="font-mono font-semibold text-primary">[{s.ref}]</span>
                <span className="text-foreground/90">
                  <strong>{s.title}</strong>
                  {s.section ? ` — ${s.section}` : ""}
                  {s.pages ? `, ${s.pages}` : ""}
                  {s.sourceType === "documento_empresa" && (
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {SOURCE_TYPE_LABELS.documento_empresa}
                    </span>
                  )}
                </span>
              </summary>
              <blockquote className="ml-6 mt-1 whitespace-pre-wrap border-l-2 border-border pl-2 text-muted-foreground">
                {s.excerpt}
              </blockquote>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-6 mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Abrir documento
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}

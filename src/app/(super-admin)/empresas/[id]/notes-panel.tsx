"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { addCompanyNote, deleteCompanyNote } from "./actions";

export interface CompanyNote {
  id: string;
  body: string;
  created_at: string;
  author: string | null;
}

export function NotesPanel({ companyId, notes }: { companyId: string; notes: CompanyNote[] }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await addCompanyNote(companyId, text);
      if (res.error) return setError(res.error);
      setText("");
    });
  }

  function remove(noteId: string) {
    if (!window.confirm("Apagar esta nota?")) return;
    startTransition(async () => {
      const res = await deleteCompanyNote(companyId, noteId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-bold">Notas da equipe</h2>
      <p className="text-sm text-muted-foreground">
        Combinados, próximos passos e contatos do cliente. Só a equipe Sentinel vê.
      </p>
      <form onSubmit={add} className="mt-4 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex.: Reunião com o jurídico marcada para 12/11. Aguardando a chave de IA."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
          <Button type="submit" disabled={pending || !text.trim()}>
            <Icon name="note_add" size={16} />
            Adicionar nota
          </Button>
        </div>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {notes.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nenhuma nota ainda.</li>}
        {notes.map((n) => (
          <li key={n.id} className="group py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{n.author ?? "Equipe"}</span>
              <span>{new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              <button
                type="button"
                onClick={() => remove(n.id)}
                disabled={pending}
                className="ml-auto opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Apagar nota"
              >
                <Icon name="delete" size={16} />
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

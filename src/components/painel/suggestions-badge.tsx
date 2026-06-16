"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ProfileEvent {
  id: string;
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  source_context: string | null;
  confidence: "high" | "medium" | "low" | null;
  created_at: string;
}

export function SuggestionsBadge() {
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function load() {
    try {
      const res = await fetch("/api/profile/events?status=pending");
      const data = (await res.json()) as { events: ProfileEvent[] };
      setEvents(data.events ?? []);
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/events?status=pending");
        const json = (await res.json()) as { events: ProfileEvent[] };
        if (!cancelled) setEvents(json.events ?? []);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function display(n: number): string {
    return n > 9 ? "9+" : String(n);
  }

  function decide(id: string, action: "accept" | "reject") {
    startTransition(async () => {
      const res = await fetch(`/api/profile/events/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        toast.error("Falha.");
        return;
      }
      toast.success(action === "accept" ? "Aplicado." : "Rejeitado.");
      await load();
    });
  }

  function rejectAll() {
    if (!confirm("Rejeitar todas as sugestões pendentes?")) return;
    startTransition(async () => {
      const res = await fetch("/api/profile/events/reject-all", {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Falha.");
        return;
      }
      toast.success("Todas rejeitadas.");
      await load();
    });
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        ⚙ {display(events.length)} sugestões
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setOpen(false)}
        >
          <Card
            className="h-full w-full max-w-md overflow-y-auto rounded-l-2xl rounded-r-none p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg">Sugestões da IA</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              A IA detectou atualizações para o perfil. Nada é aplicado sem você
              aprovar.
            </p>

            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma sugestão pendente.
              </p>
            )}

            {events.map((e) => (
              <Card key={e.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs">{e.field_path}</p>
                  {e.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {e.confidence}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">De:</p>
                    <p className="font-medium break-words">
                      {JSON.stringify(e.old_value) ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Para:</p>
                    <p className="font-medium break-words">
                      {JSON.stringify(e.new_value) ?? "—"}
                    </p>
                  </div>
                </div>
                {e.source_context && (
                  <p className="text-xs italic text-muted-foreground">
                    Origem: {e.source_context}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide(e.id, "accept")}
                    disabled={isPending}
                  >
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(e.id, "reject")}
                    disabled={isPending}
                  >
                    Rejeitar
                  </Button>
                </div>
              </Card>
            ))}

            {events.length > 1 && (
              <div className="border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rejectAll}
                  disabled={isPending}
                >
                  Rejeitar todas
                </Button>
                <Link
                  href="/configuracoes/perfil"
                  className="ml-2 text-xs underline text-muted-foreground"
                >
                  ir para o perfil
                </Link>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

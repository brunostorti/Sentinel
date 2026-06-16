"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { toast } from "sonner";
import { sendChatStream } from "@/lib/chat-stream";

/**
 * Painel de chat embutido na página de detalhe do plano.
 * Diferente do PlanChatDrawer (que é flutuante): este vive numa coluna fixa.
 */

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const SUGGESTIONS = [
  "Por que esse fornecedor?",
  "E se eu cortar 30% do orçamento?",
  "Tem alternativa interna sem fornecedor externo?",
  "Acelera o roadmap pra 60 dias",
];

export function PlanChatPanel({ planId }: { planId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tempIdRef = useRef(0);

  useEffect(() => {
    fetch(`/api/chat/threads?kind=plan&resource_id=${planId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [planId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isPending]);

  function send(content: string) {
    if (!content.trim() || isPending) return;
    const tempId = tempIdRef.current++;
    const userMsg: Message = {
      id: `tmp-${tempId}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const assistantId = `tmp-${tempId}-r`;
    setMessages((m) => [
      ...m,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      },
    ]);
    setInput("");

    startTransition(async () => {
      await sendChatStream(
        { kind: "plan", resource_id: planId, content },
        {
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          onDone: () => {},
          onError: (msg) => {
            toast.error(msg);
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          },
        }
      );
    });
  }

  const showWelcome = loaded && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header do painel */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon name="forum" size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">Discutir com a IA</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Pergunte, refine, simule cenários
          </p>
        </div>
      </div>

      {/* Histórico */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {!loaded && (
          <p className="text-xs text-muted-foreground">Carregando histórico...</p>
        )}

        {showWelcome && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Faça perguntas sobre <strong>este plano</strong>. A IA conhece o
              perfil da empresa, o orçamento, restrições e histórico.
            </p>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Sugestões
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.content || (
                  <span className="inline-flex gap-1 text-muted-foreground">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:0.15s]">·</span>
                    <span className="animate-bounce [animation-delay:0.3s]">·</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card p-3">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-2">
          <textarea
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            rows={2}
            placeholder="Pergunte sobre este plano..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            disabled={isPending}
          />
          <Button
            size="sm"
            onClick={() => send(input)}
            disabled={isPending || !input.trim()}
            className="shrink-0"
          >
            <Icon name="arrow_upward" size={14} />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha
        </p>
      </div>
    </div>
  );
}

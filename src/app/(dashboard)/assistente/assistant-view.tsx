"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { sendChatStream } from "@/lib/chat-stream";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const SUGGESTIONS = [
  "Como estamos comparados ao último ciclo?",
  "Quais ações tiveram mais impacto até agora?",
  "Monte um resumo executivo para a diretoria.",
];

export function AssistantView({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat/threads?kind=company")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isPending]);

  function send(content: string) {
    if (!content.trim() || isPending) return;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const assistantId = `temp-${Date.now()}-r`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);
    setInput("");

    startTransition(async () => {
      await sendChatStream(
        { kind: "company", content },
        {
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          onDone: () => {
            /* streaming concluído */
          },
          onError: (msg) => {
            toast.error(msg);
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          },
        }
      );
    });
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col gap-4">
      <Card className="flex-1 overflow-y-auto p-6" ref={scrollRef as never}>
        {loadingHistory && (
          <p className="text-sm text-muted-foreground">Carregando histórico...</p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Olá, <strong>{userName}</strong>. Sou o assistente da sua empresa. Posso
              ajudar com:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>visão geral das dimensões e tendências</li>
              <li>comparar ações tomadas e medir impacto</li>
              <li>simular cenários (cortes/expansão de orçamento)</li>
              <li>resumo executivo para a diretoria</li>
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.15s]">·</span>
                  <span className="animate-bounce [animation-delay:0.3s]">·</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {messages.length === 0 && !loadingHistory && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <Card className="p-3">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none bg-transparent text-sm outline-none"
            rows={2}
            placeholder="Pergunte qualquer coisa..."
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
          <Button onClick={() => send(input)} disabled={isPending || !input.trim()}>
            ↑ Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
}

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

export function PlanChatDrawer({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      fetch(`/api/chat/threads?kind=plan&resource_id=${planId}`)
        .then((r) => r.json())
        .then((d) => {
          setMessages(d.messages ?? []);
          setLoaded(true);
        });
    }
  }, [open, loaded, planId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isPending]);

  function send() {
    if (!input.trim() || isPending) return;
    const content = input;
    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const assistantId = `tmp-${Date.now()}-r`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
      >
        💬 Perguntar sobre este plano
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 top-0 z-40 w-96 border-l border-border bg-card shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-bold">Sobre este plano</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {!loaded && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          {loaded && messages.length === 0 && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Pergunte sobre este plano:</p>
              <ul className="list-inside list-disc">
                <li>por que esse fornecedor?</li>
                <li>alternativa sem app?</li>
                <li>e se cortar 30% do budget?</li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
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
                <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  pensando...
                </div>
              </div>
            )}
          </div>
        </div>

        <Card className="m-3 p-2">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none bg-transparent text-sm outline-none"
              rows={2}
              placeholder="Pergunte sobre este plano..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isPending}
            />
            <Button size="sm" onClick={send} disabled={isPending || !input.trim()}>
              ↑
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

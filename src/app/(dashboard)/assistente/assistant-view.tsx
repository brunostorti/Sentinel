"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Send, Bot, User, Trash2, Mic, MicOff, Paperclip, ChevronUp, Bot as BotIcon, X } from "lucide-react";
import { sendChatStream } from "@/lib/chat-stream";
import { ModelSelectorModal } from "@/components/chat/model-selector-modal";
import { MessageSources } from "@/components/chat/message-sources";
import type { StoredSource } from "@/lib/rag/prompt";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  metadata?: { sources?: StoredSource[] } | null;
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
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tempIdRef = useRef(0);

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
    if ((!content.trim() && attachments.length === 0) || isPending) return;

    const tempId = tempIdRef.current++;
    const userMsg: Message = {
      id: `tmp-${tempId}`,
      role: "user",
      content: attachments.length > 0 ? `${content}\n\n[Anexo incluído]` : content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const currentAttachments = [...attachments];
    setAttachments([]); // clear attachments early for UX

    // Async: a transição (isPending) dura até a resposta terminar de chegar.
    startTransition(async () => {
      let assistantText = "";
      await sendChatStream(
        { kind: "company", content, attachments: currentAttachments },
        {
          onDelta: (chunk) => {
            assistantText += chunk;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last.id === `tmp-ast-${tempId}`) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: assistantText },
                ];
              }
              return [
                ...prev,
                {
                  id: `tmp-ast-${tempId}`,
                  role: "assistant",
                  content: assistantText,
                  created_at: new Date().toISOString(),
                },
              ];
            });
          },
          onSources: (sources) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === `tmp-ast-${tempId}` ? { ...m, metadata: { sources } } : m))
            );
          },
          onDone: () => {},
          onError: (err) => {
            toast.error(err);
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          },
        }
      );
    });
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error("Por enquanto, apenas imagens são suportadas para análise.");
        continue;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachments(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const mockEvent = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setInput(prev => {
        return currentTranscript;
      });
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  return (
    <div 
      className={`flex h-[calc(100vh-220px)] flex-col gap-4 transition-colors ${isDragging ? 'bg-primary/5 rounded-xl border-2 border-dashed border-primary' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Assistente de Saúde Ocupacional
        </h2>
      </div>
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
              <div className="max-w-[85%]">
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && <MessageSources sources={m.metadata?.sources} />}
              </div>
            </div>
          ))}
          {isPending && messages[messages.length - 1]?.role === "user" && (
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
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 px-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group rounded-md border overflow-hidden w-16 h-16">
                <img src={att} alt="Attachment" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            accept="image/*"
          />
          <textarea
            className="flex-1 resize-none bg-transparent text-sm outline-none ml-2"
            rows={2}
            placeholder="Pergunte qualquer coisa... (Arraste uma imagem para anexar)"
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleListening}
              className={isListening ? "text-red-500 animate-pulse border-red-500" : ""}
              title="Falar"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button onClick={() => send(input)} disabled={isPending || (!input.trim() && attachments.length === 0)}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ModelSelectorModal />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Anexar Imagem">
            <Paperclip className="w-4 h-4 text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Anexar Arquivo</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

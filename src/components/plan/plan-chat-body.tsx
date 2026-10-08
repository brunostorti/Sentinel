"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { toast } from "sonner";
import { Mic, MicOff, Paperclip, Bot as BotIcon, X } from "lucide-react";
import { sendChatStream } from "@/lib/chat-stream";
import { ModelSelectorModal } from "@/components/chat/model-selector-modal";

/**
 * Corpo do chat do plano (histórico + sugestões + composer), sem header.
 * Compartilhado pelo drawer flutuante. A API/stream é inalterada.
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

export function PlanChatBody({ planId }: { planId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    startTransition(() => {
      let assistantText = "";
      sendChatStream(
        { kind: "plan", resource_id: planId, content, attachments: currentAttachments },
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
      setInput(currentTranscript);
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

  const showWelcome = loaded && messages.length === 0;

  return (
    <div 
      className={`flex h-full flex-col overflow-hidden transition-colors ${isDragging ? 'bg-primary/5 border-2 border-dashed border-primary' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Histórico */}
      <div
        className="flex-1 overflow-y-auto p-4 md:p-6"
        ref={scrollRef as never}
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

      <div className="shrink-0 border-t border-border bg-card p-3">
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 px-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group rounded-md border overflow-hidden w-12 h-12">
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
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            accept="image/*"
          />
          <textarea
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 py-1.5"
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
            variant="ghost"
            size="sm"
            onClick={toggleListening}
            className={`px-2 shrink-0 h-8 ${isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
            title="Falar"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            onClick={() => send(input)}
            disabled={isPending || (!input.trim() && attachments.length === 0)}
            className="shrink-0 h-8 w-8 p-0"
          >
            <Icon name="arrow_upward" size={14} />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModelSelectorModal />
            <Button variant="outline" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => fileInputRef.current?.click()} title="Anexar Imagem">
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            Enter envia · Shift+Enter quebra linha (Arraste imagens)
          </p>
        </div>
      </div>
    </div>
  );
}

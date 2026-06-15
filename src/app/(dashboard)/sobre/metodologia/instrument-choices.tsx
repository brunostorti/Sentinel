"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import questionsData from "./questions-data.json";

interface QuestionDef {
  text: string;
  short?: boolean;
  medium?: boolean;
  long?: boolean;
}

const typedQuestionsData: Record<string, QuestionDef[]> = questionsData as any;

const INSTRUMENTS = [
  {
    id: "copsoq-ii",
    title: "COPSOQ II",
    description: "Copenhagen Psychosocial Questionnaire. Validação brasileira mais utilizada. Avalia amplo espectro de riscos.",
    versions: [
      {
        name: "Versão Curta",
        count: typedQuestionsData["copsoq-ii"]?.filter(q => q.short).length || 41,
        recommended: false,
        desc: "Ideal para empresas pequenas ou pulsos frequentes.",
        questions: typedQuestionsData["copsoq-ii"]?.filter(q => q.short),
      },
      {
        name: "Versão Média",
        count: typedQuestionsData["copsoq-ii"]?.filter(q => q.medium).length || 76,
        recommended: true,
        desc: "Avaliação padrão e completa da organização.",
        questions: typedQuestionsData["copsoq-ii"]?.filter(q => q.medium),
      },
      {
        name: "Versão Longa",
        count: typedQuestionsData["copsoq-ii"]?.filter(q => q.long).length || 119,
        recommended: false,
        desc: "Uso acadêmico ou investigações profundas.",
        questions: typedQuestionsData["copsoq-ii"]?.filter(q => q.long),
      },
    ],
  },
  {
    id: "copsoq-iii",
    title: "COPSOQ III",
    description: "Versão mais atual do COPSOQ, com atualizações de dimensões internacionais. Menos benchmarking nacional disponível.",
    versions: [
      {
        name: "Core Version",
        count: typedQuestionsData["copsoq-iii"]?.length || 85,
        recommended: true,
        desc: "O modelo padrão da nova versão internacional.",
        questions: typedQuestionsData["copsoq-iii"],
      },
    ],
  },
  {
    id: "jss",
    title: "JSS (Job Stress Survey)",
    description: "Mede especificamente o nível de estresse ocupacional e a severidade percebida de eventos no trabalho.",
    versions: [
      {
        name: "Versão Única",
        count: typedQuestionsData["jss"]?.length || 30,
        recommended: false,
        desc: "Instrumento focado apenas em estresse, não clima geral.",
        questions: typedQuestionsData["jss"],
      },
    ],
  },
  {
    id: "olbi",
    title: "OLBI (Oldenburg Burnout)",
    description: "Instrumento de rápida aplicação exclusivo para detecção de exaustão e desengajamento (Burnout).",
    versions: [
      {
        name: "Versão Única",
        count: typedQuestionsData["olbi"]?.length || 16,
        recommended: false,
        desc: "Excelente para avaliar burnout de forma independente.",
        questions: typedQuestionsData["olbi"],
      },
    ],
  },
];

export function InstrumentChoices() {
  const [openInstrument, setOpenInstrument] = useState<string | null>("copsoq-ii");
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-2">
        <h2 className="text-xl font-black tracking-tight text-foreground">Escolhas de Pesquisa</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore os instrumentos psicossociais disponíveis e visualize todas as perguntas de cada versão.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {INSTRUMENTS.map((inst) => {
          const isOpen = openInstrument === inst.id;
          return (
            <Card
              key={inst.id}
              className={`overflow-hidden transition-colors ${
                isOpen ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/50"
              }`}
            >
              <button
                className="flex w-full items-start justify-between p-5 text-left"
                onClick={() => setOpenInstrument(isOpen ? null : inst.id)}
              >
                <div>
                  <h3 className="text-lg font-bold text-foreground">{inst.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2 pr-4">{inst.description}</p>
                </div>
                <Icon
                  name={isOpen ? "expand_less" : "expand_more"}
                  size={24}
                  className="text-muted-foreground transition-transform shrink-0"
                />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/10 p-5 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Versões Disponíveis</h4>
                  
                  {inst.versions.map((v, i) => {
                    const versionKey = `${inst.id}-${i}`;
                    const isVersionOpen = openVersion === versionKey;
                    
                    return (
                      <div key={i} className="rounded-xl border border-border bg-card p-4 relative shadow-sm">
                        {v.recommended && (
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                            Recomendado
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-1 mt-1">
                          <span className="font-bold text-foreground text-sm">{v.name} ({v.count} perguntas)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">{v.desc}</p>
                        
                        <button 
                          onClick={() => setOpenVersion(isVersionOpen ? null : versionKey)}
                          className="w-full flex items-center justify-between bg-muted/30 p-3 rounded-lg text-xs font-semibold text-foreground/80 border border-border/50 hover:bg-muted/50 transition-colors mb-4"
                        >
                          Ver perguntas ({v.count})
                          <Icon name={isVersionOpen ? "expand_less" : "expand_more"} size={16} />
                        </button>

                        {isVersionOpen && (
                          <div className="mb-4 bg-background p-3 rounded-lg text-xs text-muted-foreground border border-border max-h-60 overflow-y-auto">
                            <ul className="space-y-2">
                              {v.questions?.map((q, j) => (
                                <li key={j} className="flex gap-2 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                                  <span className="opacity-50 font-mono">{j + 1}.</span>
                                  <span>{q.text}</span>
                                </li>
                              ))}
                              {(!v.questions || v.questions.length === 0) && (
                                <li className="italic">Lista de perguntas não encontrada.</li>
                              )}
                            </ul>
                          </div>
                        )}

                        <Link 
                          href="/gerenciar-pesquisas" 
                          className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                            v.recommended 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                              : "bg-card border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          Escolher pesquisa
                          <Icon name="arrow_forward" size={16} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

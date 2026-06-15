"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

const INSTRUMENTS = [
  {
    id: "copsoq-ii",
    title: "COPSOQ II",
    description: "Copenhagen Psychosocial Questionnaire. Validação brasileira mais utilizada. Avalia amplo espectro de riscos.",
    versions: [
      {
        name: "Versão Curta (41)",
        recommended: false,
        desc: "Ideal para empresas pequenas ou pulsos frequentes.",
        samples: [
          "O seu trabalho exige que você trabalhe muito rápido?",
          "Você se sente esgotado emocionalmente?",
        ],
      },
      {
        name: "Versão Média (76)",
        recommended: true,
        desc: "Avaliação padrão e completa da organização.",
        samples: [
          "Você tem influência sobre a quantidade de trabalho a fazer?",
          "Seu chefe imediato resolve bem os conflitos?",
        ],
      },
      {
        name: "Versão Longa (119)",
        recommended: false,
        desc: "Uso acadêmico ou investigações profundas.",
        samples: [
          "Você tem que esconder os seus sentimentos no trabalho?",
          "Você sofreu ameaças de violência no seu local de trabalho?",
        ],
      },
    ],
  },
  {
    id: "copsoq-iii",
    title: "COPSOQ III",
    description: "Versão mais atual do COPSOQ, com atualizações de dimensões internacionais. Menos benchmarking nacional disponível.",
    versions: [
      {
        name: "Core Version (85)",
        recommended: true,
        desc: "O modelo padrão da nova versão internacional.",
        samples: [
          "Existem exigências contraditórias no seu trabalho?",
          "Você confia na gestão da empresa?",
        ],
      },
    ],
  },
  {
    id: "jss",
    title: "JSS (Job Stress Survey)",
    description: "Mede especificamente o nível de estresse ocupacional e a severidade percebida de eventos no trabalho.",
    versions: [
      {
        name: "Única (30)",
        recommended: false,
        desc: "Instrumento focado apenas em estresse, não clima geral.",
        samples: [
          "Falta de oportunidade de crescimento?",
          "Lidar com clientes ou público difíceis?",
        ],
      },
    ],
  },
  {
    id: "olbi",
    title: "OLBI (Oldenburg Burnout)",
    description: "Instrumento de rápida aplicação exclusivo para detecção de exaustão e desengajamento (Burnout).",
    versions: [
      {
        name: "Única (16)",
        recommended: false,
        desc: "Excelente para avaliar burnout de forma independente.",
        samples: [
          "Ultimamente, tendo a pensar menos no meu trabalho durante o tempo livre?",
          "Sinto-me exausto após o dia de trabalho?",
        ],
      },
    ],
  },
];

export function InstrumentChoices() {
  const [openInstrument, setOpenInstrument] = useState<string | null>("copsoq-ii");

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-2">
        <h2 className="text-xl font-black tracking-tight text-foreground">Escolhas de Pesquisa</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore os instrumentos psicossociais disponíveis e visualize as perguntas de cada versão.
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
                  
                  {inst.versions.map((v, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 relative overflow-hidden shadow-sm">
                      {v.recommended && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                          Recomendado
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-2 mt-1">
                        <span className="font-bold text-foreground text-sm">{v.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">{v.desc}</p>
                      
                      <div className="mb-4 bg-muted/30 p-3 rounded-lg text-xs italic text-muted-foreground space-y-2 border border-border/50">
                        <p className="font-semibold not-italic text-foreground/70">Amostra de Perguntas:</p>
                        {v.samples.map((q, j) => (
                          <p key={j} className="flex gap-2">
                            <span className="opacity-50">•</span>
                            <span>{q}</span>
                          </p>
                        ))}
                      </div>

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
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

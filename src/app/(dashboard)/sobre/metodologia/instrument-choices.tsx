"use client"; 

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import questionsData from "./questions-data.json";

interface QuestionDef {
  text: string;
  short?: boolean;
  medium?: boolean;
  long?: boolean;
}

const typedQuestionsData = questionsData as Record<string, QuestionDef[]>;

const INSTRUMENTS_CARDS = [
  {
    id: "copsoq-ii",
    title: "COPSOQ II — Versão Portuguesa",
    subtitle: "119 questões • ~25 minutos",
    icon: "assignment",
    color: "bg-blue-100 text-blue-600",
    desc: "Copenhagen Psychosocial Questionnaire II. Validação portuguesa (N=4.162 trabalhadores). Avalia fatores psicossociais no trabalho em 35 dimensões.",
    objetivo: "Médias e grandes corporações que buscam conformidade robusta com regulação de saúde mental (Lei 14.831) e avaliação profunda.",
    metricas: [
      "Exigências quantitativas, cognitivas e emocionais",
      "Qualidade de liderança e apoio social",
      "Interface trabalho-família e satisfação laboral",
      "Burnout, stress e comportamentos ofensivos"
    ],
    versions: [
      { name: "Curta", data: typedQuestionsData["copsoq-ii"]?.filter(q => q.short) },
      { name: "Média", data: typedQuestionsData["copsoq-ii"]?.filter(q => q.medium) },
      { name: "Longa", data: typedQuestionsData["copsoq-ii"]?.filter(q => q.long) },
    ]
  },
  {
    id: "jss",
    title: "JSS — Job Satisfaction Survey",
    subtitle: "36 questões • ~10 minutos",
    icon: "emoji_events",
    color: "bg-purple-100 text-purple-600",
    desc: "Job Satisfaction Survey de Paul Spector (1985). Tradução e validação brasileira pela UNICAMP (2013). Avalia a satisfação no trabalho em 9 facetas com 36 itens.",
    objetivo: "Organizações focadas em clima, satisfação interna de equipes, retenção de talentos e relacionamento de liderança.",
    metricas: [
      "Satisfação com supervisão e colegas",
      "Recompensas, benefícios e plano de carreira",
      "Comunicação interna e natureza do trabalho"
    ],
    versions: [
      { name: "Única", data: typedQuestionsData["jss"] }
    ]
  },
  {
    id: "olbi",
    title: "OLBI — Oldenburg Burnout Inventory",
    subtitle: "16 questões • ~5 minutos",
    icon: "warning",
    color: "bg-green-100 text-green-600",
    desc: "Inventário de Burnout de Oldenburg (Demerouti et al., 2003). Avalia duas dimensões centrais do burnout: exaustão e desengajamento. 16 itens com escala Likert de 4 pontos (concordância).",
    objetivo: "Equipes de alta performance, startups, setores de atendimento ao cliente ou áreas de alto risco de esgotamento profissional.",
    metricas: [
      "Exaustão física e fadiga cognitiva",
      "Distanciamento em relação às tarefas",
      "Nível de desengajamento"
    ],
    versions: [
      { name: "Única", data: typedQuestionsData["olbi"] }
    ]
  },
  {
    id: "copsoq-iii",
    title: "COPSOQ III — Versão Média",
    subtitle: "70 questões • ~20 minutos",
    icon: "science",
    color: "bg-orange-100 text-orange-600",
    desc: "Copenhagen Psychosocial Questionnaire, 3a edição (Burr et al., 2019). Versão Média com 70 itens em 26 escalas. Avalia fatores psicossociais no trabalho com escores de 0-100. Escala Work Engagement (UWES) excluída por exigir licença comercial.",
    objetivo: "Empresas modernas focadas em engajamento, novas dinâmicas laborais e mapeamento de riscos psicossociais atualizado.",
    metricas: [
      "Demandas emocionais e ritmo de trabalho",
      "Clareza e conflito de papéis",
      "Capital social e confiança organizacional",
      "Sintomas de estresse, burnout e depressão"
    ],
    versions: [
      { name: "Core Version", data: typedQuestionsData["copsoq-iii"] }
    ]
  }
];

export function InstrumentChoices() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<typeof INSTRUMENTS_CARDS[0] | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  const handleOpenModal = (inst: typeof INSTRUMENTS_CARDS[0]) => {
    setSelectedInstrument(inst);
    setActiveTab(inst.versions[0].name);
    setModalOpen(true);
  };

  const activeQuestions = selectedInstrument?.versions.find(v => v.name === activeTab)?.data || [];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {INSTRUMENTS_CARDS.map((inst) => (
          <Card key={inst.id} className="border border-border/50 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${inst.color}`}>
                <Icon name={inst.icon} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">{inst.title}</h3>
                <p className="text-sm text-muted-foreground font-medium">{inst.subtitle}</p>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground mt-4 leading-relaxed flex-1">
              {inst.desc}
            </p>

            <div className="bg-muted/30 p-4 rounded-xl mt-5 border border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                <span className="text-red-500">🎯</span> Objetivo & Perfil Comercial:
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {inst.objetivo}
              </p>
            </div>

            <div className="mt-5 px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                <span className="text-red-500">☑️</span> Métricas e Dimensões principais:
              </div>
              <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-1.5 leading-relaxed marker:text-muted-foreground/50">
                {inst.metricas.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex gap-3">
              <button 
                onClick={() => handleOpenModal(inst)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-[13px] font-bold text-foreground hover:bg-muted transition-colors"
              >
                <Icon name="visibility" size={16} />
                Ver Perguntas
              </button>
              <Link 
                href="/gerenciar-pesquisas"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1D5ED8] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1D5ED8]/90 transition-colors shadow-sm"
              >
                Usar Pesquisa
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-xl font-black">
              {selectedInstrument?.title} — Perguntas
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize a lista completa de perguntas do instrumento.
            </p>
          </DialogHeader>

          {selectedInstrument && selectedInstrument.versions.length > 1 && (
            <div className="px-6 pt-4 flex gap-2 border-b border-border">
              {selectedInstrument.versions.map((v) => (
                <button
                  key={v.name}
                  onClick={() => setActiveTab(v.name)}
                  className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 ${
                    activeTab === v.name
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-3">
              {activeQuestions?.map((q, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-muted-foreground text-sm mt-0.5 min-w-[24px]">{idx + 1}.</span>
                  <p className="text-sm text-foreground/90 leading-relaxed">{q.text}</p>
                </div>
              ))}
              {(!activeQuestions || activeQuestions.length === 0) && (
                <p className="text-sm text-muted-foreground italic">Lista de perguntas não encontrada.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

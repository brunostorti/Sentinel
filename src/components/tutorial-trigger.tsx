"use client";

import { useState } from "react";
import { TutorialModal, TutorialSlide } from "./tutorial-modal";
import { Icon } from "./icon";

/**
 * O tour segue o ciclo de vida real do produto, não a ordem da sidebar: o
 * primeiro slide explica o que é um ciclo, porque sem isso os slides de
 * Painel, Planos e Kanban parecem módulos soltos — e eles só existem dentro
 * de um ciclo.
 */
export const tutorialSlides: TutorialSlide[] = [
  {
    title: "Tudo acontece dentro de um ciclo",
    description:
      "Um ciclo reúne a pesquisa base, as ações que nasceram dela e as reavaliações que comprovam a melhoria. Painel, Planos de Ação e Kanban são etapas de dentro do ciclo, não módulos separados.",
    icon: "account_tree",
  },
  {
    title: "1. Colaboradores",
    description:
      "Cadastre e organize a sua equipe por setor. É esse cadastro que define quem recebe o convite quando o ciclo começa.",
    icon: "group",
  },
  {
    title: "2. Metodologia",
    description:
      "Entenda o COPSOQ II e decida entre as versões curta, média ou longa antes de abrir o ciclo — a escolha define quantas perguntas a equipe responde.",
    icon: "menu_book",
  },
  {
    title: "3. Abrir o ciclo",
    description:
      "Em Ciclos, crie o ciclo com a sua pesquisa base: escolha o instrumento, os setores participantes e a data de encerramento.",
    icon: "add_circle",
  },
  {
    title: "4. Coleta anônima",
    description:
      "Cada colaborador recebe um link individual por e-mail. Você acompanha a adesão em tempo real e pode disparar lembretes, mas nunca vê quem respondeu o quê.",
    icon: "lock",
  },
  {
    title: "5. Painel da pesquisa",
    description:
      "Com a coleta encerrada, o Painel mostra o semáforo de risco por dimensão e por setor. Setores com menos de 5 respostas ficam ocultos para preservar o anonimato.",
    icon: "monitoring",
  },
  {
    title: "6. Planos de Ação",
    description:
      "A IA transforma cada risco encontrado em ações sugeridas, com justificativa e responsável. Você revisa e aprova o que de fato entra no plano.",
    icon: "lightbulb",
  },
  {
    title: "7. Kanban",
    description:
      "As ações aprovadas viram tarefas com responsável e prazo. O quadro acumula o histórico do ciclo inteiro, então nada se perde entre uma rodada e outra.",
    icon: "view_kanban",
  },
  {
    title: "8. Reavaliação",
    description:
      "Depois de agir, crie uma reavaliação dentro do mesmo ciclo. O Sentinel compara antes e depois e mostra, dimensão por dimensão, se o risco realmente caiu.",
    icon: "repeat",
  },
  {
    title: "9. Conformidade e certificado",
    description:
      "O ciclo acompanha as evidências exigidas pela NR-1 em três etapas: identificar o risco, agir sobre ele e comprovar o resultado. Cumpridas, liberam o certificado e os relatórios da Lei 14.831.",
    icon: "verified",
  },
  {
    title: "10. Apoio contínuo",
    description:
      "Tire dúvidas sobre as análises com o Assistente IA, ajuste dados da empresa em Configurações e acompanhe relatos confidenciais no Canal de Denúncias.",
    icon: "smart_toy",
  },
];

interface TutorialTriggerProps {
  variant?: "header" | "hero";
}

export function TutorialTrigger({ variant = "header" }: TutorialTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "header" ? (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          title="Passo a passo"
        >
          <Icon name="route" size={20} />
          Passo a passo
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Icon name="play_circle" size={20} filled />
          Como funciona
        </button>
      )}
      
      <TutorialModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        slides={tutorialSlides}
      />
    </>
  );
}

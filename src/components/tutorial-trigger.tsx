"use client";

import { useState } from "react";
import { TutorialModal, TutorialSlide } from "./tutorial-modal";
import { Icon } from "./icon";

export const tutorialSlides: TutorialSlide[] = [
  {
    title: "1. Colaboradores",
    description: "Cadastre e organize a sua equipe para direcionar as pesquisas corretamente por setor.",
    icon: "group",
  },
  {
    title: "2. Metodologia",
    description: "Acesse a aba Metodologia para escolher o instrumento de pesquisa ideal para a sua empresa.",
    icon: "menu_book",
  },
  {
    title: "3. Pesquisas",
    description: "Vá para a aba Pesquisas para criar novos ciclos de avaliação e disparar convites para os colaboradores.",
    icon: "assignment",
  },
  {
    title: "4. Painel Analítico",
    description: "No Painel, você tem uma visão geral dos resultados e identifica os principais riscos mapeados.",
    icon: "monitoring",
  },
  {
    title: "5. Planos de Ação",
    description: "Acesse os Planos de Ação para visualizar e editar as sugestões automáticas geradas pela IA.",
    icon: "lightbulb",
  },
  {
    title: "6. Kanban",
    description: "Gerencie a execução dos planos no Kanban, acompanhando o progresso das ações contínuas.",
    icon: "view_kanban",
  },
  {
    title: "7. Configurações",
    description: "Utilize as Configurações para ajustar os dados e as preferências da sua organização.",
    icon: "settings",
  },
  {
    title: "8. Assistente IA",
    description: "Caso tenha alguma dúvida sobre as análises, converse com o Assistente IA para receber suporte.",
    icon: "smart_toy",
  },
  {
    title: "9. Canal de Denúncias",
    description: "Acompanhe os relatos enviados de forma confidencial e gerencie as investigações necessárias.",
    icon: "gavel",
  },
  {
    title: "10. Certificados e Relatórios",
    description: "Por fim, emita certificados e gere relatórios de conformidade com a Lei 14.831.",
    icon: "verified",
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

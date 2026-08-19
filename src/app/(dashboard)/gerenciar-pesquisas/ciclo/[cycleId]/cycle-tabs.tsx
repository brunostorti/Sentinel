"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";

interface CycleTab {
  id: string;
  label: string;
  hint: string;
  icon: string;
  content: ReactNode;
}

/**
 * Abas de conteudo, nao de navegacao: trocam o que aparece embaixo sem sair
 * da pagina. O visual segue o padrao classico de aba (sublinhado deslizante,
 * sem borda de card, sem elevacao no hover) de proposito — os cards de
 * "Entrar nesta pesquisa" acima SAO links de verdade, entao as duas coisas
 * precisam parecer visualmente diferentes uma da outra.
 */
export function CycleTabs({ tabs }: { tabs: CycleTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`group relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-2 text-left transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                name={tab.icon}
                size={17}
                className={isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"}
              />
              <span>
                <span className="block text-sm font-black leading-tight">
                  {tab.label}
                </span>
                <span className="block text-[11px] font-normal leading-tight text-muted-foreground">
                  {tab.hint}
                </span>
              </span>

              {/* Trilho sempre visivel na base da aba; o segmento colorido
                  "desliza" para a aba ativa. É o sinal mais forte de que isto
                  é um controle de conteúdo local, não um link de saída. */}
              <span
                className={`absolute inset-x-1 -bottom-px h-0.5 rounded-full transition-colors ${
                  isActive ? "bg-primary" : "bg-transparent group-hover:bg-border"
                }`}
              />
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          className={active === tab.id ? "animate-fade-in-up block" : "hidden"}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

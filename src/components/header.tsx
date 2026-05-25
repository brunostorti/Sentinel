"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TutorialModal } from "@/components/tutorial-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { SuggestionsBadge } from "@/components/painel/suggestions-badge";

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/entrar";
  }

  const tutorialSlides = [
    {
      title: "Bem-vindo ao Painel",
      description: "Aqui você tem uma visão geral do bem-estar da sua empresa. Use os cartões de semáforo para identificar riscos.",
      icon: "dashboard",
    },
    {
      title: "Pesquisas e Coleta",
      description: "Em 'Pesquisas', você pode criar novos ciclos de avaliação e disparar convites para os colaboradores.",
      icon: "assignment",
    },
    {
      title: "Kanban e Planos",
      description: "O sistema gera planos de ação automáticos com IA. Gerencie as tarefas no Kanban para melhorar o clima organizacional.",
      icon: "view_kanban",
    },
    {
      title: "Canal de Denúncias",
      description: "Acesse os relatos confidenciais enviados pelos funcionários para investigar casos de assédio ou discriminação.",
      icon: "gavel",
    },
  ];

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 px-8">
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
        slides={tutorialSlides} 
      />
      
      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-4 py-2.5 transition-colors focus-within:bg-muted focus-within:ring-2 focus-within:ring-primary/20">
        <Icon name="search" size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar..."
          className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* AI Suggestions */}
        <SuggestionsBadge />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Help button */}
        <button 
          onClick={() => setIsTutorialOpen(true)}
          className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          title="Tutorial de Uso"
        >
          <Icon name="help" size={20} />
        </button>

        {/* Notifications bell */}
        <button className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Icon name="notifications" size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl p-1.5 outline-none transition-colors hover:bg-accent">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{userName}</p>
              <p className="text-[11px] text-muted-foreground">{userEmail}</p>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-primary/10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2.5">
              <Icon name="person" size={16} />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5">
              <Icon name="settings" size={16} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2.5 text-destructive focus:text-destructive">
              <Icon name="logout" size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

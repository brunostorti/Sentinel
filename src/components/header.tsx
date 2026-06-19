"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TutorialTrigger } from "@/components/tutorial-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { SuggestionsBadge } from "@/components/painel/suggestions-badge";
import { ROUTES } from "@/lib/constants";

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const router = useRouter();

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

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-end border-b border-border/50 px-8">

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* AI Suggestions */}
        <SuggestionsBadge />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Help button */}
        <TutorialTrigger variant="header" />

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
            <DropdownMenuItem
              onClick={() => router.push(ROUTES.DASHBOARD.SETTINGS)}
              className="gap-2.5"
            >
              <Icon name="person" size={16} />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/configuracoes")}
              className="gap-2.5"
            >
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

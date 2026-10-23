"use client";

import { Icon } from "@/components/icon";
import { clearUserDrafts } from "@/lib/survey/draft";

/**
 * Sair da conta. Antes, apaga deste aparelho os rascunhos de pesquisa do usuário
 * (respostas parciais não ficam para a próxima pessoa num computador compartilhado).
 */
export function SignOutButton({ userId }: { userId: string }) {
  return (
    <form action="/api/auth/signout" method="POST" onSubmit={() => clearUserDrafts(userId)}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon name="logout" size={18} />
        Sair
      </button>
    </form>
  );
}

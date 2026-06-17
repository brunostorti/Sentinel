"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Icon } from "@/components/icon";
import { PlanChatBody } from "./plan-chat-body";

/**
 * Botão flutuante (FAB) que abre o chat do plano num drawer lateral,
 * liberando a largura total para o conteúdo do plano.
 */
export function PlanChatDrawer({ planId }: { planId: string }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            aria-label="Discutir com a IA"
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
          />
        }
      >
        <Icon name="forum" size={20} />
        <span className="hidden sm:inline">Discutir com a IA</span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg!"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="forum" size={16} className="text-primary" />
            </span>
            Discutir com a IA
          </SheetTitle>
          <SheetDescription>Pergunte, refine, simule cenários</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <PlanChatBody planId={planId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

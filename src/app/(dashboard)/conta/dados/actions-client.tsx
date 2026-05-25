"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import { toast } from "sonner";

export function AccountDataActions() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        toast.error("Falha ao gerar export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentinel-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export baixado.");
    });
  }

  function handleDelete() {
    if (confirmText !== "EXCLUIR MEUS DADOS") {
      toast.error('Digite exatamente "EXCLUIR MEUS DADOS" para confirmar.');
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "EXCLUIR MEUS DADOS" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Falha na exclusão.");
        return;
      }
      toast.success("Conta excluída. Você será deslogado.");
      setTimeout(() => {
        window.location.href = "/entrar";
      }, 2000);
    });
  }

  return (
    <>
      {/* Export */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon name="download" size={18} className="text-primary" />
              <h2 className="text-sm font-bold">Exportar meus dados</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Baixa um arquivo JSON com todos os dados pessoais armazenados sobre
              você. Direito de acesso e portabilidade (Art. 18 LGPD).
            </p>
          </div>
          <Button onClick={handleExport} disabled={isPending}>
            <Icon name="download" size={14} />
            Baixar JSON
          </Button>
        </div>
      </Card>

      {/* Delete */}
      <Card className="border-red-200 p-5 dark:border-red-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon name="delete_forever" size={18} className="text-red-600" />
              <h2 className="text-sm font-bold">Excluir minha conta</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Remove permanentemente sua conta e anonimiza suas interações.
              Ação irreversível. Direito à eliminação (Art. 18, VI LGPD).
            </p>
          </div>
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
          >
            <Icon name="delete_forever" size={14} />
            Excluir conta
          </Button>
        </div>
      </Card>

      {/* Modal de confirmação */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Icon name="warning" size={20} className="text-red-600" />
              <h2 className="text-lg font-black">Confirmar exclusão</h2>
            </div>
            <p className="mt-2 text-sm">
              Você está prestes a excluir permanentemente sua conta. Esta ação
              é <strong>irreversível</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Para confirmar, digite <code className="font-mono font-bold">EXCLUIR MEUS DADOS</code> abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR MEUS DADOS"
              className="mt-3 font-mono"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isPending || confirmText !== "EXCLUIR MEUS DADOS"}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isPending ? "Excluindo..." : "Excluir agora"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

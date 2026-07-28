"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { toast } from "sonner";

interface AccountDataActionsProps {
  initialName: string;
  email: string;
}

export function AccountDataActions({
  initialName,
  email,
}: AccountDataActionsProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (normalizedName.length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: normalizedName }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao atualizar perfil.");
        return;
      }

      setName(data.user?.name ?? normalizedName);
      toast.success("Perfil atualizado.");
      router.refresh();
    });
  }

  function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não confere com a nova senha.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao alterar senha.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso.");
    });
  }

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
      <Card className="p-5">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Icon name="person" size={18} className="text-primary" />
                <h2 className="text-sm font-bold">Dados do perfil</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualize o nome exibido no menu, cabeçalho e registros
                administrativos da plataforma.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Nome</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">E-mail de acesso</Label>
              <Input id="account-email" value={email} disabled />
              <p className="text-[11px] text-muted-foreground">
                O e-mail é o identificador de login. Para evitar inconsistência
                entre autenticação e auditoria, ele não é alterado diretamente
                por esta tela.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <Icon name="save" size={14} />
              {isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Icon name="lock_reset" size={18} className="text-primary" />
                <h2 className="text-sm font-bold">Alterar senha</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirme a senha atual antes de definir uma nova senha de acesso.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isPending}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              Use pelo menos 8 caracteres. A senha é armazenada e validada pelo
              Supabase Auth, não pelo Sentinel diretamente.
            </p>
            <Button type="submit" disabled={isPending}>
              <Icon name="key" size={14} />
              {isPending ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </Card>

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
          <Button type="button" onClick={handleExport} disabled={isPending}>
            <Icon name="download" size={14} />
            Baixar JSON
          </Button>
        </div>
      </Card>

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
            type="button"
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
              Você está prestes a excluir permanentemente sua conta. Esta ação é{" "}
              <strong>irreversível</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Para confirmar, digite{" "}
              <code className="font-mono font-bold">EXCLUIR MEUS DADOS</code>{" "}
              abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR MEUS DADOS"
              className="mt-3 font-mono"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
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

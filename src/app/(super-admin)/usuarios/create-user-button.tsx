"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { createUser } from "./actions";

interface CreateUserButtonProps {
  companies: { id: string; name: string }[];
}

export function CreateUserButton({ companies }: CreateUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "HR" | "MANAGER">("HR");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      companyId,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(`Convite enviado para ${email}.`);
    setName("");
    setEmail("");
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Icon name="person_add" size={18} />
        Novo Usuário
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              {companies.length === 0 ? (
                <p className="text-sm text-destructive">
                  Crie uma empresa antes de adicionar usuários.
                </p>
              ) : (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Papel</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "ADMIN", label: "Admin" },
                    { key: "HR", label: "RH" },
                    { key: "MANAGER", label: "Gestor" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={`rounded-lg border p-2 text-center text-sm transition-colors ${
                      role === r.key
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setOpen(false);
                  setError("");
                  setSuccess("");
                }}
              >
                Fechar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || companies.length === 0}
              >
                {loading ? "Criando..." : "Criar e Enviar Convite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

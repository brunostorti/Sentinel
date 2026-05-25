import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { CreateUserButton } from "./create-user-button";

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  SUPER_ADMIN: { label: "Super Admin", variant: "default" },
  ADMIN: { label: "Admin", variant: "secondary" },
  HR: { label: "RH", variant: "secondary" },
  MANAGER: { label: "Gestor", variant: "outline" },
};

export default async function UsersPage() {
  const supabase = await createClient();

  // Fetch all companies for the create form
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  // Fetch all platform users
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, created_at, company_id, companies(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Usuários</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie os usuários da plataforma (RH, Admin, Gestores).
          </p>
        </div>
        <CreateUserButton companies={companies ?? []} />
      </div>

      {(users ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Icon
            name="group"
            size={48}
            className="mx-auto text-muted-foreground"
          />
          <p className="mt-3 text-muted-foreground">
            Nenhum usuário cadastrado. Crie o primeiro usuário para uma empresa.
          </p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {(users ?? []).length} usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Nome</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Papel</th>
                    <th className="pb-3 pr-4">Empresa</th>
                    <th className="pb-3">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(users ?? []).map((u) => {
                    const roleConfig = ROLE_LABELS[u.role] ?? {
                      label: u.role,
                      variant: "outline" as const,
                    };
                    const companyName =
                      (u.companies as unknown as { name: string })?.name ?? "—";
                    return (
                      <tr key={u.id}>
                        <td className="py-3 pr-4 font-medium">{u.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={roleConfig.variant}>
                            {roleConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {companyName}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

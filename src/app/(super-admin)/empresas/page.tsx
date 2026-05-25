import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { CreateCompanyButton } from "./create-company-button";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  // Get user counts per company
  const companyIds = (companies ?? []).map((c) => c.id);
  const userCounts: Record<string, number> = {};

  if (companyIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("company_id")
      .in("company_id", companyIds);

    for (const u of users ?? []) {
      userCounts[u.company_id] = (userCounts[u.company_id] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Empresas</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie as empresas cadastradas na plataforma.
          </p>
        </div>
        <CreateCompanyButton />
      </div>

      {(companies ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Icon
            name="business"
            size={48}
            className="mx-auto text-muted-foreground"
          />
          <p className="mt-3 text-muted-foreground">
            Nenhuma empresa cadastrada.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(companies ?? []).map((company) => (
            <Card key={company.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">
                  {company.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {company.cnpj && (
                    <span className="flex items-center gap-1">
                      <Icon name="badge" size={14} />
                      {company.cnpj}
                    </span>
                  )}
                  {company.industry && (
                    <span className="flex items-center gap-1">
                      <Icon name="category" size={14} />
                      {company.industry}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Icon name="group" size={14} />
                    {userCounts[company.id] ?? 0} usuários
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Criada em{" "}
                  {new Date(company.created_at).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

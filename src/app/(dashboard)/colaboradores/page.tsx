import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { ImportCSVButton } from "./import-csv-button";
import { AddEmployeeButton } from "./add-employee-button";
import { EmployeeTable } from "./employee-table";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) redirect("/entrar");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", userData.company_id)
    .order("name");

  const { data: employees } = await supabase
    .from("employees")
    .select(
      `
      id,
      email,
      name,
      department_id,
      created_at,
      departments (name)
    `
    )
    .eq("company_id", userData.company_id)
    .order("name", { ascending: true, nullsFirst: false });

  const employeeList = (employees ?? []) as unknown as {
    id: string;
    email: string;
    name: string | null;
    department_id: string;
    created_at: string;
    departments: { name: string } | null;
  }[];

  const canManage = userData.role === "HR" || userData.role === "ADMIN";

  const totalEmployees = employeeList.length;
  const departmentCount = new Set(employeeList.map((e) => e.department_id)).size;
  const now = new Date();
  const thisMonth = employeeList.filter((e) => {
    const d = new Date(e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    {
      value: totalEmployees,
      label: "Total de Colaboradores",
      icon: "group",
      iconBg: "bg-gradient-to-br from-blue-500/15 to-blue-600/10",
      iconColor: "text-blue-600",
    },
    {
      value: departmentCount,
      label: "Departamentos",
      icon: "apartment",
      iconBg: "bg-gradient-to-br from-violet-500/15 to-purple-600/10",
      iconColor: "text-violet-600",
    },
    {
      value: thisMonth,
      label: "Adicionados este mês",
      icon: "person_add",
      iconBg: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Colaboradores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie o cadastro de colaboradores da empresa.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <ImportCSVButton departments={departments ?? []} />
            <AddEmployeeButton departments={departments ?? []} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stagger-children grid gap-4 w-full grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-hover overflow-hidden w-full shadow-sm border border-border/80 bg-card">
            <CardContent className="flex items-center gap-4 py-5.5 px-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <Icon name={stat.icon} size={22} className={stat.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-black tracking-tight text-foreground tabular-nums">{stat.value}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-0.5 truncate">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee table */}
      {employeeList.length === 0 ? (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="group" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            Nenhum colaborador cadastrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe um CSV ou adicione manualmente.
          </p>
        </div>
      ) : (
        <Card className="animate-fade-in-up overflow-hidden">
          <CardHeader>
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Cadastro de Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              employees={employeeList}
              departments={departments ?? []}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

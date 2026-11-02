import { redirect } from "next/navigation";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { getDepartmentOptions } from "@/lib/privacy/departments";
import { allowedMonths } from "@/lib/leave-cases/constants";
import { todayInBrazil } from "@/lib/reports/alerts";
import { LeaveForm } from "./leave-form";

export default async function LeavePage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar?next=/afastamento");

  // Só setores com 5+ colaboradores podem ser informados (regra dos 5).
  const departmentsByCompany: Record<string, { id: string; name: string }[]> = {};
  for (const c of employee.companies) {
    const options = await getDepartmentOptions(c.id);
    departmentsByCompany[c.id] = options.filter((d) => d.eligible).map(({ id, name }) => ({ id, name }));
  }

  return (
    <LeaveForm
      companies={employee.companies}
      departmentsByCompany={departmentsByCompany}
      months={allowedMonths(todayInBrazil())}
    />
  );
}

import { redirect } from "next/navigation";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { getDepartmentOptions } from "@/lib/privacy/departments";
import { ReportForm } from "./report-form";

export default async function NewReportPage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar?next=/denuncia/nova");
  // Sem empresa no cadastro não há para onde enviar: a aba explica o motivo.
  if (employee.companies.length === 0) redirect("/denuncia");

  // Só setores com 5+ colaboradores podem ser informados (regra dos 5).
  const departmentsByCompany: Record<string, { id: string; name: string }[]> = {};
  for (const c of employee.companies) {
    const options = await getDepartmentOptions(c.id);
    departmentsByCompany[c.id] = options.filter((d) => d.eligible).map(({ id, name }) => ({ id, name }));
  }

  return (
    <ReportForm
      userId={employee.userId}
      companies={employee.companies}
      departmentsByCompany={departmentsByCompany}
    />
  );
}

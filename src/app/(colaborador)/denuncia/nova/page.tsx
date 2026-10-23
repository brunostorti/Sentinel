import { redirect } from "next/navigation";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { ReportForm } from "./report-form";

export default async function NewReportPage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar?next=/denuncia/nova");
  // Sem empresa no cadastro não há para onde enviar: a aba explica o motivo.
  if (employee.companies.length === 0) redirect("/denuncia");

  return <ReportForm userId={employee.userId} companies={employee.companies} />;
}

import { redirect } from "next/navigation";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { ReportHome } from "./report-home";

export default async function ReportChannelPage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar?next=/denuncia");

  return <ReportHome userId={employee.userId} canReport={employee.companies.length > 0} />;
}

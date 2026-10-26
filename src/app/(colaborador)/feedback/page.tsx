import { redirect } from "next/navigation";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { getFeedbackOptions } from "@/lib/feedback/options";
import { FeedbackForm } from "./feedback-form";

export default async function FeedbackPage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar?next=/feedback");

  const options = await getFeedbackOptions(employee.email);
  return <FeedbackForm options={options} />;
}

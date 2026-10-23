import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { EmployeeTabs } from "./_components/employee-tabs";
import { SignOutButton } from "./_components/sign-out-button";

/** Área do colaborador: cabeçalho com empresa e Sair, e abas Pesquisas / Canal de denúncia. */
export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar");

  const companyLabel =
    employee.companies.length === 1
      ? employee.companies[0].name
      : employee.companies.length > 1
        ? `${employee.companies.length} empresas`
        : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/pesquisas" className="flex min-w-0 items-center gap-2">
            <BrandLogo size="sm" priority />
            <span className="text-base font-black tracking-tight">Sentinel</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {companyLabel && (
              <span className="hidden truncate text-xs font-medium text-muted-foreground sm:block sm:max-w-[16rem]">
                {companyLabel}
              </span>
            )}
            <SignOutButton userId={employee.userId} />
          </div>
        </div>
        <EmployeeTabs />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

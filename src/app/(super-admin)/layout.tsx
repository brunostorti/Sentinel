import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("name, email, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData || userData.role !== "SUPER_ADMIN") redirect("/painel");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="SUPER_ADMIN" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userData.name} userEmail={userData.email} />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

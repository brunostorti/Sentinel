import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeView } from "./knowledge-view";

export default async function BaseDeConhecimentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">Base de conhecimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos que o assistente e o gerador de planos consultam — e citam — ao responder.
        </p>
      </div>
      <KnowledgeView />
    </div>
  );
}

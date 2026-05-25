import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default async function DenunciasAdminPage() {
  const supabase = await createClient();
  
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData?.company_id) redirect("/painel");

  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .eq("company_id", userData.company_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Canal de Denúncias</h1>
        <p className="text-muted-foreground">
          Gerencie e investigue os relatos recebidos através do canal seguro.
        </p>
      </div>

      {!reports || reports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Icon name="inbox" size={32} className="text-muted-foreground" />
          </div>
          <CardTitle>Nenhuma denúncia recebida</CardTitle>
          <CardDescription>
            Os relatos enviados pelos colaboradores aparecerão aqui.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden border-border transition-shadow hover:shadow-md">
              <div className={cn(
                "h-1 w-full",
                report.status === "PENDING" ? "bg-amber-500" : "bg-green-500"
              )} />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {report.protocol}
                    </span>
                    <Badge variant={report.status === "PENDING" ? "warning" : "success"}>
                      {report.status === "PENDING" ? "Pendente" : "Resolvido"}
                    </Badge>
                    {report.is_anonymous && (
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                        Anônimo
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{report.occurrence_type}</CardTitle>
                  <CardDescription>
                    Recebido em {format(new Date(report.created_at), "PPP", { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Icon 
                    name={report.occurrence_type === "Assédio" ? "warning" : "error"} 
                    className={report.status === "PENDING" ? "text-amber-500" : "text-muted-foreground"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-4 border border-border/50 text-sm leading-relaxed">
                  {report.description}
                </div>

                {report.attachments && report.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anexos</p>
                    <div className="flex flex-wrap gap-2">
                      {report.attachments.map((url: string, index: number) => (
                        <a 
                          key={index} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          <Icon name="attach_file" size={14} />
                          Arquivo {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

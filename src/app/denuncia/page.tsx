import Link from "next/link";
import { Icon } from "@/components/icon";

export default function DenunciaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Icon name="shield" size={48} filled className="text-primary" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Canal de Denúncias
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Um espaço seguro e sigiloso para relatar condutas inapropriadas, 
            assegurando a integridade e o bem-estar de todos.
          </p>
        </div>

        <div className="grid gap-4 pt-8 sm:grid-cols-2">
          <Link href="/denuncia/nova" className="group">
            <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
                <Icon name="add" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl">Nova Denúncia</h3>
                <p className="text-sm text-muted-foreground">
                  Relate um novo acontecimento de forma segura.
                </p>
              </div>
            </div>
          </Link>

          <Link href="/denuncia/acompanhar" className="group">
            <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground group-hover:scale-110 transition-transform">
                <Icon name="search" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl">Acompanhar</h3>
                <p className="text-sm text-muted-foreground">
                  Verifique o status de um relato já enviado.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-12 text-sm text-muted-foreground">
          <p>
            Todas as informações são tratadas com o mais alto nível de confidencialidade.
            <br />
            Plataforma Sentinel — Protegendo o que importa.
          </p>
        </div>
      </div>
    </div>
  );
}

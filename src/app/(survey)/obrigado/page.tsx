import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";

export default function ThankYouPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="space-y-4 py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <Icon
              name="check_circle"
              size={40}
              filled
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Obrigado pela sua participação!
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Suas respostas foram registradas de forma anônima e vão ajudar a melhorar o
            ambiente de trabalho na sua empresa.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Icon name="lock" className="text-primary" />
          <div>
            <p className="text-sm font-medium">Anonimato garantido</p>
            <p className="text-xs text-muted-foreground">
              Nenhum dado pessoal ficou ligado às suas respostas, e a empresa só vê resultados
              de grupos com pelo menos 5 pessoas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Icon name="verified" className="text-primary" />
          <div>
            <p className="text-sm font-medium">Questionário validado</p>
            <p className="text-xs text-muted-foreground">
              Instrumento científico validado para avaliar riscos psicossociais no trabalho.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/pesquisas"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Icon name="home" size={18} />
          Voltar ao início
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

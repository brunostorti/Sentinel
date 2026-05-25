import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";

export default function ThankYouPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Icon
              name="check_circle"
              size={40}
              filled
              className="text-green-600"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Obrigado pela sua participação!
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Suas respostas foram registradas de forma completamente anônima e
            ajudarão a melhorar o ambiente de trabalho da sua empresa.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Icon name="lock" className="text-primary" />
          <div>
            <p className="text-sm font-medium">Anonimato garantido</p>
            <p className="text-xs text-muted-foreground">
              Nenhum dado pessoal foi vinculado às suas respostas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Icon name="verified" className="text-primary" />
          <div>
            <p className="text-sm font-medium">Conformidade COPSOQ II</p>
            <p className="text-xs text-muted-foreground">
              Instrumento validado internacionalmente para avaliação
              psicossocial.
            </p>
          </div>
        </div>
      </div>

      <form action="/api/auth/signout" method="POST" className="text-center">
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

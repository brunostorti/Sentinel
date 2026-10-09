import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import {
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  RECOMMENDED_MODELS,
  modelLabel,
  type ModelOption,
  type ModelTier,
} from "@/lib/ai/models";

const TIER_LABELS: Record<ModelTier, string> = {
  qualidade: "Melhor qualidade",
  equilibrado: "Equilibrado",
  economico: "Econômico",
};

const usd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });

function formatPrice(price: ModelOption["priceUsdPerMTok"]): string {
  if (!price) return "Gratuito";
  return `${usd.format(price.input)} / ${usd.format(price.output)}`;
}

export default function ModelosIaPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Sobre o Sentinel
        </p>
        <h1 className="text-3xl font-black tracking-tight">Modelos de IA</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          O Sentinel usa inteligência artificial em duas tarefas, e cada empresa
          escolhe o modelo de cada uma no botão <strong>Modelos de IA</strong> do
          assistente. Esta página explica as diferenças para ajudar na escolha.
        </p>
      </div>

      {/* As duas tarefas */}
      <section>
        <h2 className="text-xl font-black">Duas tarefas, necessidades diferentes</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TaskCard
            icon="assignment"
            title="Gerar planos de ação"
            body="Acontece poucas vezes (ao encerrar uma pesquisa) e o resultado orienta decisões da empresa. Usa sempre Claude, GPT ou Gemini; vale escolher um modelo de melhor qualidade, já que o custo por geração é baixo porque ela é rara."
            current={`Padrão: ${modelLabel(DEFAULT_MODELS.plan)}`}
          />
          <TaskCard
            icon="chat"
            title="Conversar no chat do assistente"
            body="Acontece a cada mensagem. Um modelo rápido e econômico costuma bastar para tirar dúvidas, resumir resultados e ajustar planos."
            current={`Padrão: ${modelLabel(DEFAULT_MODELS.chat)}`}
          />
        </div>
      </section>

      {/* Comparativo */}
      <section>
        <h2 className="text-xl font-black">Modelos recomendados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preço de referência em dólares por 1 milhão de tokens (entrada / saída),
          conforme as páginas oficiais dos provedores. Um token equivale a cerca
          de ¾ de uma palavra.
        </p>
        <Card className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Modelo</th>
                <th className="px-4 py-3 text-left font-bold">Provedor</th>
                <th className="px-4 py-3 text-left font-bold">Perfil</th>
                <th className="px-4 py-3 text-left font-bold">Preço</th>
                <th className="px-4 py-3 text-left font-bold">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECOMMENDED_MODELS.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-medium">
                    {m.name}
                    {m.preview && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        preview
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{PROVIDER_LABELS[m.provider]}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {TIER_LABELS[m.tier]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {formatPrice(m.priceUsdPerMTok)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-muted-foreground">
          Lançou um modelo novo? Escolha <strong>Outro modelo</strong> no seletor:
          com a chave cadastrada, o Sentinel consulta o provedor e lista todos os
          modelos que ela pode usar.
        </p>
      </section>

      {/* Chaves e custos */}
      <section>
        <h2 className="text-xl font-black">Chaves de API e custos</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <TaskCard
            icon="key"
            title="Chave da própria empresa"
            body="Para usar Claude, GPT ou Gemini, a empresa cadastra a chave do provedor. O consumo é cobrado diretamente na conta dela, sem intermediação do Sentinel."
          />
          <TaskCard
            icon="lock"
            title="Chaves protegidas"
            body="Cada chave é testada no provedor antes de ser salva, fica guardada só no servidor e nunca é exibida por inteiro — nem para quem a cadastrou."
          />
          <TaskCard
            icon="sync_alt"
            title="Sem chave: chat na Mauá, planos aguardam"
            body="No chat, se o provedor escolhido não tiver chave, o Sentinel usa a IA da Mauá automaticamente. Já a geração de planos exige a chave do provedor escolhido: sem ela, o Sentinel avisa antes de começar."
          />
        </div>
      </section>

      {/* Mauá */}
      <section>
        <h2 className="text-xl font-black">IA da Mauá</h2>
        <Card className="mt-3 p-5 text-sm leading-relaxed text-muted-foreground">
          Modelo aberto (Gemma 3 27B) servido pela infraestrutura do Instituto
          Mauá de Tecnologia (Barô). É gratuito e é o padrão do chat. Por ser uma
          infraestrutura acadêmica com limite de uso compartilhado, pode ficar
          mais lento em horários de pico. Não é usado para gerar planos: por
          escrever mais devagar, não concluiria um conjunto completo de planos
          dentro do tempo máximo de processamento.
        </Card>
      </section>

      {/* Footer cross-links */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href="/sobre/privacidade"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🔒 Privacidade
        </Link>
        <Link
          href="/sobre/seguranca"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🛡 Segurança
        </Link>
      </div>
    </div>
  );
}

function TaskCard({
  icon,
  title,
  body,
  current,
}: {
  icon: string;
  title: string;
  body: string;
  current?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="text-primary" />
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {current && <p className="mt-3 text-xs font-medium text-primary">{current}</p>}
    </Card>
  );
}

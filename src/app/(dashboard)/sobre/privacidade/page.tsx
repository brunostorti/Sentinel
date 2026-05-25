import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

export default function PrivacidadePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Sobre o Sentinel
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          Privacidade e proteção de dados (LGPD)
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Política de privacidade do Sentinel em conformidade com a Lei
          13.709/2018 (LGPD). Esta página descreve quais dados tratamos, com
          quais bases legais, por quanto tempo, com quem compartilhamos e os
          direitos do titular.
        </p>
      </div>

      {/* Bases legais */}
      <section>
        <h2 className="text-xl font-black">Bases legais de tratamento (Art. 7º LGPD)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tratamos dados pessoais em três bases legais principais:
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <BasisCard
            icon="how_to_reg"
            title="Consentimento"
            body="Para coleta de respostas individuais em pesquisas psicossociais. O colaborador autoriza explicitamente ao acessar via magic link e clicar em &quot;Concordo&quot;."
          />
          <BasisCard
            icon="rule"
            title="Cumprimento de obrigação legal"
            body="Para inventário de riscos psicossociais exigido pela Portaria MTE 1.419/2024 (NR-1). O empregador tem dever legal de mapear riscos."
          />
          <BasisCard
            icon="business"
            title="Legítimo interesse"
            body="Para dados agregados/anonimizados usados em painéis e geração de planos de ação. Sempre com proteção rigorosa por dimensão (n≥5 para divulgar score)."
          />
        </div>
      </section>

      {/* Dados que coletamos */}
      <section>
        <h2 className="text-xl font-black">Dados que coletamos</h2>
        <Card className="mt-3 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Tipo</th>
                <th className="px-4 py-3 text-left font-bold">Categoria LGPD</th>
                <th className="px-4 py-3 text-left font-bold">Finalidade</th>
                <th className="px-4 py-3 text-left font-bold">Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              <DataRow
                tipo="Email e nome do HR/Admin"
                categoria="Identificação"
                finalidade="Autenticação e atribuição de ações"
                retencao="Enquanto vigente o contrato"
              />
              <DataRow
                tipo="Email do colaborador participante"
                categoria="Identificação"
                finalidade="Envio de magic link para responder pesquisa"
                retencao="Token revogado após uso ou expiração"
              />
              <DataRow
                tipo="Respostas em pesquisas (1-100)"
                categoria="Sensível (saúde mental)"
                finalidade="Cálculo de scores agregados, geração de planos"
                retencao="Pseudonimizado em survey_responses; sem PII direta"
              />
              <DataRow
                tipo="Departamento do respondente"
                categoria="Pseudonimizado"
                finalidade="Análise por área (com regra de n≥5)"
                retencao="Vinculado a survey_response, não ao colaborador"
              />
              <DataRow
                tipo="Histórico de planos e ações"
                categoria="Operacional"
                finalidade="Aprendizado de máquina para próximos ciclos"
                retencao="Persistido por ciclo de uso"
              />
              <DataRow
                tipo="Mensagens de chat com IA"
                categoria="Conversacional"
                finalidade="Refinar planos e capturar fatos do perfil"
                retencao="Persistido em chat_messages, com RLS por empresa"
              />
              <DataRow
                tipo="Logs de denúncias anônimas"
                categoria="Sensível (denúncia)"
                finalidade="Canal compliance (Lei 14.831/2024)"
                retencao="Protocolo único, sem dados do denunciante"
              />
            </tbody>
          </table>
        </Card>
      </section>

      {/* Anonimização */}
      <section>
        <h2 className="text-xl font-black">Anonimização e pseudonimização</h2>
        <Card className="mt-3 border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>
              <strong>Respostas individuais não armazenam email, IP nem session
              ID.</strong> A tabela <code className="font-mono text-xs">survey_responses</code>{" "}
              contém apenas <code className="font-mono text-xs">survey_id</code>,{" "}
              <code className="font-mono text-xs">department_id</code> e{" "}
              <code className="font-mono text-xs">submitted_at</code>. O token de
              entrada (<code className="font-mono text-xs">survey_tokens</code>)
              é descartado após uso.
            </li>
            <li>
              <strong>Regra de 5 (k-anonymity):</strong> dimensões só são
              divulgadas no painel se o departamento tiver pelo menos 5
              respostas. Abaixo disso, exibimos &ldquo;Dados insuficientes para
              preservar o anonimato&rdquo;.
            </li>
            <li>
              <strong>Denúncias anônimas:</strong> o canal{" "}
              <Link href="/denuncia" className="text-primary underline">
                /denuncia
              </Link>{" "}
              gera protocolo único (<code className="font-mono text-xs">PROT-AAAA-NNNNNN</code>)
              sem coletar dados do denunciante.
            </li>
          </ul>
        </Card>
      </section>

      {/* Direitos do titular */}
      <section>
        <h2 className="text-xl font-black">Direitos do titular (Art. 18 LGPD)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Como titular dos dados, você pode exercer:
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RightCard icon="visibility" title="Acesso" body="Solicitar cópia dos dados que armazenamos sobre você." />
          <RightCard icon="edit" title="Retificação" body="Corrigir dados incompletos, inexatos ou desatualizados." />
          <RightCard icon="delete" title="Eliminação" body="Solicitar exclusão dos dados (com ressalvas para dados de cumprimento legal)." />
          <RightCard icon="download" title="Portabilidade" body="Receber seus dados em formato estruturado (JSON/CSV)." />
          <RightCard icon="block" title="Revogação de consentimento" body="Retirar o consentimento a qualquer momento, sem prejuízo." />
          <RightCard icon="contact_support" title="Reclamação à ANPD" body="Recorrer à Autoridade Nacional de Proteção de Dados." />
        </div>
        <p className="mt-3 text-sm">
          Para exercer qualquer direito, entre em contato com o{" "}
          <strong>Encarregado de Proteção de Dados (DPO)</strong>:{" "}
          <a href="mailto:dpo@sentinel.local" className="text-primary underline">
            dpo@sentinel.local
          </a>
          {" · "}
          <em className="text-xs text-muted-foreground">
            Plataforma em fase de validação acadêmica. Encarregado a ser
            nomeado formalmente conforme Art. 41 LGPD antes do uso em escala.
          </em>
        </p>
      </section>

      {/* Compartilhamento com terceiros */}
      <section>
        <h2 className="text-xl font-black">Compartilhamento com terceiros</h2>
        <Card className="mt-3 p-5">
          <p className="mb-3 text-sm">
            Compartilhamos dados com os seguintes operadores (Art. 5º, VII
            LGPD), todos com Cláusulas Contratuais Padrão de proteção:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="outline">Supabase (PostgreSQL + Auth)</Badge>
              <span className="text-muted-foreground">
                Hospedagem do banco de dados em região{" "}
                <strong>sa-east-1 (São Paulo)</strong>. Criptografia em
                trânsito (TLS 1.3) e em repouso (AES-256).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline">Anthropic (Claude AI)</Badge>
              <span className="text-muted-foreground">
                Geração de planos e chat. Não envia PII direta; apenas perfis
                organizacionais agregados e dimensões em risco. Anthropic não
                usa dados via API para treinamento.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline">Vercel</Badge>
              <span className="text-muted-foreground">
                Hospedagem da aplicação Next.js, com edge nodes em região BR.
              </span>
            </li>
          </ul>
        </Card>
      </section>

      {/* Footer cross-links */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href="/sobre/metodologia"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          📚 Metodologia
        </Link>
        <Link
          href="/sobre/seguranca"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🛡 Segurança técnica
        </Link>
        <Link
          href="/painel"
          className="ml-auto rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          ← Voltar ao painel
        </Link>
      </div>
    </div>
  );
}

function BasisCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-2">
        <Icon name={icon} size={18} className="mt-0.5 text-primary" />
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function RightCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <Icon name={icon} size={16} className="mt-0.5 text-primary" />
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function DataRow({
  tipo,
  categoria,
  finalidade,
  retencao,
}: {
  tipo: string;
  categoria: string;
  finalidade: string;
  retencao: string;
}) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium">{tipo}</td>
      <td className="px-4 py-2">
        <Badge variant="outline" className="text-[10px]">
          {categoria}
        </Badge>
      </td>
      <td className="px-4 py-2 text-muted-foreground">{finalidade}</td>
      <td className="px-4 py-2 text-muted-foreground">{retencao}</td>
    </tr>
  );
}

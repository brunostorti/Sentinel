import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

export default function SegurancaPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Sobre o Sentinel
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          Arquitetura de segurança
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Esta página documenta as camadas técnicas de proteção implementadas
          na plataforma. As decisões seguem a regra do menor privilégio (Art.
          46 LGPD), defesa em profundidade e minimização de dados.
        </p>
      </div>

      {/* Camadas de criptografia */}
      <section>
        <h2 className="text-xl font-black">Criptografia</h2>
        <div className="mt-3 space-y-3">
          <Layer
            icon="lock"
            title="Em trânsito"
            tech="TLS 1.3 obrigatório"
            description="Toda comunicação client-server e server-banco usa TLS 1.3 com cipher suites modernos (AES-256-GCM, ChaCha20-Poly1305). Garantido pelo Vercel + Supabase. HSTS habilitado."
          />
          <Layer
            icon="storage"
            title="Em repouso (banco)"
            tech="AES-256 (Postgres at-rest)"
            description="Banco PostgreSQL no Supabase com criptografia at-rest gerenciada pela infra (Amazon RDS / GCP Cloud SQL conforme provider). Chaves rotacionadas pela plataforma."
          />
          <Layer
            icon="enhanced_encryption"
            title="Em repouso (respostas em progresso)"
            tech="AES-256-GCM com chave da aplicação"
            description="Dados de pesquisa salvos antes da submissão final (survey_progress) são adicionalmente criptografados com chave específica do app (SURVEY_PROGRESS_ENCRYPTION_KEY), separada das credenciais do banco. Defesa em profundidade contra acesso indevido ao backup."
          />
          <Layer
            icon="key"
            title="Hashing"
            tech="SHA-256"
            description="Tokens de pesquisa (survey_tokens) armazenados como hash. URLs de validação de certificado usam hash criptográfico único."
          />
        </div>
      </section>

      {/* Controle de acesso */}
      <section>
        <h2 className="text-xl font-black">Controle de acesso</h2>
        <div className="mt-3 space-y-3">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="shield" size={18} className="text-primary" />
              <h3 className="text-sm font-bold">
                Row Level Security (RLS) por <code>company_id</code>
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Toda tabela com dados de empresa tem políticas RLS aplicadas em
              nível de banco. Uma empresa <strong>não consegue ler dados de
              outra empresa</strong>, mesmo se houver bug na aplicação. Funções
              auxiliares: <code className="rounded bg-muted px-1 font-mono text-xs">get_my_role()</code>,{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">get_my_company_id()</code>.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "companies",
                "departments",
                "users",
                "surveys",
                "survey_responses",
                "survey_answers",
                "action_plans",
                "action_outcomes",
                "company_profiles",
                "company_actions_taken",
                "kanban_tasks",
                "chat_threads",
                "chat_messages",
                "profile_events",
                "reports",
                "certificates",
                "employees",
                "survey_participants",
                "survey_tokens",
              ].map((t) => (
                <Badge key={t} variant="outline" className="font-mono text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </Card>

          <Layer
            icon="badge"
            title="Roles e privilégio mínimo"
            tech="4 níveis (SUPER_ADMIN, ADMIN, HR, MANAGER)"
            description="Cada role tem permissões granulares. HR e ADMIN podem editar plano e perfil; MANAGER lê e atribui tasks de seu time; SUPER_ADMIN só na admin de empresas, sem company_id próprio."
          />

          <Layer
            icon="vpn_key"
            title="Magic Link (passwordless)"
            tech="Supabase Auth + Email OTP"
            description="Colaboradores autenticam via link expirable enviado por email. Senha não é exigida nem armazenada para participantes de pesquisa."
          />
        </div>
      </section>

      {/* Privacidade por design */}
      <section>
        <h2 className="text-xl font-black">Privacidade por design</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="visibility_off" size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold">Anonimização das respostas</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <code className="font-mono">survey_responses</code> NÃO armazena email, IP,
              session ID ou user_agent. Apenas{" "}
              <code className="font-mono">survey_id</code>,{" "}
              <code className="font-mono">department_id</code> e{" "}
              <code className="font-mono">submitted_at</code>. O token de entrada
              é descartado após uso.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="groups" size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold">Regra de 5 (k-anonymity)</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Dimensões só são divulgadas no painel quando o departamento
              tem ≥5 respostas. Abaixo, a interface bloqueia visualização para
              preservar o anonimato individual.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="receipt_long" size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold">Trilha de auditoria</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tabelas <code className="font-mono">profile_events</code> e{" "}
              <code className="font-mono">chat_messages</code> registram quem
              alterou perfil ou conversou com a IA, com timestamps. Útil para
              recuperar histórico em caso de incidente.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="auto_delete" size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold">Mínimo necessário</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Não coletamos dados demográficos sensíveis (gênero, raça, religião,
              orientação) salvo se a empresa explicitamente configurar em{" "}
              <code className="font-mono">workforce_composition</code> de forma
              agregada (jamais individual).
            </p>
          </Card>
        </div>
      </section>

      {/* Resumo de controles */}
      <section>
        <h2 className="text-xl font-black">Resumo dos controles</h2>
        <Card className="mt-3 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Camada</th>
                <th className="px-4 py-3 text-left font-bold">Técnica</th>
                <th className="px-4 py-3 text-left font-bold">Onde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              <ControlRow camada="Trânsito" tecnica="TLS 1.3" onde="Vercel + Supabase (HSTS)" />
              <ControlRow camada="Banco at-rest" tecnica="AES-256" onde="Supabase Pro" />
              <ControlRow camada="Respostas em progresso" tecnica="AES-256-GCM" onde="SURVEY_PROGRESS_ENCRYPTION_KEY" />
              <ControlRow camada="Tokens de pesquisa" tecnica="SHA-256 hash" onde="survey_tokens" />
              <ControlRow camada="Multi-tenancy" tecnica="RLS por company_id" onde="19 tabelas no Postgres" />
              <ControlRow camada="Anonimização" tecnica="Sem PII em survey_responses" onde="Migration 001" />
              <ControlRow camada="K-anonymity" tecnica="n≥5 por dimensão" onde="lib/copsoq/aggregation.ts" />
              <ControlRow camada="Auditoria" tecnica="Event sourcing" onde="profile_events + chat_messages" />
              <ControlRow camada="Acesso à IA" tecnica="API key server-side" onde="Apenas backend (orchestrator, chat)" />
              <ControlRow camada="Roles" tecnica="4 níveis hierárquicos" onde="SUPER_ADMIN, ADMIN, HR, MANAGER" />
            </tbody>
          </table>
        </Card>
      </section>

      {/* Resposta a incidente */}
      <section>
        <h2 className="text-xl font-black">Resposta a incidente (Art. 48 LGPD)</h2>
        <Card className="mt-3 border-amber-200 bg-amber-50/40 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm">
            Em caso de incidente de segurança envolvendo dados pessoais, a
            plataforma compromete-se a:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
            <li>Comunicar a ANPD em até 72h após conhecimento.</li>
            <li>
              Notificar os titulares afetados com explicação clara, dados
              comprometidos, medidas adotadas e recomendações.
            </li>
            <li>Registrar e revisar internamente para evitar recorrência.</li>
          </ol>
        </Card>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href="/sobre/metodologia"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          📚 Metodologia
        </Link>
        <Link
          href="/sobre/privacidade"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🔒 Privacidade e LGPD
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

function Layer({
  icon,
  title,
  tech,
  description,
}: {
  icon: string;
  title: string;
  tech: string;
  description: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon name={icon} size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold">{title}</h3>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {tech}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ControlRow({
  camada,
  tecnica,
  onde,
}: {
  camada: string;
  tecnica: string;
  onde: string;
}) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium">{camada}</td>
      <td className="px-4 py-2 font-mono text-[11px]">{tecnica}</td>
      <td className="px-4 py-2 text-muted-foreground">{onde}</td>
    </tr>
  );
}

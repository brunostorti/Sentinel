import Link from "next/link";
import { listAllReferences } from "@/lib/ai/knowledge-base/references";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

const EVIDENCE_GROUPS: { key: string; label: string; description: string; types: string[] }[] = [
  {
    key: "guideline",
    label: "Diretrizes globais",
    description: "Recomendações oficiais de organismos internacionais e regulação nacional.",
    types: ["guideline"],
  },
  {
    key: "government",
    label: "Dados oficiais brasileiros",
    description: "Estatísticas governamentais (INSS, MTPS) usadas para contextualizar urgência.",
    types: ["government_data"],
  },
  {
    key: "meta",
    label: "Meta-análises e revisões sistemáticas",
    description: "Síntese quantitativa de múltiplos estudos. Base de evidência para efeitos esperados.",
    types: ["meta_analysis", "systematic_review"],
  },
  {
    key: "rct",
    label: "Ensaios randomizados",
    description: "Evidência experimental direta de intervenções específicas.",
    types: ["rct"],
  },
  {
    key: "theoretical",
    label: "Modelos teóricos",
    description: "Frameworks que estruturam o desenho das intervenções (JD-R, SDT, MBI).",
    types: ["theoretical"],
  },
  {
    key: "validation",
    label: "Validação de instrumentos",
    description: "Papers de validação dos questionários usados (COPSOQ, JSS, OLBI).",
    types: ["validation_study"],
  },
];

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  guideline: "Diretriz",
  systematic_review: "Revisão sistemática",
  meta_analysis: "Meta-análise",
  rct: "Ensaio randomizado",
  observational: "Observacional",
  government_data: "Dado oficial",
  theoretical: "Teórico",
  validation_study: "Validação",
  book: "Livro",
};

export default async function MetodologiaPage() {
  const allRefs = await listAllReferences();

  // Agrupa por categoria
  const grouped = EVIDENCE_GROUPS.map((g) => ({
    ...g,
    refs: allRefs.filter((r) => g.types.includes(r.evidence_type)),
  })).filter((g) => g.refs.length > 0);

  const totalRefs = allRefs.length;
  const brRefs = allRefs.filter((r) => r.region === "brazil").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Sobre o Sentinel
        </p>
        <h1 className="text-3xl font-black tracking-tight">Metodologia e base científica</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Esta plataforma usa inteligência artificial assistida para gerar planos
          de ação a partir de pesquisas psicossociais. Todas as recomendações são
          embasadas em literatura científica indexada, diretrizes internacionais
          (OMS/OIT) e regulação brasileira (NR-1, Lei 14.831/2024). Esta página
          documenta integralmente as fontes.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon="library_books"
          label="Referências curadas"
          value={String(totalRefs)}
          accent="primary"
        />
        <KpiCard
          icon="flag"
          label="Fontes brasileiras"
          value={String(brRefs)}
          accent="emerald"
        />
        <KpiCard
          icon="science"
          label="Meta-análises"
          value={String(
            allRefs.filter(
              (r) =>
                r.evidence_type === "meta_analysis" ||
                r.evidence_type === "systematic_review"
            ).length
          )}
          accent="violet"
        />
        <KpiCard
          icon="gavel"
          label="Diretrizes"
          value={String(allRefs.filter((r) => r.evidence_type === "guideline").length)}
          accent="amber"
        />
      </div>

      {/* Como a IA usa as referências */}
      <Card className="border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-black">Como a IA usa essas fontes</h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>
            <strong>1. Análise (Stage 1):</strong> Identifica dimensões em risco
            com base nos instrumentos validados (COPSOQ II/III, JSS, OLBI). Usa
            sistema semáforo (verde/amarelo/vermelho) e taxa de resposta.
          </li>
          <li>
            <strong>2. Curadoria (Stage 2):</strong> Filtra intervenções do
            catálogo aplicando restrições reais da empresa (orçamento, RH
            disponível, histórico de ações). <em>Hard-filters em código</em>{" "}
            descartam o que não cabe — não depende do LLM &ldquo;lembrar&rdquo;
            do contexto.
          </li>
          <li>
            <strong>3. Síntese (Stage 3):</strong> Para cada intervenção, o LLM
            recebe as referências científicas curadas (lista acima) e <strong>só
            pode citar dessa lista</strong>. Cada métrica de impacto no plano
            tem fonte rastreável.
          </li>
          <li>
            <strong>4. Aprendizado:</strong> Quando a próxima pesquisa fecha, o
            sistema calcula delta de score, pede atribuição ao HR e usa o
            resultado para o próximo ciclo (intervenções com falha entram em
            blocklist específico da empresa).
          </li>
        </ol>
      </Card>

      {/* Bibliografia por categoria */}
      {grouped.map((group) => (
        <section key={group.key} className="space-y-3">
          <div>
            <h2 className="text-xl font-black">{group.label}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="space-y-3">
            {group.refs.map((ref) => (
              <Card key={ref.citation_key} className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-primary">
                    [{ref.citation_key}]
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {EVIDENCE_TYPE_LABEL[ref.evidence_type] ?? ref.evidence_type}
                  </Badge>
                  {ref.certainty_level && (
                    <Badge variant="outline" className="text-[10px]">
                      Certeza {ref.certainty_level}
                    </Badge>
                  )}
                  {ref.region === "brazil" && (
                    <Badge
                      variant="outline"
                      className="border-green-300 text-[10px] text-green-700"
                    >
                      🇧🇷 BR
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{ref.abnt_citation}</p>
                {ref.notes && (
                  <p className="mt-2 rounded border-l-2 border-primary/40 bg-muted/30 p-2 pl-3 text-xs italic text-muted-foreground">
                    {ref.notes}
                  </p>
                )}
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  Acessar fonte
                  <Icon name="open_in_new" size={12} />
                </a>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* Limitações */}
      <Card className="border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="text-lg font-black">Limitações declaradas</h2>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
          <li>
            • <strong>Assistência por IA, não substituição:</strong> as
            recomendações são <em>sugeridas</em> com base em literatura
            agregada. Cada plano deve ser revisado por profissional habilitado
            (psicólogo do trabalho, médico do trabalho ou consultor de RH
            certificado) antes da execução.
          </li>
          <li>
            • <strong>Certeza variável da evidência:</strong> nem todas as
            intervenções têm evidência GRADE alta. A maior parte das diretrizes
            OMS (2022) tem certeza &ldquo;low&rdquo; a &ldquo;moderate&rdquo;.
            Para dimensões com evidência fraca, o sistema explicita isso na
            recomendação.
          </li>
          <li>
            • <strong>Generalização para o Brasil:</strong> a maioria das
            meta-análises usa amostras europeias e norte-americanas. Sempre que
            possível, citamos também dados brasileiros (INSS, manual COPSOQ
            Portugal 2013).
          </li>
          <li>
            • <strong>Contextualização local:</strong> o pipeline usa o perfil
            da empresa (orçamento, estrutura RH, histórico) para
            <em> filtrar e calibrar</em> as recomendações, mas decisões finais
            cabem à liderança/RH.
          </li>
        </ul>
      </Card>

      {/* Footer com links cross */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href="/sobre/privacidade"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🔒 Privacidade e LGPD
        </Link>
        <Link
          href="/sobre/seguranca"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🛡 Arquitetura de segurança
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

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: "primary" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    primary: "from-blue-500/15 to-blue-600/10 text-blue-600",
    emerald: "from-emerald-500/15 to-emerald-600/10 text-emerald-600",
    violet: "from-violet-500/15 to-violet-600/10 text-violet-600",
    amber: "from-amber-500/15 to-amber-600/10 text-amber-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colors[accent]}`}
        >
          <Icon name={icon} size={20} />
        </div>
      </div>
    </Card>
  );
}

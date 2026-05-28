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
    <div className="space-y-8 pb-10">
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
      <Card className="border-primary/10 bg-primary/5 p-8 shadow-sm">
        <h2 className="text-lg font-black text-foreground">Como a IA usa essas fontes</h2>
        <ol className="mt-4 space-y-3.5 text-sm leading-relaxed">
          <li className="text-muted-foreground">
            <span className="font-bold text-foreground/80">1. Análise (Stage 1):</span> Identifica dimensões em risco
            com base nos instrumentos validados (COPSOQ II/III, JSS, OLBI). Usa
            sistema semáforo (verde/amarelo/vermelho) e taxa de resposta.
          </li>
          <li className="text-muted-foreground">
            <span className="font-bold text-foreground/80">2. Curadoria (Stage 2):</span> Filtra intervenções do
            catálogo aplicando restrições reais da empresa (orçamento, RH
            disponível, histórico de ações). <em className="text-foreground/70 not-italic font-medium">Hard-filters em código</em>{" "}
            descartam o que não cabe — não depende do LLM &ldquo;lembrar&rdquo;
            do contexto.
          </li>
          <li className="text-muted-foreground">
            <span className="font-bold text-foreground/80">3. Síntese (Stage 3):</span> Para cada intervenção, o LLM
            recebe as referências científicas curadas (lista acima) e <strong>só
            pode citar dessa lista</strong>. Cada métrica de impacto no plano
            tem fonte rastreável.
          </li>
          <li className="text-muted-foreground">
            <span className="font-bold text-foreground/80">4. Aprendizado:</span> Quando a próxima pesquisa fecha, o
            sistema calcula delta de score, pede atribuição ao HR e usa o
            resultado para o próximo ciclo (intervenções com falha entram em
            blocklist específico da empresa).
          </li>
        </ol>
      </Card>

      {/* Bibliografia por categoria */}
      {grouped.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="border-b border-border/40 pb-2">
            <h2 className="text-xl font-black tracking-tight text-foreground">{group.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
          </div>
          <div className="space-y-3">
            {group.refs.map((ref) => (
              <Card key={ref.citation_key} className="p-4 transition-all duration-200 hover:shadow-md hover:border-border/80 relative group/card">
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5 pr-8">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] font-extrabold text-primary hover:underline flex items-center gap-0.5 bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded"
                  >
                    [{ref.citation_key}]
                    <Icon name="open_in_new" size={10} className="inline opacity-70" />
                  </a>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground/80 border-muted bg-muted/10 font-medium">
                    {EVIDENCE_TYPE_LABEL[ref.evidence_type] ?? ref.evidence_type}
                  </Badge>
                  {ref.certainty_level && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground/80 border-muted bg-muted/10 font-medium">
                      Certeza {ref.certainty_level}
                    </Badge>
                  )}
                  {ref.region === "brazil" && (
                    <Badge
                      variant="outline"
                      className="border-green-200/50 bg-green-500/5 text-[10px] font-semibold text-green-700/90 dark:text-green-400 dark:bg-green-500/10"
                    >
                      🇧🇷 BR
                    </Badge>
                  )}
                </div>
                
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-4 top-4 opacity-0 group-hover/card:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted"
                  title="Acessar fonte"
                >
                  <Icon name="open_in_new" size={16} />
                </a>

                <p className="text-sm leading-relaxed text-foreground/90 font-medium">{ref.abnt_citation}</p>
                {ref.notes && (
                  <p className="mt-2.5 rounded-lg border-l-[3px] border-primary/30 bg-muted/20 p-2.5 pl-3.5 text-xs italic text-muted-foreground leading-relaxed">
                    {ref.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* Limitações */}
      <Card className="border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900 dark:bg-amber-950/30 shadow-sm">
        <h2 className="text-lg font-black text-foreground">Limitações declaradas</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li className="text-muted-foreground">
            <span className="text-foreground/95 font-semibold">• Assistência por IA, não substituição:</span> as
            recomendações são <em className="not-italic font-medium text-foreground/80">sugeridas</em> com base em literatura
            agregada. Cada plano deve ser revisado por profissional habilitado
            (psicólogo do trabalho, médico do trabalho ou consultor de RH
            certificado) antes da execução.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground/95 font-semibold">• Certeza variável da evidência:</span> nem todas as
            intervenções têm evidência GRADE alta. A maior parte das diretrizes
            OMS (2022) tem certeza &ldquo;low&rdquo; a &ldquo;moderate&rdquo;.
            Para dimensões com evidência fraca, o sistema explicita isso na
            recomendação.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground/95 font-semibold">• Generalização para o Brasil:</span> a maioria das
            meta-análises usa amostras europeias e norte-americanas. Sempre que
            possível, citamos também dados brasileiros (INSS, manual COPSOQ
            Portugal 2013).
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground/95 font-semibold">• Contextualização local:</span> o pipeline usa o perfil
            da empresa (orçamento, estrutura RH, histórico) para
            <em className="not-italic font-medium text-foreground/80"> filtrar e calibrar</em> as recomendações, mas decisões finais
            cabem à liderança/RH.
          </li>
        </ul>
      </Card>

      {/* Footer com links cross unificados */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border/80 pt-6">
        <Link
          href="/sobre/privacidade"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95 shadow-sm"
        >
          <span>🔒 Privacidade e LGPD</span>
        </Link>
        <Link
          href="/sobre/seguranca"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95 shadow-sm"
        >
          <span>🛡 Arquitetura de segurança</span>
        </Link>
        <Link
          href="/painel"
          className="ml-auto flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95 shadow-sm"
        >
          <span>← Voltar ao painel</span>
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

/**
 * Visualização de plano de ação no formato matriz 5W2H.
 *
 * Mapeamento dos campos do AIRecommendation:
 *   What     → title + description
 *   Why      → rationale + risk_if_not_acted + impact_metrics
 *   Where    → target_department + communication_plan.channels
 *   When     → roadmap + timeframe + time_to_first_value
 *   Who      → stakeholders (RACI) + internal_capacity_required
 *   How      → vendors + internal_alternative + prerequisites + leading_indicators
 *              + monitoring_cadence + implementation_risks + communication_plan
 *   How much → investment + expected_return
 *
 * NR-1 + compliance_extra: selos no header (não viram célula da matriz).
 */

import type { AIRecommendation } from "@/lib/ai/pipeline/types";
import type { KbReferenceWithRelevance } from "@/lib/ai/knowledge-base/references";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";

interface PlanV2Props {
  recommendation: AIRecommendation;
  targetDepartment?: string | null;
  timeframe?: string | null;
  references?: KbReferenceWithRelevance[];
}

/* ─── Visual: cores e ícones por célula 5W2H ─── */

const CELLS = {
  what:    { letter: "W",  label: "What",     pt: "O que fazer",        icon: "task_alt",        accent: "from-blue-500 to-blue-600",       bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-700 dark:text-blue-400" },
  why:     { letter: "W",  label: "Why",      pt: "Por quê",            icon: "psychology",      accent: "from-violet-500 to-violet-600",   bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-700 dark:text-violet-400" },
  where:   { letter: "W",  label: "Where",    pt: "Onde aplicar",       icon: "place",           accent: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  when:    { letter: "W",  label: "When",     pt: "Quando",             icon: "schedule",        accent: "from-amber-500 to-amber-600",     bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400" },
  who:     { letter: "W",  label: "Who",      pt: "Quem executa",       icon: "group",           accent: "from-rose-500 to-rose-600",       bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-700 dark:text-rose-400" },
  how:     { letter: "H",  label: "How",      pt: "Como fazer",         icon: "build",           accent: "from-cyan-500 to-cyan-600",       bg: "bg-cyan-50 dark:bg-cyan-950/30",       text: "text-cyan-700 dark:text-cyan-400" },
  howMuch: { letter: "H$", label: "How much", pt: "Quanto custa",       icon: "payments",        accent: "from-teal-600 to-teal-700",       bg: "bg-teal-50 dark:bg-teal-950/30",       text: "text-teal-700 dark:text-teal-400" },
} as const;

type CellKey = keyof typeof CELLS;

/* ─── Cabeçalho do card 5W2H ─── */
function CellHeader({ k }: { k: CellKey }) {
  const c = CELLS[k];
  return (
    <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white font-black text-sm shadow-sm`}
      >
        {c.letter}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>
          {c.label}
        </p>
        <p className="text-sm font-bold leading-tight">{c.pt}</p>
      </div>
      <Icon name={c.icon} size={20} className={c.text} />
    </div>
  );
}

/* ─── Componente principal ─── */

export function PlanV2({ recommendation: r, targetDepartment, timeframe, references = [] }: PlanV2Props) {
  const hasInvestment =
    r.investment?.total_annual && r.investment.total_annual !== "N/D";
  const hasReturn =
    r.expected_return?.payback_period && r.expected_return.payback_period !== "N/D";

  // Lookup citation_key -> KbReference para enriquecer impact_metrics
  const refByKey = new Map<string, KbReferenceWithRelevance>();
  for (const ref of references) {
    refByKey.set(ref.citation_key, ref);
    // Lookup tolerante: case-insensitive, sem espaços
    refByKey.set(ref.citation_key.toLowerCase(), ref);
  }
  function resolveRef(key: string | undefined | null) {
    if (!key) return null;
    return refByKey.get(key) ?? refByKey.get(key.toLowerCase()) ?? null;
  }

  return (
    <div className="space-y-5">
      {/* ═══ Elevator pitch: ação imediata + KPIs principais ═══ */}
      {r.quick_action && (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Icon name="bolt" size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Ação imediata — Primeiros 30 dias
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                {r.quick_action}
              </p>
            </div>
          </div>

          {/* Mini-KPIs em linha */}
          {(hasInvestment || hasReturn || r.internal_capacity_required) && (
            <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 sm:grid-cols-4">
              {hasInvestment && (
                <MiniKpi icon="payments" label="Investimento" value={r.investment.total_annual} />
              )}
              {r.expected_return?.conservative && r.expected_return.conservative !== "N/D" && (
                <MiniKpi icon="trending_up" label="Retorno conservador" value={r.expected_return.conservative} />
              )}
              {hasReturn && (
                <MiniKpi icon="timer" label="Payback" value={r.expected_return.payback_period} />
              )}
              {r.internal_capacity_required && (
                <MiniKpi icon="person" label="Capacidade interna" value={r.internal_capacity_required} />
              )}
            </div>
          )}
        </Card>
      )}

      {/* ═══ Selo de compliance no topo (se houver) ═══ */}
      {(r.nr1_compliance || (r.compliance_extra && r.compliance_extra.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-900 dark:bg-violet-950/20">
          <Icon name="gavel" size={16} className="text-violet-600" />
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">
            Conformidade legal:
          </p>
          {r.nr1_compliance && (
            <span className="text-xs text-violet-700 dark:text-violet-300">
              {r.nr1_compliance}
            </span>
          )}
          {r.compliance_extra?.map((c, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      )}

      {/* ═══ Matriz 5W2H ═══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* WHAT */}
        <Card className={`p-5 ${CELLS.what.bg}`}>
          <CellHeader k="what" />
          <p className="text-sm font-semibold leading-snug">{r.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {r.description}
          </p>
        </Card>

        {/* WHY */}
        <Card className={`p-5 ${CELLS.why.bg}`}>
          <CellHeader k="why" />
          <p className="text-sm leading-relaxed">{r.rationale}</p>

          {r.risk_if_not_acted && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                ⚠ Se não agir
              </p>
              <p className="mt-1 text-xs leading-relaxed">{r.risk_if_not_acted}</p>
            </div>
          )}

          {r.impact_metrics && r.impact_metrics.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Impacto esperado (evidência)
              </p>
              {r.impact_metrics.slice(0, 3).map((m, i) => {
                const resolved = resolveRef(m.evidence?.study_or_case);
                const fallbackUrl = m.evidence?.url_or_doi;
                const url = resolved?.url ?? fallbackUrl ?? null;
                const label = resolved
                  ? `${resolved.authors.split(";")[0].trim()} (${resolved.year})`
                  : `${m.evidence?.study_or_case ?? ""}${m.evidence?.year ? " (" + m.evidence.year + ")" : ""}`;
                return (
                  <div key={i} className="rounded border border-border/60 bg-card/60 p-2 text-xs">
                    <p className="font-semibold">
                      {m.metric}: <span className="text-violet-600 dark:text-violet-400">{m.change}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {label}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener"
                          className="ml-1 text-primary underline"
                        >
                          fonte ↗
                        </a>
                      )}
                      {resolved?.certainty_level && (
                        <Badge variant="outline" className="ml-2 text-[9px]">
                          certeza {resolved.certainty_level}
                        </Badge>
                      )}
                    </p>
                    {(resolved?.notes || m.evidence?.br_context) && (
                      <p className="mt-1 italic text-muted-foreground">
                        {resolved?.notes ?? m.evidence?.br_context}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* WHERE */}
        <Card className={`p-5 ${CELLS.where.bg}`}>
          <CellHeader k="where" />
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Departamento alvo
              </p>
              <p className="mt-1 font-medium">
                {!targetDepartment || targetDepartment === "all"
                  ? "Toda a empresa"
                  : targetDepartment}
              </p>
            </div>

            {r.communication_plan?.channels && r.communication_plan.channels.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Canais de comunicação
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.communication_plan.channels.map((ch, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {r.communication_plan?.key_message && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Mensagem-chave
                </p>
                <p className="mt-1 italic leading-relaxed text-muted-foreground">
                  &ldquo;{r.communication_plan.key_message}&rdquo;
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* WHEN */}
        <Card className={`p-5 ${CELLS.when.bg}`}>
          <CellHeader k="when" />
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {timeframe && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Janela total
                  </p>
                  <p className="font-semibold">{timeframe}</p>
                </div>
              )}
              {r.time_to_first_value && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Primeiros sinais
                  </p>
                  <p className="font-semibold">{r.time_to_first_value}</p>
                </div>
              )}
            </div>

            {r.roadmap && r.roadmap.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Roadmap
                </p>
                <ol className="space-y-2">
                  {r.roadmap.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-black text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{step.phase}</p>
                        <p className="text-xs text-muted-foreground">{step.deliverable}</p>
                        <Badge variant="outline" className="mt-0.5 text-[10px]">
                          {step.owner_role}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {r.communication_plan?.timing && (
              <div className="rounded border border-border/60 bg-card/60 p-2 text-xs">
                <span className="font-semibold">Comunicar:</span>{" "}
                {r.communication_plan.timing}
              </div>
            )}
          </div>
        </Card>

        {/* WHO */}
        <Card className={`p-5 ${CELLS.who.bg}`}>
          <CellHeader k="who" />
          {r.stakeholders && (
            <div className="space-y-3 text-sm">
              {r.stakeholders.accountable && (
                <RaciRow label="Aprova (Accountable)" value={r.stakeholders.accountable} highlight />
              )}
              {r.stakeholders.responsible && r.stakeholders.responsible.length > 0 && (
                <RaciRow label="Executa (Responsible)" value={r.stakeholders.responsible.join(", ")} />
              )}
              {r.stakeholders.consulted && r.stakeholders.consulted.length > 0 && (
                <RaciRow label="Consultado (Consulted)" value={r.stakeholders.consulted.join(", ")} />
              )}
              {r.stakeholders.informed && r.stakeholders.informed.length > 0 && (
                <RaciRow label="Informado (Informed)" value={r.stakeholders.informed.join(", ")} />
              )}
            </div>
          )}

          {r.internal_capacity_required && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:text-rose-400">
                Capacidade interna necessária
              </p>
              <p className="mt-1 text-xs">{r.internal_capacity_required}</p>
            </div>
          )}
        </Card>

        {/* HOW — full width (mais conteúdo) */}
        <Card className={`p-5 lg:col-span-2 ${CELLS.how.bg}`}>
          <CellHeader k="how" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Vendors */}
            {r.vendors && r.vendors.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Fornecedores candidatos (Brasil)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.vendors.map((v, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold">{v.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {v.price_range}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{v.modality}</p>
                      <p className="mt-1 text-xs leading-relaxed">{v.why_fit}</p>
                      {v.contact_url && (
                        <a
                          href={v.contact_url}
                          target="_blank"
                          rel="noopener"
                          className="mt-1 inline-block text-[11px] text-primary underline"
                        >
                          {v.contact_url} ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                {r.internal_alternative && (
                  <div className="mt-2 rounded-lg border border-dashed border-border bg-card/40 p-3 text-xs">
                    <p className="font-bold text-muted-foreground">Alternativa interna (sem fornecedor)</p>
                    <p className="mt-1">{r.internal_alternative}</p>
                  </div>
                )}
              </div>
            )}

            {/* Pré-requisitos */}
            {r.prerequisites && r.prerequisites.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Pré-requisitos
                </p>
                <ul className="space-y-1 text-xs">
                  {r.prerequisites.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-cyan-600">▸</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Leading indicators */}
            {r.leading_indicators && r.leading_indicators.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  KPIs intermediários
                </p>
                <div className="space-y-2">
                  {r.leading_indicators.map((m, i) => (
                    <div key={i} className="rounded border border-border/60 bg-card/60 p-2 text-xs">
                      <p className="font-semibold">{m.metric}</p>
                      <p className="text-muted-foreground">
                        Meta: {m.target} • {m.measurement}
                      </p>
                    </div>
                  ))}
                </div>
                {r.monitoring_cadence && (
                  <p className="mt-2 text-[11px] italic text-muted-foreground">
                    Cadência: {r.monitoring_cadence}
                  </p>
                )}
              </div>
            )}

            {/* Riscos de execução */}
            {r.implementation_risks && r.implementation_risks.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Riscos de execução + mitigação
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.implementation_risks.map((ir, i) => (
                    <div key={i} className="rounded border border-amber-200 bg-amber-50/40 p-2 text-xs dark:border-amber-900 dark:bg-amber-950/20">
                      <p className="font-semibold">⚠ {ir.risk}</p>
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-semibold">Mitigação:</span> {ir.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* HOW MUCH — full width */}
        <Card className={`p-5 lg:col-span-2 ${CELLS.howMuch.bg}`}>
          <CellHeader k="howMuch" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Investimento */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Investimento
              </p>
              <p className="text-2xl font-black text-teal-700 dark:text-teal-400">
                {r.investment?.total_annual ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.investment?.per_employee_month ?? ""}
              </p>
              {r.investment?.breakdown && (
                <div className="mt-2 rounded border border-border/60 bg-card/60 p-2 text-[11px] leading-relaxed">
                  <p className="font-semibold text-muted-foreground">Detalhamento</p>
                  <p>{r.investment.breakdown}</p>
                </div>
              )}
            </div>

            {/* Retorno */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Retorno esperado
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Conservador</p>
                  <p className="leading-relaxed">{r.expected_return?.conservative ?? "—"}</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Otimista</p>
                  <p className="leading-relaxed">{r.expected_return?.optimistic ?? "—"}</p>
                </div>
                <div className="rounded bg-card/60 p-2">
                  <p className="font-semibold">
                    ⏱ Payback: {r.expected_return?.payback_period ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* REFERÊNCIAS — full width (lista científica completa) */}
        {references.length > 0 && (
          <Card className="lg:col-span-2 bg-zinc-50/50 p-5 dark:bg-zinc-950/40">
            <div className="mb-3 flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700 text-white shadow-sm">
                <Icon name="menu_book" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400">
                  Embasamento científico
                </p>
                <p className="text-sm font-bold leading-tight">
                  Referências usadas na construção deste plano
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {references.length}{" "}
                {references.length === 1 ? "referência" : "referências"}
              </Badge>
            </div>
            <div className="space-y-3 text-xs">
              {references.map((ref) => (
                <ReferenceItem key={ref.citation_key} ref={ref} />
              ))}
            </div>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] italic text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              ⚠ Plano gerado com assistência de IA baseada nas referências
              acima. Não substitui avaliação por profissional habilitado em
              saúde ocupacional ou psicologia do trabalho.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Subcomponentes ─── */

const RELEVANCE_LABEL: Record<string, { label: string; cls: string }> = {
  primary: { label: "Primária", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  secondary: { label: "Secundária", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" },
  context: { label: "Contexto", cls: "bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400" },
};

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

function ReferenceItem({ ref }: { ref: KbReferenceWithRelevance }) {
  const rel = RELEVANCE_LABEL[ref.relevance] ?? RELEVANCE_LABEL.secondary;
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[9px] ${rel.cls}`}>{rel.label}</Badge>
        <Badge variant="outline" className="text-[9px]">
          {EVIDENCE_TYPE_LABEL[ref.evidence_type] ?? ref.evidence_type}
        </Badge>
        {ref.certainty_level && (
          <Badge variant="outline" className="text-[9px]">
            Certeza {ref.certainty_level}
          </Badge>
        )}
        {ref.region === "brazil" && (
          <Badge variant="outline" className="border-green-300 text-[9px] text-green-700">
            🇧🇷 BR
          </Badge>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">
          [{ref.citation_key}]
        </span>
      </div>
      <p className="leading-snug">
        {ref.abnt_citation}
      </p>
      {ref.specific_claim && (
        <p className="mt-1.5 rounded border-l-2 border-primary/50 bg-primary/5 p-1.5 pl-2 italic text-muted-foreground">
          → <strong>Alegação usada:</strong> {ref.specific_claim}
        </p>
      )}
      <a
        href={ref.url}
        target="_blank"
        rel="noopener"
        className="mt-1.5 inline-block text-[11px] text-primary underline"
      >
        Acessar fonte ↗
      </a>
    </div>
  );
}

function MiniKpi({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={16} className="mt-0.5 text-primary" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}

function RaciRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded border border-rose-300 bg-rose-100/40 p-2 dark:border-rose-800 dark:bg-rose-950/30" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

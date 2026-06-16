"use client";

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
 */

import { useState } from "react";
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

/* Cor única por célula da matriz 5W2H — usada APENAS no estado ativo da aba
 * e no badge do cabeçalho da aba ativa. O restante do conteúdo permanece neutro. */
const CELLS = {
  what:    { letter: "W",  label: "What",     pt: "O que fazer",  icon: "help_center",       hex: "#2563eb", tint: "rgb(37 99 235 / 0.08)" },
  why:     { letter: "W",  label: "Why",      pt: "Por quê",      icon: "psychology",        hex: "#7c3aed", tint: "rgb(124 58 237 / 0.08)" },
  where:   { letter: "W",  label: "Where",    pt: "Onde aplicar", icon: "location_on",       hex: "#059669", tint: "rgb(5 150 105 / 0.08)" },
  when:    { letter: "W",  label: "When",     pt: "Quando",       icon: "calendar_month",    hex: "#d97706", tint: "rgb(217 119 6 / 0.08)" },
  who:     { letter: "W",  label: "Who",      pt: "Quem executa", icon: "groups",            hex: "#e11d48", tint: "rgb(225 29 72 / 0.08)" },
  how:     { letter: "H",  label: "How",      pt: "Como fazer",   icon: "settings_suggest",  hex: "#0891b2", tint: "rgb(8 145 178 / 0.08)" },
  howMuch: { letter: "H$", label: "How much", pt: "Quanto custa", icon: "payments",          hex: "#0d9488", tint: "rgb(13 148 136 / 0.08)" },
} as const;

type CellKey = keyof typeof CELLS;
const CELL_KEYS = Object.keys(CELLS) as CellKey[];

/* ─── Componente principal ─── */

export function PlanV2({ recommendation: r, targetDepartment, timeframe, references = [] }: PlanV2Props) {
  const [activeTab, setActiveTab] = useState<CellKey>("what");

  const hasInvestment = r.investment?.total_annual && r.investment.total_annual !== "N/D";
  const hasReturn = r.expected_return?.payback_period && r.expected_return.payback_period !== "N/D";

  const refByKey = new Map<string, KbReferenceWithRelevance>();
  for (const ref of references) {
    refByKey.set(ref.citation_key, ref);
    refByKey.set(ref.citation_key.toLowerCase(), ref);
  }
  function resolveRef(key: string | undefined | null) {
    if (!key) return null;
    return refByKey.get(key) ?? refByKey.get(key.toLowerCase()) ?? null;
  }

  const cell = CELLS[activeTab];

  return (
    <div className="space-y-5">

      {/* ═══ Card de resumo: Ação imediata + KPIs ═══ */}
      {r.quick_action && (
        <Card className="overflow-hidden border-border bg-card p-0 shadow-sm">

          {/* Faixa: ação imediata */}
          <div className="flex items-center gap-4 px-6 py-5 sm:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="bolt" size={24} filled />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Ação imediata — Primeiros 30 dias
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                {r.quick_action}
              </p>
            </div>
          </div>

          {/* KPIs em linha enxuta */}
          {(hasInvestment || hasReturn || r.internal_capacity_required || r.expected_return?.conservative) && (
            <div className="grid grid-cols-2 items-stretch divide-x divide-y divide-border border-t border-border bg-muted/20 md:grid-cols-4 md:divide-y-0">
              {hasInvestment && <KpiCell icon="payments" label="Investimento" value={r.investment?.total_annual ?? ""} />}
              {r.expected_return?.conservative && r.expected_return.conservative !== "N/D" && (
                <KpiCell icon="trending_up" label="Retorno" value={r.expected_return.conservative} />
              )}
              {hasReturn && <KpiCell icon="schedule" label="Payback" value={r.expected_return?.payback_period ?? ""} />}
              {r.internal_capacity_required && (
                <KpiCell icon="group" label="Capacidade" value={r.internal_capacity_required} />
              )}
            </div>
          )}
        </Card>
      )}

      {/* ═══ Conformidade legal — barra discreta ═══ */}
      {(r.nr1_compliance || (r.compliance_extra && r.compliance_extra.length > 0)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="verified_user" size={14} className="text-primary" />
            <span className="font-medium">Conformidade legal:</span>
          </div>
          {r.nr1_compliance && (
            <span className="text-foreground/80">{r.nr1_compliance}</span>
          )}
          {r.compliance_extra && r.compliance_extra.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.compliance_extra.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-medium">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Card da matriz 5W2H ═══ */}
      <Card className="overflow-hidden border-border bg-card p-0 shadow-sm">

        {/* Barra de abas — coloridas (uma cor por célula 5W2H) */}
        <nav className="flex overflow-x-auto border-b border-border bg-card">
          {CELL_KEYS.map((key) => {
            const c = CELLS[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={isActive ? { color: c.hex, borderColor: c.hex, backgroundColor: c.tint } : undefined}
                className={`relative flex min-w-[110px] flex-1 flex-col items-center gap-1 border-b-2 px-3 py-3.5 transition-colors duration-200
                  ${isActive
                    ? ""
                    : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
              >
                <Icon name={c.icon} size={20} filled={isActive} />
                <span className="text-xs font-bold tracking-wide">{c.label}</span>
                <span
                  className="text-[10px]"
                  style={isActive ? { color: c.hex, opacity: 0.7 } : undefined}
                >
                  {c.pt}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Cabeçalho da aba ativa — cor da célula no badge e no label */}
        <div
          className="flex items-center gap-4 border-b border-border/60 px-6 pt-6 pb-5 sm:px-8"
          style={{ backgroundColor: cell.tint }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-black text-lg text-white shadow-sm"
            style={{ backgroundColor: cell.hex }}
          >
            {cell.letter}
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: cell.hex }}
            >
              {cell.label}
            </p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
              {cell.pt}
            </h2>
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        <div className="p-6 sm:p-8">
          {activeTab === "what" && <TabWhat r={r} />}
          {activeTab === "why" && <TabWhy r={r} resolveRef={resolveRef} />}
          {activeTab === "where" && <TabWhere r={r} targetDepartment={targetDepartment ?? null} />}
          {activeTab === "when" && <TabWhen r={r} timeframe={timeframe ?? null} />}
          {activeTab === "who" && <TabWho r={r} />}
          {activeTab === "how" && <TabHow r={r} />}
          {activeTab === "howMuch" && <TabHowMuch r={r} />}
        </div>
      </Card>

      {/* ═══ Referências científicas ═══ */}
      {references.length > 0 && (
        <Card className="border-border bg-muted/20 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon name="menu_book" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Embasamento científico
              </p>
              <p className="text-sm font-bold leading-tight">Referências usadas na construção deste plano</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {references.length} {references.length === 1 ? "referência" : "referências"}
            </Badge>
          </div>
          <div className="space-y-3 text-xs">
            {references.map((reference) => <ReferenceItem key={reference.citation_key} reference={reference} />)}
          </div>
          <p className="mt-4 rounded-lg border border-border bg-card/60 p-3 text-[11px] italic text-muted-foreground">
            ⚠ Plano gerado com assistência de IA baseada nas referências acima. Não substitui avaliação por profissional habilitado em saúde ocupacional ou psicologia do trabalho.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   CONTEÚDO DE CADA ABA — limpo, monocromático
═══════════════════════════════════════ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function TabWhat({ r }: { r: AIRecommendation }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Título da ação</SectionLabel>
        <h3 className="text-xl font-bold tracking-tight leading-snug text-foreground">{r.title}</h3>
      </div>
      {r.description && (
        <div>
          <SectionLabel>Descrição detalhada</SectionLabel>
          <p className="text-base leading-relaxed text-foreground/90">{r.description}</p>
        </div>
      )}
    </div>
  );
}

function TabWhy({ r, resolveRef }: { r: AIRecommendation; resolveRef: (k: string | undefined | null) => KbReferenceWithRelevance | null }) {
  const evidence = r.facts?.surveyEvidence ?? [];
  return (
    <div className="space-y-6">
      {evidence.length > 0 && (
        <div>
          <SectionLabel>O que a pesquisa revelou (dados reais)</SectionLabel>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium leading-snug text-foreground">
                  &ldquo;{e.questionText}&rdquo;
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {e.criticalPercent}% em nível crítico
                  </Badge>
                  <span>·</span>
                  <span>score médio {e.meanScore}/100</span>
                  <span>·</span>
                  <span>n = {e.respondents}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.rationale && (
        <div>
          <SectionLabel>Justificativa</SectionLabel>
          <p className="text-base leading-relaxed text-foreground/90">{r.rationale}</p>
        </div>
      )}

      {r.risk_if_not_acted && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-1.5">
            <Icon name="warning" size={14} className="mr-1 inline -mt-0.5" />
            Consequências se não agir
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{r.risk_if_not_acted}</p>
        </div>
      )}

      {r.impact_metrics && r.impact_metrics.length > 0 && (
        <div>
          <SectionLabel>Impacto esperado (evidência)</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.impact_metrics.slice(0, 4).map((m, i) => {
              const resolved = resolveRef(m.evidence?.study_or_case);
              const fallbackUrl = m.evidence?.url_or_doi;
              const url = resolved?.url ?? fallbackUrl ?? null;
              const label = resolved
                ? `${resolved.authors.split(";")[0].trim()} (${resolved.year})`
                : `${m.evidence?.study_or_case ?? ""}${m.evidence?.year ? " (" + m.evidence.year + ")" : ""}`;
              return (
                <div key={i} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-semibold">{m.metric}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{m.change}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {label}
                    {url && (
                      <a href={url} target="_blank" rel="noopener" className="ml-1 text-primary underline">
                        fonte ↗
                      </a>
                    )}
                  </p>
                  {(resolved?.notes || m.evidence?.br_context) && (
                    <p className="mt-1.5 text-[11px] italic text-muted-foreground">
                      {resolved?.notes ?? m.evidence?.br_context}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TabWhere({ r, targetDepartment }: { r: AIRecommendation; targetDepartment: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Departamento alvo</SectionLabel>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {!targetDepartment || targetDepartment === "all" ? "Toda a empresa" : targetDepartment}
        </p>
        {r.facts && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {r.facts.headcount} pessoas no público-alvo · {r.facts.responsesConsidered} respostas analisadas
          </p>
        )}
      </div>

      {r.communication_plan?.channels && r.communication_plan.channels.length > 0 && (
        <div>
          <SectionLabel>Canais de comunicação</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {r.communication_plan.channels.map((ch, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1 text-xs font-medium">{ch}</Badge>
            ))}
          </div>
        </div>
      )}

      {r.communication_plan?.key_message && (
        <div>
          <SectionLabel>Mensagem-chave</SectionLabel>
          <div className="rounded-lg border-l-2 border-primary/40 bg-muted/30 p-4">
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{r.communication_plan.key_message}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TabWhen({ r, timeframe }: { r: AIRecommendation; timeframe: string | null }) {
  return (
    <div className="space-y-6">
      {(timeframe || r.time_to_first_value) && (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {timeframe && (
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Janela total</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{timeframe}</p>
            </div>
          )}
          {r.time_to_first_value && (
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primeiros sinais</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{r.time_to_first_value}</p>
            </div>
          )}
        </div>
      )}

      {r.roadmap && r.roadmap.length > 0 && (
        <div>
          <SectionLabel>Roadmap de execução</SectionLabel>
          <div className="relative space-y-3">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />
            {r.roadmap.map((step, i) => (
              <div key={i} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 rounded-lg border border-border bg-card p-4 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{step.phase}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{step.owner_role}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.deliverable}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.communication_plan?.timing && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <span className="font-semibold">Comunicar: </span>
          <span className="text-muted-foreground">{r.communication_plan.timing}</span>
        </div>
      )}
    </div>
  );
}

function TabWho({ r }: { r: AIRecommendation }) {
  const raciItems = [
    { label: "Aprova (Accountable)", value: r.stakeholders?.accountable, highlight: true },
    { label: "Executa (Responsible)", value: r.stakeholders?.responsible?.join(", ") },
    { label: "Consultado (Consulted)", value: r.stakeholders?.consulted?.join(", ") },
    { label: "Informado (Informed)", value: r.stakeholders?.informed?.join(", ") },
  ].filter((item) => item.value);

  return (
    <div className="space-y-6">
      {raciItems.length > 0 && (
        <div>
          <SectionLabel>Matriz RACI</SectionLabel>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {raciItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-4 ${item.highlight ? "bg-primary/5" : "bg-card"}`}
              >
                <div className="w-44 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                </div>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.internal_capacity_required && (
        <div>
          <SectionLabel>Capacidade interna necessária</SectionLabel>
          <p className="text-sm leading-relaxed text-foreground/90">{r.internal_capacity_required}</p>
        </div>
      )}
    </div>
  );
}

function TabHow({ r }: { r: AIRecommendation }) {
  return (
    <div className="space-y-6">
      {r.vendors && r.vendors.length > 0 && (
        <div>
          <SectionLabel>Fornecedores candidatos (Brasil)</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.vendors.map((v, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold">{v.name}</p>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{v.price_range}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{v.modality}</p>
                <p className="text-xs leading-relaxed">{v.why_fit}</p>
                {v.contact_url && (
                  <a href={v.contact_url} target="_blank" rel="noopener" className="mt-2 inline-block text-[11px] text-primary underline">
                    {v.contact_url} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
          {r.internal_alternative && (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Alternativa interna (sem fornecedor)
              </p>
              <p className="text-xs leading-relaxed">{r.internal_alternative}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {r.prerequisites && r.prerequisites.length > 0 && (
          <div>
            <SectionLabel>Pré-requisitos</SectionLabel>
            <ul className="space-y-2">
              {r.prerequisites.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-primary/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.leading_indicators && r.leading_indicators.length > 0 && (
          <div>
            <SectionLabel>KPIs intermediários</SectionLabel>
            <div className="space-y-2">
              {r.leading_indicators.map((m, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-semibold">{m.metric}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Meta: {m.target} · {m.measurement}
                  </p>
                </div>
              ))}
            </div>
            {r.monitoring_cadence && (
              <p className="mt-2 text-xs italic text-muted-foreground">Cadência: {r.monitoring_cadence}</p>
            )}
          </div>
        )}
      </div>

      {r.implementation_risks && r.implementation_risks.length > 0 && (
        <div>
          <SectionLabel>Riscos de execução e mitigação</SectionLabel>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {r.implementation_risks.map((ir, i) => (
              <div key={i} className="p-4">
                <p className="text-sm font-semibold flex items-start gap-2">
                  <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  {ir.risk}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground pl-6">
                  <span className="font-semibold text-foreground">Mitigação: </span>{ir.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabHowMuch({ r }: { r: AIRecommendation }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <div className="bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Investimento anual</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{r.investment?.total_annual ?? "—"}</p>
          {r.investment?.per_employee_month && (
            <p className="mt-1 text-xs text-muted-foreground">{r.investment.per_employee_month}</p>
          )}
        </div>
        <div className="bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Período de payback</p>
          <p className="text-3xl font-bold tracking-tight text-primary">{r.expected_return?.payback_period ?? "—"}</p>
        </div>
      </div>

      {r.investment?.breakdown && (
        <div>
          <SectionLabel>Detalhamento do investimento</SectionLabel>
          <p className="text-sm leading-relaxed text-foreground/90">{r.investment.breakdown}</p>
        </div>
      )}

      {(r.expected_return?.conservative || r.expected_return?.optimistic) && (
        <div>
          <SectionLabel>Cenários de retorno</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {r.expected_return?.conservative && r.expected_return.conservative !== "N/D" && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Conservador</p>
                <p className="text-sm leading-relaxed">{r.expected_return.conservative}</p>
              </div>
            )}
            {r.expected_return?.optimistic && r.expected_return.optimistic !== "N/D" && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Otimista</p>
                <p className="text-sm leading-relaxed">{r.expected_return.optimistic}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fundamentação determinística: cada número com fórmula + fonte */}
      {r.facts?.financials && (
        <div>
          <SectionLabel>Fundamentação dos números</SectionLabel>
          <div className="space-y-2">
            <FactRow f={r.facts.financials.inactionCost} />
            <FactRow f={r.facts.financials.investment} />
            {r.facts.financials.expectedReturnConservative && (
              <FactRow f={r.facts.financials.expectedReturnConservative} />
            )}
            {r.facts.financials.expectedReturnOptimistic && (
              <FactRow f={r.facts.financials.expectedReturnOptimistic} />
            )}
          </div>
          <p className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-[11px] italic leading-relaxed text-muted-foreground">
            {r.facts.financials.effectivenessNote}
          </p>
        </div>
      )}
    </div>
  );
}

function FactRow({
  f,
}: {
  f: { label: string; value: string; source: string; formula?: string };
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{f.label}</p>
        <p className="shrink-0 text-sm font-bold text-foreground">{f.value}</p>
      </div>
      {f.formula && (
        <p className="mt-1 font-mono text-[10px] leading-snug text-muted-foreground">
          {f.formula}
        </p>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">Fonte: {f.source}</p>
    </div>
  );
}

/* ═══════════════════════════════════════
   SUBCOMPONENTES AUXILIARES
═══════════════════════════════════════ */

function KpiCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon name={icon} size={13} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[13px] font-semibold leading-snug text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

const RELEVANCE_LABEL: Record<string, { label: string; cls: string }> = {
  primary:   { label: "Primária",   cls: "bg-primary/10 text-primary" },
  secondary: { label: "Secundária", cls: "bg-muted text-muted-foreground" },
  context:   { label: "Contexto",   cls: "bg-muted/50 text-muted-foreground/80" },
};

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  guideline:         "Diretriz",
  systematic_review: "Revisão sistemática",
  meta_analysis:     "Meta-análise",
  rct:               "Ensaio randomizado",
  observational:     "Observacional",
  government_data:   "Dado oficial",
  theoretical:       "Teórico",
  validation_study:  "Validação",
  book:              "Livro",
};

function ReferenceItem({ reference }: { reference: KbReferenceWithRelevance }) {
  const rel = RELEVANCE_LABEL[reference.relevance] ?? RELEVANCE_LABEL.secondary;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[9px] ${rel.cls}`}>{rel.label}</Badge>
        <Badge variant="outline" className="text-[9px]">
          {EVIDENCE_TYPE_LABEL[reference.evidence_type] ?? reference.evidence_type}
        </Badge>
        {reference.certainty_level && (
          <Badge variant="outline" className="text-[9px]">Certeza {reference.certainty_level}</Badge>
        )}
        {reference.region === "brazil" && (
          <Badge variant="outline" className="text-[9px]">BR</Badge>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">[{reference.citation_key}]</span>
      </div>
      <p className="leading-snug">{reference.abnt_citation}</p>
      {reference.specific_claim && (
        <p className="mt-1.5 rounded border-l-2 border-primary/40 bg-muted/40 p-1.5 pl-2 italic text-muted-foreground">
          → <strong>Alegação usada:</strong> {reference.specific_claim}
        </p>
      )}
      <a href={reference.url} target="_blank" rel="noopener" className="mt-1.5 inline-block text-[11px] text-primary underline">
        Acessar fonte ↗
      </a>
    </div>
  );
}

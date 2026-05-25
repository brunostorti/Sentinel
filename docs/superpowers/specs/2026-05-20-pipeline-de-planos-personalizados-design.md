# Pipeline de Planos de Ação Personalizados — Design

| Campo | Valor |
|---|---|
| Status | Aprovado pelo brainstorming, pendente de revisão do spec |
| Data | 2026-05-20 |
| Escopo | `src/lib/ai/`, `(dashboard)/configuracoes/perfil`, `(dashboard)/assistente`, `(dashboard)/planos-acao/[id]`, schema do banco (Migration 008) |
| Quebra dados existentes? | Sim — autorizado (app ainda em testes, sem casos reais) |

---

## 1. Sumário executivo

Os planos de ação gerados hoje pelo Sentinel são **genéricos**: uma chamada única ao Claude com um prompt grande e knowledge base monolítica produz recomendações que poderiam servir para qualquer empresa. As fontes de evidência são strings soltas ("Gallup 2023"), o ROI é heurística no próprio prompt, e o plano final não dá ao HR um caminho executável — falta passo-a-passo, fornecedor estruturado, KPIs de acompanhamento, RACI e plano de comunicação.

Este design substitui a geração atual por:

1. **Pipeline multi-step** (Analyst → Curator → Consultant) onde cada estágio tem responsabilidade clara, contrato tipado e prompt focado;
2. **Perfil rico por empresa** (`company_profiles`) capturando orçamento, estrutura RH, perfil dos colaboradores, região e restrições — alimentado por formulário estruturado **e** por enriquecimento progressivo baseado em eventos do sistema (aprovações, rejeições, kanban, chat, próxima pesquisa);
3. **Knowledge base reorganizada** com catálogo tipado, fornecedores brasileiros verificados e casos setoriais;
4. **Loop de aprendizado** com `action_outcomes` que mede automaticamente delta de score entre pesquisas e captura atribuição qualitativa do HR — o que funcionou nesta empresa específica vira sinal para o Curator do próximo ciclo;
5. **Chat duplo** — drawer contextual por plano (refinar, simular) + assistente geral persistente da empresa (visão estratégica), ambos com captura automática de fatos para enriquecer o perfil;
6. **Shape v2 da `AIRecommendation`** com 11 novos blocos de informação executáveis (roadmap, vendors estruturados, leading indicators, stakeholders RACI, riscos de execução, plano de comunicação, evidências reforçadas, compliance estendido).

O resultado é um sistema onde cada empresa recebe planos calibrados pelo seu próprio contexto e que aprendem com o histórico real de impacto.

---

## 2. Contexto e motivação

### 2.1 Estado atual (antes do design)

- Arquivo único `src/lib/ai/generate-action-plans.ts` (~490 linhas) faz **uma chamada** ao Claude com prompt grande contendo: contexto da empresa (3 campos: industry, employee_count, work_regime), dimensões em risco, breakdowns por departamento, tendências, e KB inteira inline.
- `src/lib/ai/knowledge-base.ts` (~750 linhas) é um `Record<universal_category, Intervention[]>` estático. Cada `Intervention` tem `expectedImpact` com `evidenceSource: string` solto (ex: `"Gallup 2023"`).
- `CompanyContext` interface tem só 8 campos no total, dos quais 3 são da empresa em si.
- ROI calculado por fórmula heurística embutida no prompt (`employee_count × 45 × 12` etc.).
- Sem mecanismo de feedback: o sistema nunca descobre se a ação X funcionou na empresa Y.
- Sem persistência de chat ou de profile entre ciclos.
- Shape do `AIRecommendation` tem 13 campos, dos quais nenhum endereça "como executar".

### 2.2 Problemas identificados (priorizados pelo usuário)

**Dor principal: genericidade.** Quatro causas convergentes:
- Input pobre sobre a empresa (3 campos não bastam para personalizar);
- KB flat e não setorial (mesma sugestão para indústria pesada e para startup de tecnologia);
- Knowledge não evolui com o uso (sem memória do que funcionou aqui);
- Prompt único responsável por tudo (diagnóstico + filtragem + redação) sem foco em cada etapa.

### 2.3 Restrições e decisões do usuário

Coletadas no brainstorming (mensagens 1–14 da conversa de 2026-05-20):
- **Eixos de personalização**: todos relevantes (orçamento, maturidade RH, histórico de ações, perfil de colaboradores + região).
- **Conceito de "agente por empresa"**: perfil rico + chat sob demanda (não agente proativo, não somente data estática).
- **Entrada do perfil**: híbrida — formulário estruturado bem feito + enriquecimento progressivo pelo uso.
- **Base de evidências**: knowledge base curada manualmente, com referências reais. Sem RAG, sem busca em tempo real.
- **Escopo do chat**: ambos os modos — chat por plano (focado) + assistente geral (visão ampla, persistente).
- **Feedback de eficácia**: medição automática (delta de score entre pesquisas) + atribuição qualitativa do HR.
- **Pipeline da IA**: multi-step (3 chamadas) — tokens não são restrição neste estágio.
- **Quebra de dados existentes**: autorizada. App ainda em testes, sem casos reais. Sem coexistência V1/V2.

---

## 3. Decisões arquiteturais-chave

| Decisão | Escolha | Justificativa |
|---|---|---|
| Pipeline | Multi-step de 3 chamadas (Analyst → Curator → Consultant) | Cada etapa tem prompt focado, output auditável; reduz alucinação; permite filtros TS entre estágios |
| Filtros de KB | Aplicados em **TypeScript** antes do Curator receber a KB | Restrições duras (orçamento, histórico de falha, constraints) não dependem do LLM lembrar — saem do input se violam regra |
| Profile data model | 1:1 com `companies`, JSONB onde nuance importa | Simplicidade de query; `profile_events` é o log de auditoria/evolução |
| Histórico de ações | Tabela separada (`company_actions_taken`) | Cardinalidade alta, queries por categoria e ano são frequentes |
| Outcomes | 1:1 com `action_plans` enquanto vivos; sobrevivem ao DELETE do plano | Cada plano aprovado gera no máximo um outcome; planos rejeitados não geram; o sinal de aprendizado sobrevive mesmo se HR apagar o plano (campo `intervention_id` preserva identidade) |
| Chat | Threads persistentes + sliding window + rolling summary | UX boa em conversas longas sem custo crescente |
| Captura de fatos do chat | Background job pós-turno, só `confidence='high'` vira sugestão | Evita ruído; sempre passa por confirmação manual do HR |
| Quebra V1/V2 | Sem coexistência — apaga `action_plans` existentes na migration | Simplifica drasticamente o código (sem feature flag, sem componente legado) |
| Custo | ~3x o atual (multi-step + chat + fact-extractor) | Aceito explicitamente pelo usuário; ainda <$0.20 por survey fechada |

---

## 4. Arquitetura geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CAMADA DE DADOS (Supabase)                     │
│  • company_profiles      • chat_threads + chat_messages              │
│  • action_outcomes       • company_actions_taken                     │
│  • profile_events        (KB fica em arquivos TS, não no banco)      │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲ ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   src/lib/ai/  (módulos reorganizados)              │
│                                                                     │
│   pipeline/                                                         │
│     ├─ analyst.ts          (Stage 1: padrões de risco)              │
│     ├─ curator.ts          (Stage 2: filtra KB por contexto)        │
│     ├─ consultant.ts       (Stage 3: detalhamento)                  │
│     ├─ orchestrator.ts     (encadeia + persiste)                    │
│     └─ types.ts            (contratos entre estágios)               │
│                                                                     │
│   profile/                                                          │
│     ├─ schema.ts           (tipos do perfil)                        │
│     ├─ enrichment.ts       (capta deltas de eventos)                │
│     ├─ narrative.ts        (JSONB → prosa para prompts)             │
│     └─ pre-fill.ts         (sugere valores pelo já existente)       │
│                                                                     │
│   chat/                                                             │
│     ├─ thread.ts           (lifecycle de threads)                   │
│     ├─ context-builder.ts  (system prompt por kind)                 │
│     ├─ fact-extractor.ts   (extração pós-turno em background)       │
│     └─ summary.ts          (rolling summary > 100 mensagens)        │
│                                                                     │
│   learning/                                                         │
│     └─ outcomes.ts         (mede delta + atribuição)                │
│                                                                     │
│   knowledge-base/                                                   │
│     ├─ catalog.ts          (intervenções tipadas)                   │
│     ├─ providers-br.ts     (fornecedores brasileiros verificados)   │
│     ├─ cases/<setor>.ts    (casos por setor: industrial, tech, ...) │
│     └─ filters.ts          (hard-filters em TS)                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲ ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          APP / UI                                    │
│  • /configuracoes/perfil      (formulário estruturado, 4 tabs)      │
│  • /planos-acao/[id]          (plano shape v2 + drawer chat)        │
│  • /assistente                (chat geral persistente)              │
│  • /relatorios/eficacia       (tabela de eficácia das ações)        │
│  • Modais: atribuição, outcome kanban, sugestões pendentes          │
│  • Banners: setup, atribuição, sugestões                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.1 Princípios de design

- **Cada estágio do pipeline em 1 arquivo**, input/output tipados, testável isoladamente.
- **KB sai do monolito** atual (`knowledge-base.ts`, 750 linhas) e vira módulos especializados por preocupação.
- **Profile é a memória da empresa** — alimentado por formulário **e** por eventos do sistema, sempre com confirmação humana antes de aplicar inferências da IA.
- **Pipeline stateless por execução**, mas lê todo o estado persistente (perfil, histórico, outcomes) no início.
- **Chat usa o mesmo perfil** — o que o HR menciona na conversa pode atualizar o perfil (com confirmação).
- **Sem coexistência V1/V2** — `action_plans` é truncado na migration, código antigo apagado.

---

## 5. Shape `AIRecommendation` v2

Substitui completamente o shape atual. Sem campo `schema_version` — só este shape existe.

```ts
interface AIRecommendation {
  // ─── Convencimento ───
  title: string;                            // ação concreta, ≤80 chars
  description: string;                      // resumo executivo, 3-4 frases
  quick_action: string;                     // primeiros 30 dias, 1-2 frases
  rationale: string;                        // por que ISSO para ESTA empresa (cita perfil)

  // ─── Execução ───
  roadmap: {
    phase: string;                          // "Semana 1-2", "Mês 1", "Mês 2-3"
    deliverable: string;
    owner_role: string;
  }[];
  prerequisites: string[];                  // o que precisa existir antes de começar
  time_to_first_value: string;              // "primeiros sinais em ~60 dias"
  internal_capacity_required: string;       // "1 pessoa RH ~4h/semana por 3 meses"

  // ─── Pessoas (RACI) ───
  stakeholders: {
    accountable: string;                    // aprova / responde (1 só)
    responsible: string[];                  // executa
    consulted: string[];                    // opinião antes da decisão
    informed: string[];                     // recebe atualização periódica
  };

  // ─── Fornecedor ───
  vendors: {
    name: string;                           // "Zenklub", "Vittude", etc.
    modality: string;                       // "teleterapia B2B", "plataforma SaaS"
    price_range: string;                    // "R$35-60/colab/mês"
    contact_url: string | null;
    why_fit: string;                        // por que cabe NESSA empresa
  }[];
  internal_alternative: string | null;      // variante sem fornecedor externo

  // ─── Acompanhamento ───
  leading_indicators: {
    metric: string;                         // "taxa de adesão ao programa"
    target: string;                         // ">40% nos primeiros 90 dias"
    measurement: string;                    // como medir + cadência
  }[];
  monitoring_cadence: string;               // "comitê quinzenal nos 60 primeiros dias"

  // ─── Comunicação ───
  communication_plan: {
    channels: string[];                     // ["e-mail all-hands", "town hall"]
    key_message: string;
    timing: string;                         // "1 semana antes do lançamento"
  };

  // ─── Custos & retorno ───
  investment: {
    total_annual: string;
    per_employee_month: string;
    breakdown: string;                      // cálculo transparente
  };
  expected_return: {
    conservative: string;
    optimistic: string;
    payback_period: string;
  };

  // ─── Impacto + evidência reforçada ───
  impact_metrics: {
    metric: string;
    change: string;                         // "-15 a -25%"
    evidence: {
      study_or_case: string;
      year: number;
      url_or_doi: string | null;
      br_context: string | null;            // contexto brasileiro quando houver
    };
  }[];

  // ─── Riscos ───
  risk_if_not_acted: string;                // custo de NÃO fazer
  implementation_risks: {                   // o que dá errado AO executar
    risk: string;
    mitigation: string;
  }[];

  // ─── Compliance ───
  nr1_compliance: string | null;
  compliance_extra: string[];               // ["LGPD - dado de saúde", "NR-17 ergonomia"]
}
```

### 5.1 Campos do shape atual que são removidos

- `estimated_impact: string` → substituído por `impact_metrics` (estruturado) + `leading_indicators`.
- `suggested_role: string` → substituído por `stakeholders` (RACI completo).

### 5.2 Metadata fora da `recommendation`

Continua em colunas próprias de `action_plans` (mantidas): `priority`, `effort`, `timeframe`, `target_department`, `risk_level`, `universal_category_id`.

---

## 6. Schema do banco — Migration 008

> **Nota de numeração**: o projeto já tem `supabase/migrations/007_relax_action_plan_constraints.sql` em main. Este trabalho ocupa o slot **008** (`008_personalized_plans_pipeline.sql`). Toda menção a "Migration 008" no documento refere-se a este arquivo.

Tabelas criadas. `knowledge_base` NÃO é tabela — fica em arquivos TS.

```sql
-- ─── 0. Truncar action_plans (autorizado pelo usuário) ───
DELETE FROM kanban_tasks WHERE action_plan_id IS NOT NULL;
DELETE FROM action_plans;

-- ─── 1. company_profiles  (1:1 com companies) ───
CREATE TABLE company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE NOT NULL REFERENCES companies ON DELETE CASCADE,

  -- Orçamento
  annual_budget_brl numeric,
  budget_per_employee_year_brl numeric,
  budget_horizon text,                       -- 'ano_corrente' | '12_meses' | 'bienio'
  budget_flexibility text,                   -- 'rigid' | 'flexible' | 'unlocked_for_critical'
  existing_wellbeing_spend_brl numeric,

  -- Estrutura/maturidade do RH
  hr_team_size int,
  has_dedicated_hr boolean,
  has_internal_training boolean,
  has_occupational_health boolean,
  has_compliance_officer boolean,
  decision_speed text,                       -- 'fast' | 'normal' | 'slow'
  culture_type text,                         -- 'startup'|'family'|'corporate'|'public'|'multinational'|'other'
  declared_values text[],

  -- Colaboradores + região
  workforce_composition jsonb,               -- {avg_age, education, regime_split, shift_pattern}
  predominant_role_type text,                -- 'office'|'industrial'|'field'|'mixed'|'remote'
  regions text[],                            -- UFs onde opera
  has_remote boolean,
  has_shift_workers boolean,
  has_unionized_workers boolean,

  -- Restrições/preferências
  constraints text[],
  preferred_modalities text[],
  avoid_modalities text[],

  -- Flags "HR já revisou este campo" (mesmo se ficou vazio) para setup_completeness
  regions_reviewed_at timestamptz,
  constraints_reviewed_at timestamptz,
  preferred_modalities_reviewed_at timestamptz,
  workforce_composition_reviewed_at timestamptz,

  setup_completeness numeric DEFAULT 0,      -- 0-100, recalculado a cada update
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger: cria company_profile vazio quando company é criada
CREATE OR REPLACE FUNCTION create_company_profile_on_company_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_profiles (company_id) VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_profile_autocreate
AFTER INSERT ON companies
FOR EACH ROW EXECUTE FUNCTION create_company_profile_on_company_insert();

-- Backfill: cria profiles vazios para empresas existentes
INSERT INTO company_profiles (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- ─── 2. company_actions_taken  (histórico) ───
CREATE TABLE company_actions_taken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  universal_category_id uuid REFERENCES universal_categories,
  year_started int,
  year_ended int,
  outcome text,                              -- 'successful'|'partial'|'unsuccessful'|'abandoned'|'in_progress'|'unknown'
  outcome_notes text,
  source text NOT NULL,                      -- 'manual_entry'|'sentinel_kanban'|'sentinel_outcome'
  linked_action_plan_id uuid REFERENCES action_plans ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON company_actions_taken(company_id, universal_category_id);

-- ─── 3. chat_threads ───
CREATE TABLE chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies ON DELETE CASCADE,
  kind text NOT NULL,                        -- 'plan' | 'company'
  resource_id uuid,                          -- action_plans.id se kind='plan'
  created_by_user_id uuid NOT NULL REFERENCES users,
  title text,                                -- auto-gerado
  summary text,                              -- rolling summary > 100 mensagens
  message_count int DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON chat_threads(company_id, kind, resource_id);

-- ─── 4. chat_messages ───
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads ON DELETE CASCADE,
  role text NOT NULL,                        -- 'user' | 'assistant' | 'system'
  content text NOT NULL,
  metadata jsonb,                            -- citations, tool calls futuras
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON chat_messages(thread_id, created_at);

-- ─── 5. action_outcomes  (loop de eficácia) ───
-- Sobrevive à exclusão do plano (ON DELETE SET NULL) para preservar sinal de
-- aprendizado: se o plano foi tentado e não funcionou, queremos lembrar disso
-- no próximo ciclo mesmo que o HR tenha apagado o card.
CREATE TABLE action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies ON DELETE CASCADE,
  action_plan_id uuid REFERENCES action_plans ON DELETE SET NULL,

  -- Identificação da intervenção independente do FK do plano (sobrevive a delete):
  intervention_id text NOT NULL,             -- slug estável do catálogo (ex: 'workload.task-redistribution')
  universal_category_id uuid REFERENCES universal_categories,

  dimension_id uuid NOT NULL REFERENCES questionnaire_scales,

  survey_id_before uuid NOT NULL REFERENCES surveys,
  score_before numeric NOT NULL,

  survey_id_after uuid REFERENCES surveys,   -- nullable até próxima pesquisa fechar
  score_after numeric,
  delta numeric,
  delta_computed_at timestamptz,

  outcome_status text,                       -- 'pending'|'computed'|'unmeasurable'|'anonymity_blocked'

  hr_attribution text,                       -- 'high'|'medium'|'low'|'none'|'cannot_tell'
  hr_notes text,
  attribution_collected_at timestamptz,
  attribution_user_id uuid REFERENCES users,
  attribution_skip_count int DEFAULT 0,      -- 2 skips → cannot_tell automático

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Unicidade: um outcome por (plano vivo, dimensão).
-- Quando action_plan_id vira NULL (plano deletado), múltiplas linhas com NULL podem coexistir.
CREATE UNIQUE INDEX action_outcomes_alive_unique
  ON action_outcomes(action_plan_id, dimension_id)
  WHERE action_plan_id IS NOT NULL;
CREATE INDEX ON action_outcomes(company_id, intervention_id);
CREATE INDEX ON action_outcomes(company_id, universal_category_id);
CREATE INDEX ON action_outcomes(survey_id_after) WHERE survey_id_after IS NULL;

-- ─── 6. profile_events  (timeline de enriquecimento) ───
CREATE TABLE profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies ON DELETE CASCADE,
  event_type text NOT NULL,                  -- 'initial_setup'|'manual_edit'|'ai_suggested_from_chat'|'ai_suggested_from_rejection'|...
  field_path text NOT NULL,                  -- "annual_budget_brl", "constraints"
  old_value jsonb,
  new_value jsonb,
  source_context text,
  confidence text,                           -- 'high'|'medium'|'low' (só para ai_suggested_*)
  confirmed_by_user_id uuid REFERENCES users,
  confirmed_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON profile_events(company_id, confirmed_at, rejected_at)
  WHERE confirmed_at IS NULL AND rejected_at IS NULL;

-- ─── 7. RLS ───  (padrão idêntico ao resto do app — SUPER_ADMIN sempre bypassa)

-- company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_profiles_select ON company_profiles FOR SELECT
  USING (company_id = current_company_id());
CREATE POLICY company_profiles_update ON company_profiles FOR UPDATE
  USING (company_id = current_company_id() AND current_user_role() IN ('ADMIN','HR'));

-- company_actions_taken
ALTER TABLE company_actions_taken ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_actions_select ON company_actions_taken FOR SELECT
  USING (company_id = current_company_id());
CREATE POLICY company_actions_write ON company_actions_taken FOR ALL
  USING (company_id = current_company_id() AND current_user_role() IN ('ADMIN','HR'));

-- chat_threads
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_threads_select ON chat_threads FOR SELECT
  USING (company_id = current_company_id());
CREATE POLICY chat_threads_write ON chat_threads FOR ALL
  USING (company_id = current_company_id() AND current_user_role() IN ('ADMIN','HR','MANAGER'));

-- chat_messages — company_id é INDIRETO (via thread). Join obrigatório.
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_threads t
    WHERE t.id = chat_messages.thread_id
      AND t.company_id = current_company_id()
  ));
CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_threads t
    WHERE t.id = chat_messages.thread_id
      AND t.company_id = current_company_id()
      AND current_user_role() IN ('ADMIN','HR','MANAGER')
  ));

-- action_outcomes — atribuição só por ADMIN/HR (MANAGER lê mas não atribui)
ALTER TABLE action_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_outcomes_select ON action_outcomes FOR SELECT
  USING (company_id = current_company_id());
CREATE POLICY action_outcomes_update ON action_outcomes FOR UPDATE
  USING (company_id = current_company_id() AND current_user_role() IN ('ADMIN','HR'));

-- profile_events — qualquer ADMIN/HR vê e confirma; MANAGER read-only
ALTER TABLE profile_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_events_select ON profile_events FOR SELECT
  USING (company_id = current_company_id());
CREATE POLICY profile_events_write ON profile_events FOR ALL
  USING (company_id = current_company_id() AND current_user_role() IN ('ADMIN','HR'));
```

**Notas sobre RLS:**
- `current_company_id()` e `current_user_role()` são helpers SQL já existentes no projeto (definidos em migrations anteriores).
- SUPER_ADMIN bypassa todas via `WITH USING (current_user_role() = 'SUPER_ADMIN' OR <regra>)` — padrão herdado, aplicado nas policies em produção.
- MANAGER tem read-only em `profile_events` e `action_outcomes` (não atribui), pode interagir no `chat_threads`/`chat_messages` (próprias threads).
- Operações server-side via `createAdminClient()` (em endpoints autenticados) bypassam RLS — usadas pelo pipeline e pelo fact-extractor que rodam fora do contexto do usuário.

### 6.1 Cálculo de `setup_completeness`

Função TS (não trigger SQL — fica mais legível e testável):

```ts
// src/lib/ai/profile/completeness.ts
const REQUIRED_FIELDS: (keyof CompanyProfile)[] = [
  'annual_budget_brl',
  'budget_horizon',
  'has_dedicated_hr',
  'decision_speed',
  'culture_type',
  'predominant_role_type',
  'has_remote',
  'has_shift_workers',
];

// Campos opcionais que CONTAM se foram tocados (mesmo que array vazio é OK).
// Para distinguir "nunca tocado" de "tocado e ficou vazio", usamos uma flag
// `*_reviewed_at` quando o HR salva o formulário.
const REVIEWED_FIELDS: (keyof CompanyProfile)[] = [
  'regions_reviewed_at',
  'constraints_reviewed_at',
  'preferred_modalities_reviewed_at',
  'workforce_composition_reviewed_at',
];

export function computeCompleteness(profile: CompanyProfile): number {
  const required = REQUIRED_FIELDS.map(k => profile[k] !== null && profile[k] !== undefined);
  const reviewed = REVIEWED_FIELDS.map(k => profile[k] !== null);
  const all = [...required, ...reviewed];
  return Math.round((all.filter(Boolean).length / all.length) * 100);
}
```

Os campos `*_reviewed_at timestamptz` são adicionados ao schema de `company_profiles` (Migration 008). O endpoint `/api/profile/update` os preenche com `now()` quando o respectivo array é alterado, mesmo que para `[]`. Isso resolve o "HR revisou e decidiu que está vazio" sem ficar adivinhando.

Recalculado a cada `update_company_profile` e gravado na coluna `setup_completeness` para não precisar recomputar em renders.

---

## 7. Pipeline multi-step

### 7.1 Fluxograma

```
TRIGGER: survey fecha → triggerActionPlanGeneration()
                              │
                              ▼
       Buscador de contexto (TS puro, sem LLM)
       • scores das dimensões + department breakdowns + trends
       • company_profiles + company_actions_taken + action_outcomes
                              │
                              ▼
       STAGE 1 — Analyst   (Sonnet, ~2-3k in / ~1k out)
       Entrada: scores + trends + perfil-compacto + breakdowns
       Saída:   AnalystReport (padrões, prioridades, raízes sistêmicas)
                              │
                              ▼
       Hard-filters em TS  (knowledge-base/filters.ts)
       • orçamento • RH disponível • histórico de falha • constraints
       • outcomes positivos → 'preferred'   negativos → 'excluded'
                              │
                              ▼
       STAGE 2 — Curator   (Sonnet, ~4-6k in / ~2k out)
       Entrada: AnalystReport + perfil completo + histórico +
                 outcomes + KB JÁ FILTRADA E ANOTADA
       Saída:   CuratedSelection (1-2 candidatos/dimensão + rationale)
                              │
                              ▼
       STAGE 3 — Consultant   (Sonnet, ~5-7k in / ~4-6k out)
       Entrada: CuratedSelection + perfil + vendors-BR + KB
       Saída:   AIRecommendation[] (shape v2 completo)
                              │
                              ▼
       Persistência: INSERT action_plans + action_outcomes
                              │
                              ▼
       Log de trajectória em profile_events
       (event_type='pipeline_run', com tokens/latência por estágio)
```

### 7.2 Contratos entre estágios

```ts
// pipeline/types.ts

export interface AnalystReport {
  prioritized_dimensions: {
    dimension_id: string;
    dimension_name: string;
    universal_category: string;
    score: number;
    risk_level: "RED" | "YELLOW";
    severity: "critica" | "alta" | "media";
    trend: "improving" | "worsening" | "stable" | "first_measurement";
    why_priority: string;
  }[];
  cross_dimension_patterns: {
    pattern_label: string;
    involved_dimensions: string[];
    explanation: string;
  }[];
  systemic_root_causes: string[];
  data_limitations: string[];
}

export interface CuratedSelection {
  candidates: {
    dimension_id: string;
    intervention_id: string;
    fit_score: number;                        // 0-100
    personalization_rationale: string;
    cost_estimate_brl: { min: number; max: number };
    requires_external_vendor: boolean;
    excluded_alternatives: {
      intervention_id: string;
      reason: string;
    }[];
  }[];
  unmet_dimensions: {
    dimension_id: string;
    reason: string;
  }[];
  budget_summary: {
    total_estimated_brl: { min: number; max: number };
    fits_declared_budget: boolean;
    headroom_or_overflow_brl: number;
  };
}

export type ConsultantOutput = AIRecommendation[];
```

### 7.3 Hard-filters (regras em TS)

Aplicados **antes** do Curator. A KB que chega ao prompt já está anotada — o LLM só vê opções viáveis.

```ts
// knowledge-base/catalog.ts — shape de cada intervenção
export interface Intervention {
  intervention_id: string;                   // slug estável: 'workload.task-redistribution'
  universal_category_id: string;             // FK em universal_categories (uuid)
  universal_category_code: string;           // espelho do code para legibilidade ('workload')
  title: string;
  description: string;
  effort: 'baixo' | 'medio' | 'alto';
  timeframe: 'curto_prazo' | 'medio_prazo' | 'longo_prazo';
  target_role: string;
  cost_per_employee: { min: number; max: number };
  required_modality: 'presencial' | 'online' | 'hibrido' | 'any';
  required_hr_capabilities: ('dedicated_hr' | 'internal_training' | 'occupational_health' | 'compliance_officer')[];
  expected_impact: { metric: string; change_percent: number; evidence_source: string }[];
  sector_fit: string[];                      // setores onde tem mais evidência de funcionar
}

// knowledge-base/filters.ts
export interface AnnotatedIntervention extends Intervention {
  status: 'preferred' | 'candidate' | 'excluded';
  status_reason: string | null;
}

export function filterAndAnnotate(
  catalog: Intervention[],
  profile: CompanyProfile,
  history: CompanyActionsTaken[],
  outcomes: ActionOutcome[]
): AnnotatedIntervention[] {
  return catalog.map(iv => {
    // Exclusões duras
    if (overBudget(iv, profile))             return excluded(iv, "acima do orçamento declarado");
    if (requiresHRWeDontHave(iv, profile))   return excluded(iv, "exige RH/T&D que a empresa não tem");
    if (violatesConstraint(iv, profile))     return excluded(iv, "viola restrição declarada");
    if (sameInterventionFailedHere(iv, outcomes)) return excluded(iv, "tentado antes sem resultado");
    if (modalityAvoided(iv, profile))        return excluded(iv, "modalidade na lista de evitar");

    // Sinal positivo
    if (sameCategoryWorkedHere(iv, outcomes)) {
      return preferred(iv, "linha validada nesta empresa em ciclos anteriores");
    }

    return candidate(iv);
  });
}
```

**`universal_category_code`** (string) coexiste com **`universal_category_id`** (uuid) na `Intervention` por uma única razão: pareamento em prompts e logs fica legível (`'burnout'`) enquanto queries no banco usam o FK. As duas referem o mesmo registro em `universal_categories` — `code` deve ser único na tabela, como já é hoje.

### 7.4 Falhas e custo

| Falha | Tratamento |
|---|---|
| Timeout Stage 1 (45s) | Aborta pipeline, marca survey com `ai_generation_status='failed'`, log em `profile_events` |
| Falha JSON Stage 1 | Parser tolerante (mesma estratégia do arquivo atual) → última tentativa fallback |
| Falha Stage 2 | Retry sem KB anotada (KB completa) — mais lento mas funciona |
| Falha Stage 3 para um plano | Outros planos salvam; o que falhou vira `status='AI_GENERATION_FAILED'` no banco |

**Custo estimado**: ~$0.05–0.10 por survey fechada (3x o atual; ainda <$0.20).

### 7.5 Reorganização de arquivos

```
src/lib/ai/
├── pipeline/
│   ├── analyst.ts
│   ├── curator.ts
│   ├── consultant.ts
│   ├── orchestrator.ts                       # entry-point; substitui generate-action-plans.ts
│   └── types.ts
├── profile/
│   ├── schema.ts
│   ├── enrichment.ts
│   ├── narrative.ts
│   └── pre-fill.ts
├── chat/
│   ├── thread.ts
│   ├── context-builder.ts
│   ├── fact-extractor.ts
│   └── summary.ts
├── learning/
│   └── outcomes.ts
└── knowledge-base/
    ├── catalog.ts
    ├── providers-br.ts
    ├── cases/
    │   ├── industrial.ts
    │   ├── tech.ts
    │   ├── healthcare.ts
    │   ├── retail.ts
    │   └── public-sector.ts
    └── filters.ts
```

Arquivos atuais a **deletar**: `src/lib/ai/generate-action-plans.ts`, `src/lib/ai/knowledge-base.ts` (conteúdo migrado para `catalog.ts` + `providers-br.ts`). `trigger-generation.ts` é **modificado** para chamar `orchestrator.runPipeline()`.

### 7.6 Re-execução, cancelamento, idempotência

Cenários que afetam o pipeline e precisam de tratamento explícito:

**Coluna nova em `surveys`** (parte da Migration 008):

```sql
ALTER TABLE surveys
  ADD COLUMN ai_generation_status text DEFAULT 'not_started',
  -- 'not_started'|'queued'|'running'|'completed'|'failed'|'cancelled'
  ADD COLUMN ai_generation_run_id uuid,        -- identificador da execução atual
  ADD COLUMN ai_generation_started_at timestamptz,
  ADD COLUMN ai_generation_finished_at timestamptz,
  ADD COLUMN ai_generation_error text;
```

**Idempotência (race condition de webhook duplicado / re-fechamento):**
- `orchestrator.runPipeline()` faz `UPDATE surveys SET ai_generation_status='running', ai_generation_run_id=gen_random_uuid() WHERE id=$1 AND ai_generation_status NOT IN ('running')` com RETURNING. Se 0 linhas retornaram, alguém já está rodando — aborta com log.
- Insert de planos é envolto em transação: `DELETE FROM action_plans WHERE survey_id=$1 AND status='PENDING_REVIEW'` + `INSERT...` na mesma transação. Aprovações anteriores nunca são tocadas.

**Survey reaberta** (HR clica "reabrir" após `closed`):
- `surveys.status` volta para `active`, `ai_generation_status` volta para `not_started`, mas `action_plans` aprovados **persistem** (não deletamos histórico).
- Quando a survey fechar de novo, o pipeline roda: planos PENDING anteriores são descartados; planos aprovados continuam, mas o pipeline cria planos novos para complementar.
- `action_outcomes` em aberto (com `survey_id_before=esta_survey`) NÃO são afetados — continuam aguardando o próximo ciclo de comparação (uma survey posterior).

**Cancelamento manual** (HR clica "cancelar geração" enquanto roda):
- `POST /api/action-plans/cancel` faz `UPDATE surveys SET ai_generation_status='cancelled' WHERE id=$1 AND ai_generation_status='running'`.
- Cada estágio do orchestrator verifica `ai_generation_status` antes/depois da chamada Claude (poll a cada estágio). Se `cancelled`, aborta limpa sem persistir nada.
- `AbortController` é passado para a SDK Anthropic para abortar a request HTTP em voo quando possível.

**Retry manual** após falha:
- `POST /api/action-plans/regenerate` resseta `ai_generation_status='not_started'`, limpa `ai_generation_error` e re-enfileira a execução.
- HR vê botão "Tentar de novo" no painel se `ai_generation_status='failed'`. Endpoint exige role ADMIN/HR.

**Limpeza de planos PENDING órfãos** (e.g. crash no meio do pipeline):
- Job recorrente (ou cleanup no início do pipeline): `DELETE FROM action_plans WHERE status='PENDING_REVIEW' AND created_at < now() - interval '24 hours' AND survey.ai_generation_status NOT IN ('running','completed')`.

---

## 8. Perfil + enriquecimento progressivo

### 8.1 Formulário estruturado

Página `/configuracoes/perfil` com 4 tabs (somente perfil estruturado — listas grandes como histórico vão para subpágina dedicada):

1. **Orçamento** — `annual_budget_brl`, `budget_horizon`, `budget_flexibility`, `existing_wellbeing_spend_brl`
2. **Estrutura RH** — `has_dedicated_hr`, `hr_team_size`, `has_internal_training`, `has_occupational_health`, `has_compliance_officer`, `decision_speed`, `culture_type`, `declared_values`
3. **Colaboradores e Região** — `predominant_role_type`, `has_remote`, `has_shift_workers`, `has_unionized_workers`, `regions`, `workforce_composition` (opcional/avançado)
4. **Restrições e Preferências** — `constraints`, `preferred_modalities`, `avoid_modalities`

Rodapé sticky com meter `setup_completeness` ("Perfil 67% completo") e botão "Salvar".

**Subpágina dedicada — `/configuracoes/perfil/historico`**

Lista de `company_actions_taken` separada das tabs porque cresce indefinidamente e tem CRUD próprio. Acessada via link "Histórico de ações tentadas" no rodapé do formulário principal.

```
┌── /configuracoes/perfil/historico ───────────────────────────────────┐
│  Ações já tentadas pela empresa                  [+ Adicionar ação]  │
│  ─────────────────────────────────────────────────────────────────   │
│  ┌─ Card ─────────────────────────────────────────────────────────┐  │
│  │ Programa de teleterapia 2024                                    │  │
│  │ Categoria: Saúde mental / burnout                               │  │
│  │ 2024 — 2024  •  Origem: manual_entry                            │  │
│  │ Resultado: Parcialmente bem-sucedido                            │  │
│  │ "baixa adesão (12%), trocamos por psicólogo presencial"         │  │
│  │                                              [✏ editar] [🗑]    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌─ Card ─────────────────────────────────────────────────────────┐  │
│  │ Programa de ginástica laboral                                   │  │
│  │ Origem: sentinel_kanban  •  Plano: #234                         │  │
│  │ ...                                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Filtros: [▼ Categoria] [▼ Ano] [▼ Origem] [▼ Resultado]            │
└───────────────────────────────────────────────────────────────────────┘
```

Origem `sentinel_kanban` e `sentinel_outcome` são read-only (só notas editáveis). Origem `manual_entry` é totalmente editável.

### 8.2 Setup inicial — nudge, sem obstrução

- Quando uma empresa é criada (pelo Super Admin), o profile **nasce vazio** automaticamente (via trigger DB).
- Banner persistente no `/painel` enquanto `setup_completeness < 60%`:
  > ⚙ Seu perfil está {N}% completo. Planos podem ficar genéricos. [Completar agora]
- Não bloqueia nada. HR pode criar pesquisa e gerar planos com perfil vazio — o `rationale` do plano vai mencionar a limitação.

### 8.3 Pre-fill ("Sugerir valores")

Em cada tab do formulário, botão `🪄 Sugerir valores`. Faz uma chamada Sonnet pequena (~1k tokens) com:
- `companies.industry`, `companies.employee_count`, `companies.work_regime`
- Departments existentes
- (se houver) Surveys passadas

Output: valores propostos pré-preenchidos com badge "sugerido". HR ajusta ou aceita. Nada salva sem clicar "Salvar".

Exemplos:
- Indústria + 200+ colaboradores + CLT → sugere `predominant_role_type='industrial'`, `has_shift_workers=true`, `culture_type='corporate'`
- Tech/startup + <50 colaboradores → sugere `decision_speed='fast'`, `culture_type='startup'`, `has_dedicated_hr=false`

### 8.4 Enriquecimento progressivo — gatilhos

| Evento | O que a IA captura | Onde grava | Confirmação |
|---|---|---|---|
| HR aprova plano | Faixa de orçamento usada | `profile_events` (pending) se diverge | Modal "Esse plano usa R$X. Seu orçamento ainda é R$Y?" |
| HR rejeita plano | Motivo (tags + textarea) | `profile_events` (já confirmado, é manual) | Tags viram `constraints` ou `avoid_modalities` |
| Kanban task → Concluído | Outcome qualitativo | `company_actions_taken` (`source='sentinel_kanban'`) | Modal: 4 opções + notas |
| Próxima pesquisa fecha | Delta nas dimensões com planos anteriores | `action_outcomes` (score_after, delta) | Em background |
| Outcomes calculados | Para deltas >5pts: atribuição do HR | `action_outcomes` (hr_attribution, hr_notes) | Banner no painel → modal sequencial |
| HR menciona fato no chat | Fato candidato com `confidence='high'` | `profile_events` (pending) | Badge no header → drawer de sugestões |

### 8.5 Confirmação de sugestões IA

Sugestões NUNCA são auto-aplicadas. Fluxo:

1. IA detecta fato/divergência → cria `profile_events` com `confirmed_by_user_id=NULL`, `rejected_at=NULL`
2. Badge no header: "⚙ 2 atualizações sugeridas" (mostra "9+" quando >9)
3. Click → drawer lateral com cards: valor antigo → valor proposto, origem, [Aceitar] [Rejeitar] [Editar]
4. **Aceitar** → escreve em `company_profiles`, marca evento como confirmado
5. **Rejeitar** → marca `rejected_at=now()`, NÃO aplica (registro de auditoria)
6. **Editar** → HR fornece valor custom, aplica esse valor, marca confirmado
7. **Rejeitar todas** → botão único no rodapé do drawer (todas as pendentes do mesmo HR viram rejected)

**Deduplicação (uma pendente por campo):**

Quando o fact-extractor cria nova sugestão para `field_path` que já tem pendente:
```sql
-- Antes de INSERT, fecha pendente anterior do mesmo campo como obsoleta
UPDATE profile_events
SET rejected_at = now(),
    event_type = event_type || '_superseded'
WHERE company_id = $1 AND field_path = $2
  AND confirmed_at IS NULL AND rejected_at IS NULL;
-- Depois faz INSERT da nova sugestão.
```
Garante no máximo uma pendente ativa por `(company_id, field_path)`.

**TTL — sugestão pendente expira em 60 dias:**

Job recorrente (ou cleanup no carregamento do drawer):
```sql
UPDATE profile_events
SET rejected_at = now(),
    event_type = 'ai_suggestion_expired'
WHERE created_at < now() - interval '60 days'
  AND confirmed_at IS NULL AND rejected_at IS NULL;
```
Sem isso, a fila vira museu de propostas estagnadas.

**Concorrência — HR edita perfil enquanto fact-extractor escreve sugestão:**

Dois lados precisam cooperar:

*(a) Quando HR salva o formulário:* `/api/profile/update` faz, na mesma transação:
```sql
UPDATE company_profiles SET ...;
-- Auto-rejeita sugestões pendentes para campos que foram tocados no save
UPDATE profile_events
SET rejected_at = now(),
    event_type = 'ai_suggestion_superseded_by_manual_edit'
WHERE company_id = $1
  AND field_path = ANY($2)            -- array dos campos alterados
  AND confirmed_at IS NULL AND rejected_at IS NULL;
```

*(b) Quando fact-extractor vai gravar:* lê o valor corrente do `company_profiles` ANTES de criar o evento. Se o `current_value` proposto na sugestão divergir do valor real (porque HR editou nesse meio-tempo), recalcula `proposed_value` ou descarta a sugestão se ela perdeu o sentido (ex: HR já mudou para o que a IA ia propor).

Resultado: o HR nunca vê uma sugestão que está propondo um valor que ele acabou de definir manualmente.

### 8.6 Tradução para o LLM: `profile/narrative.ts`

JSONB cru não serve para prompt — LLMs respondem melhor a prosa. Função produz:

> "Empresa industrial de médio porte (250 colaboradores, 70% CLT) com operação em SP e MG, sem RH dedicado a saúde ocupacional. Orçamento rígido de R$120k/ano. Em 2024 tentaram programa de teleterapia, baixa adesão (12%), abandonado. Cultura corporativa, decisão lenta. Restrição declarada: não terceirizar comunicação interna."

Usada pelo Stage 1 (compacto, sinais essenciais), Stage 3 (completo) e pelo chat (completo).

---

## 9. Chat

### 9.1 Dois kinds

| | Chat por plano | Assistente geral |
|---|---|---|
| Rota | `/planos-acao/[id]` (drawer lateral) | `/assistente` (página dedicada) |
| Thread | 1 por plano (criada no 1º clique) | 1 por empresa, vive para sempre |
| Contexto | plano + scores survey origem + perfil narrativo + outcomes deste plano | perfil narrativo + todos planos ativos + outcomes históricos + tendências |
| Caso típico | "por que esse fornecedor?" / "alternativa sem app?" / "e se cortar 30% do budget?" | "como estamos vs. último ciclo?" / "qual ação teve mais impacto?" / "monta pitch p/ diretoria" |

### 9.2 Lifecycle de uma mensagem

1. HR escreve no composer
2. `POST /api/chat/send { thread_id?, kind, resource_id?, content }`
3. Server:
   1. Carrega/cria thread
   2. Salva mensagem do user
   3. Constrói contexto: system prompt = personalidade + `perfilNarrativo(profile)` + contexto-específico-do-kind + guardrails
   4. Carrega últimas 30 mensagens OU últimos 8k tokens (o menor)
   5. Chama Claude (streaming)
   6. Salva resposta
   7. Dispara em background: `fact-extractor(turn)` → cria `profile_events` se `confidence='high'`
   8. Atualiza `thread.last_message_at`, `message_count++`; gera `title` na 1ª mensagem
4. Streaming SSE chega no browser

### 9.3 Rolling summary

Quando `message_count > 100`: server gera summary dos primeiros 50 turnos (1 chamada Sonnet pequena) e armazena em `chat_threads.summary`. Próximos prompts carregam summary + últimas 30. Sem isso, conversas longas teriam custo crescente e o LLM esqueceria o início.

### 9.4 Fact-extractor

Pós cada turno do user (não do assistant), background:

```ts
extractFacts({ user_message, assistant_reply, current_profile })
  → { candidate_facts: [{ field_path, current_value, proposed_value, source_quote, confidence }] }
```

- Apenas `confidence='high'` vira `profile_events` pendente.
- Skipa mensagens curtas (≤8 palavras), agradecimentos, perguntas sem afirmação factual.
- Custo extra: ~$0.001 por turno do user.

### 9.5 Guardrails

```
Você é o assistente de saúde ocupacional da empresa <NOME>.

CONTEXTO QUE VOCÊ TEM:
{perfilNarrativo}
{contextoDoKind}

DIRETRIZES:
- Sempre em português brasileiro.
- Cite dados do contexto quando responder. Não invente números.
- Se o HR perguntar algo fora do contexto, peça a informação ou diga que não sabe.
- Não dê diagnósticos médicos individuais.
- Não emita parecer jurídico definitivo — sugira consultar advogado quando aplicável.
- Se o HR mencionar fato novo sobre a empresa, reconheça e responda — o sistema captura
  automaticamente para revisão.
- Tom: consultor sênior pragmático. Direto, sem floreio. Honesto sobre limitações.
```

**Anti-injection**: a API trata mensagens do user sempre como `role: 'user'`. System prompt nunca é exposto. RLS garante que o contexto carregado só contém dados da empresa do HR logado.

### 9.6 Limites

- 100 mensagens por thread (depois força "Iniciar nova conversa", summary preservado).
- 30 mensagens/hora por usuário (rate limit).
- Custo médio por turno: ~$0.01–0.02.
- Streaming em ambas as telas.

---

## 10. Loop de aprendizado

### 10.1 Linha do tempo

```
T0   — Survey #1 fecha → pipeline gera planos → HR aprova plano P1
       INSERT action_outcomes (action_plan_id=P1, dimension_id=burnout,
                                survey_id_before=#1, score_before=42,
                                outcome_status='pending')

T+30d — Kanban task de P1 → Concluído
        Modal: outcome qualitativo (4 opções) + notas
        INSERT company_actions_taken (source='sentinel_kanban',
          outcome='in_progress'|'successful'|'partial'|'unsuccessful',
          linked_action_plan_id=P1)

T+90d — Survey #2 fecha
        learning/outcomes.ts roda em background:
        ├─ para cada action_outcomes (survey_id_after IS NULL, mesma empresa):
        │  • dimension_id existe na #2 com score representativo? → score_after, delta
        │  • dimensão não existe na #2 → outcome_status='unmeasurable'
        │  • dept com <5 respostas → outcome_status='anonymity_blocked'
        ├─ outcomes com |delta| > 5 entram em fila de atribuição
        └─ email pro HR: "X ações com impacto medível, revisar"
        UPDATE action_outcomes SET survey_id_after=#2, score_after=51, delta=9,
                                   outcome_status='computed', delta_computed_at=now()

T+90d+1 — HR abre painel → banner "🎯 3 ações com impacto medível"
          Modal sequencial (1 por plano)
          UPDATE action_outcomes SET hr_attribution='high', hr_notes='...'
          INSERT company_actions_taken (source='sentinel_outcome',
            outcome='successful', linked_action_plan_id=P1)
```

### 10.2 Modal de atribuição (sequencial)

```
┌─ Atribuição de impacto: Plano #234 ────────────────────────────────┐
│  Ação: "Programa de teleterapia com Zenklub"                        │
│  Dimensão impactada: Burnout                                        │
│                                                                      │
│  Comparativo:                                                        │
│    Pesquisa Q4/2025 (antes):    42/100                              │
│    Pesquisa Q1/2026 (depois):   51/100                              │
│    Variação:                    +9 pontos ↑                         │
│                                                                      │
│  Você atribui essa melhora a esta ação?                              │
│    ( ) Alta — foi o motivo principal                                 │
│    ( ) Média — contribuiu, junto com outros fatores                  │
│    ( ) Baixa — pouco impacto direto                                  │
│    ( ) Nenhuma — outros fatores explicam                             │
│    ( ) Não dá para dizer                                             │
│                                                                      │
│  Notas (opcional): [_________________________________________]       │
│                                                                      │
│  [Pular por enquanto]                                  [Confirmar]   │
└──────────────────────────────────────────────────────────────────────┘
```

Mecanismo "pular 2x = `cannot_tell` automático" via `attribution_skip_count`.

### 10.3 Como o Curator usa outcomes

```ts
// pipeline/curator.ts — via knowledge-base/filters.ts
function annotateByOutcomes(
  interventions: Intervention[],
  outcomes: ActionOutcome[]
): AnnotatedIntervention[] {
  return interventions.map(iv => {
    // Outcomes da mesma categoria universal, já com delta computado
    const sameCategory = outcomes.filter(o =>
      o.universal_category_id === iv.universal_category_id &&
      o.delta_computed_at !== null
    );

    // Sinal positivo: categoria já mostrou delta favorável com atribuição razoável
    const positiveProof = sameCategory.some(o =>
      o.delta > 5 && ['high', 'medium'].includes(o.hr_attribution)
    );

    // Sinal negativo: a MESMA intervenção (por intervention_id slug do catálogo)
    // foi tentada e não funcionou (delta não-positivo OU atribuição 'none')
    const negativeProof = sameCategory.some(o =>
      o.intervention_id === iv.intervention_id &&
      (o.delta <= 0 || o.hr_attribution === 'none')
    );

    if (negativeProof) return { ...iv, status: 'excluded', reason: 'tentado antes sem resultado nesta empresa' };
    if (positiveProof) return { ...iv, status: 'preferred', reason: 'linha validada em ciclos anteriores' };
    return { ...iv, status: 'candidate', reason: null };
  });
}
```

**Convenção `intervention_id`**: cada item no `catalog.ts` declara um slug estável `{category}.{kebab-name}` (ex: `'workload.task-redistribution'`, `'burnout.teleterapia-b2b'`). Esse slug:
- É escrito em `action_outcomes.intervention_id` no momento que `orchestrator.ts` insere o outcome (depois do Consultant selecionar).
- É usado para detectar tentativa repetida da MESMA intervenção (não só mesma categoria).
- NÃO muda quando o texto da intervenção é editado no catálogo. Renomear o slug = trocar de identidade (perdemos o link histórico — decisão consciente).

LLM tem instrução de escolher só entre `preferred` e `candidate`, justificando quando rejeita um `preferred`.

### 10.4 Aba "Eficácia das ações"

Nova rota `/relatorios/eficacia`:

```
Eficácia das ações — últimos 12 meses
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ação                                Dimensão         Δ score   Atribuição
─────────────────────────────────────────────────────────────────────────
✓ Teleterapia Zenklub               Burnout          +9        Alta
≈ 1:1 estruturado com gestores      Liderança        +3        Média
✗ Ginástica laboral                  Saúde física    -2        Baixa
⋯ Buddy program                     Social           pendente  —
─────────────────────────────────────────────────────────────────────────
6 ações concluídas • 2 com alto impacto • Δ médio nos sucessos: +6,5 pts
```

Filtros: dimensão, ano, atribuição. Export PDF/CSV.

### 10.5 Métrica derivada: `effectiveness_score`

Calculado on-the-fly (sem persistir):

```
effectiveness_score = Σ(delta × peso_atribuicao) / Σ(planos_executados)
  peso: high=1.0 | medium=0.6 | low=0.3 | none=0 | cannot_tell=0
```

Aparece na narrativa do prompt do Stage 1 ("essa empresa tem perfil de executor consistente" vs. "perfil de quem aprova mas não executa").

### 10.6 Edge cases

| Caso | Tratamento |
|---|---|
| Dimensão sumiu da próxima pesquisa | `outcome_status='unmeasurable'`, não entra na fila |
| Departamento alvo com <5 respostas | `outcome_status='anonymity_blocked'` |
| Múltiplos planos para mesma dimensão | Cada um tem seu outcome; HR atribui reconhecendo overlap |
| Plano aprovado mas nunca virou task no Kanban | Delta calculado mesmo assim; HR provavelmente marca "Nenhuma — nunca executamos" — sinal valioso |
| Pesquisa N+1 fecha antes da ação acontecer | Δ ~0; HR marca "Não dá para dizer" |
| HR rejeita plano | Não gera outcome — só `profile_events` com motivo |

---

## 11. UI, fluxos e endpoints

### 11.1 Mapa de arquivos

```
src/app/
├── (dashboard)/
│   ├── painel/page.tsx                       [MOD] banners: setup, atribuição, sugestões
│   ├── planos-acao/
│   │   ├── page.tsx                          [MOD] usa PlanV2
│   │   └── [id]/page.tsx                     [NOVO] página do plano + drawer chat
│   ├── kanban/page.tsx                       [MOD] modal outcome ao mover p/ Concluído
│   ├── relatorios/
│   │   ├── page.tsx                          [MOD]
│   │   └── eficacia/page.tsx                 [NOVO]
│   ├── configuracoes/
│   │   ├── page.tsx                          [MOD] link p/ perfil
│   │   └── perfil/
│   │       ├── page.tsx                      [NOVO] 4 tabs do perfil
│   │       └── historico/page.tsx            [NOVO] CRUD de company_actions_taken
│   └── assistente/page.tsx                   [NOVO]
└── api/
    ├── profile/
    │   ├── update/route.ts                   [NOVO]
    │   ├── suggest-values/route.ts           [NOVO]
    │   ├── historico/route.ts                [NOVO] GET lista + POST/PUT/DELETE
    │   └── events/
    │       ├── route.ts                      [NOVO] GET pendentes
    │       ├── [id]/route.ts                 [NOVO] POST aceita/rejeita/edita
    │       └── reject-all/route.ts           [NOVO]
    ├── chat/
    │   ├── threads/route.ts                  [NOVO]
    │   └── send/route.ts                     [NOVO] streaming SSE
    ├── action-plans/
    │   ├── generate/route.ts                 [MOD] usa orchestrator (idempotente)
    │   ├── cancel/route.ts                   [NOVO]
    │   ├── regenerate/route.ts               [NOVO]
    │   └── [id]/
    │       ├── approve/route.ts              [NOVO] side-effects: outcomes + kanban + diff orçamento
    │       └── reject/route.ts               [NOVO] side-effects: motivos → constraints
    ├── outcomes/
    │   ├── pending/route.ts                  [NOVO]
    │   ├── attribute/route.ts                [NOVO]
    │   └── skip/route.ts                     [NOVO] 2x = cannot_tell automático
    ├── kanban/
    │   └── tasks/[id]/complete/route.ts      [NOVO] modal outcome → sentinel_kanban
    └── relatorios/
        └── eficacia/
            ├── route.ts                      [NOVO] dados da tabela
            └── export/route.ts               [NOVO] format=pdf|csv

src/components/
├── header.tsx                                [MOD] badge sugestões pendentes
├── plan/
│   ├── plan-v2.tsx                           [NOVO]
│   └── plan-chat-drawer.tsx                  [NOVO]
├── chat/
│   ├── thread-view.tsx                       [NOVO]
│   ├── composer.tsx                          [NOVO]
│   └── message-bubble.tsx                    [NOVO]
├── profile/
│   ├── form-tabs.tsx                         [NOVO]
│   ├── suggestion-drawer.tsx                 [NOVO]
│   └── completeness-meter.tsx                [NOVO]
└── outcomes/
    ├── attribution-modal.tsx                 [NOVO]
    └── kanban-outcome-modal.tsx              [NOVO]

src/lib/ai/
├── pipeline/ ...                              [NOVO] (Seção 7.5)
├── profile/ ...
├── chat/ ...
├── learning/ ...
└── knowledge-base/ ...

Arquivos deletados:
  src/lib/ai/generate-action-plans.ts
  src/lib/ai/knowledge-base.ts
  (componente atual de plano se houver; substituído por plan-v2.tsx)
```

### 11.2 Fluxos típicos

**Primeiro uso (empresa nova):**
1. SUPER_ADMIN cria empresa + HR (`company_profiles` nasce vazio via trigger)
2. HR loga → `/painel` com banner "perfil 0% completo"
3. Click → `/configuracoes/perfil` → "Sugerir valores" → IA pré-preenche
4. HR ajusta, salva → `setup_completeness` sobe
5. HR cria pesquisa, importa CSV, dispara magic links
6. Pesquisa fecha → pipeline multi-step roda
7. HR vê planos shape v2 em `/planos-acao`, clica num plano
8. Pergunta no drawer chat "alternativa sem app?"
9. Aprova plano → vira tasks no Kanban

**Ciclo recorrente (pesquisa N+1):**
1. Pesquisa N+1 fecha
2. Background: `computeOutcomes()` fecha outcomes pendentes
3. Pipeline roda (Stage 1 lê outcomes anteriores)
4. Email pro HR: novos planos + X ações com impacto medível
5. HR abre painel: banner planos novos + banner atribuição
6. HR atribui (modal sequencial) → resultados positivos viram `'preferred'` para o próximo ciclo

**Refinar plano via chat:**
1. HR abre plano X, abre drawer
2. "esse roadmap é agressivo, conseguimos em 6 meses?"
3. Assistente recalcula etapas
4. Fact-extractor pega "conseguimos fazer em 6 meses" → cria sugestão `decision_speed=slow` pendente
5. Badge no header → HR aceita → próximos planos consideram decision_speed=slow

### 11.3 Endpoints

| Método | Rota | Função |
|---|---|---|
| POST | `/api/profile/update` | Salva alterações do formulário (também preenche `*_reviewed_at` e auto-rejeita sugestões pendentes em conflito) |
| POST | `/api/profile/suggest-values` | 1 chamada Sonnet pequena para pre-fill |
| GET | `/api/profile/events?status=pending` | Lista sugestões pendentes |
| POST | `/api/profile/events/:id` | Aceita/rejeita/edita uma sugestão (action: `accept`\|`reject`\|`edit`) |
| POST | `/api/profile/events/reject-all` | Rejeita todas as pendentes da empresa |
| GET | `/api/profile/historico` | Lista paginada de `company_actions_taken` |
| POST | `/api/profile/historico` | CRUD de ações manuais (POST/PUT/DELETE via route handler único) |
| GET | `/api/chat/threads?kind=&resource_id=` | Lista/recupera thread |
| POST | `/api/chat/send` | Mensagem (SSE streaming) |
| POST | `/api/action-plans/generate` | Modificado — orquestra pipeline (idempotente via `ai_generation_run_id`) |
| POST | `/api/action-plans/cancel` | Cancela geração em curso (ADMIN/HR) |
| POST | `/api/action-plans/regenerate` | Re-dispara pipeline após `status='failed'` (ADMIN/HR) |
| POST | `/api/action-plans/:id/approve` | Aprova plano. Side-effects: cria `action_outcomes` (score_before=score atual da dimensão), cria tasks no Kanban, e se o investimento estimado divergir do `annual_budget_brl` declarado, cria `profile_events` pendente |
| POST | `/api/action-plans/:id/reject` | Rejeita plano. Side-effect: abre modal de motivo; tags viram `constraints` ou `avoid_modalities` em `profile_events` (auto-confirmados, origem manual) |
| GET | `/api/outcomes/pending` | Fila de atribuição |
| POST | `/api/outcomes/attribute` | Submete atribuição do HR |
| POST | `/api/outcomes/skip` | Pula 1x; ao 2º skip marca `hr_attribution='cannot_tell'` automaticamente |
| POST | `/api/kanban/tasks/:id/complete` | Move task para Concluído. Side-effect: modal de outcome qualitativo → `company_actions_taken` (source='sentinel_kanban') |
| GET | `/api/relatorios/eficacia` | Dados da tabela de eficácia (já filtrados por RLS) |
| GET | `/api/relatorios/eficacia/export?format=pdf\|csv` | Exporta a tabela em PDF (jsPDF) ou CSV |

---

## 12. Estratégia de teste

Pipeline com 3 chamadas Claude por execução é caro e lento para testar end-to-end. A estratégia abaixo separa o que pode ser testado sem LLM do que precisa de chamada real.

### 12.1 Camadas de teste

**(1) Unit — sem LLM, alvo de cobertura alto (~90%)**

Tudo que é determinístico:
- `knowledge-base/filters.ts` — `filterAndAnnotate`, `annotateByOutcomes`, helpers (`overBudget`, `requiresHRWeDontHave`, `violatesConstraint`, etc.)
- `learning/outcomes.ts` — cálculo de delta, classificação `outcome_status`, política de `attribution_skip_count`
- `profile/narrative.ts` — JSONB → prosa (snapshot tests)
- `profile/enrichment.ts` — função de auto-rejeição de sugestões em conflito
- `chat/summary.ts` — janela deslizante e gatilho de rolling summary

Fixtures vivem em `tests/fixtures/`:
```
tests/fixtures/
├── profiles/
│   ├── industrial-medio-porte.json
│   ├── startup-tech-remota.json
│   └── publica-grande.json
├── analyst-reports/
│   ├── burnout-grave-multidep.json
│   └── lideranca-amarelo-estavel.json
├── curated-selections/
│   └── ...
└── action-outcomes/
    ├── intervention-falhou.json
    └── categoria-validada.json
```

**(2) Pipeline isolado por estágio — LLM mockado**

`callClaude()` é um wrapper único usado pelos 3 estágios. Em testes, é injetado com fixtures de resposta:

```ts
// tests/ai/pipeline/curator.test.ts
import { runCurator } from '@/lib/ai/pipeline/curator';
import { mockClaude } from '../helpers/mock-claude';

test('curator exclui intervenções acima do orçamento', async () => {
  const profile = loadFixture('profiles/startup-tech-remota');
  const report = loadFixture('analyst-reports/burnout-grave-multidep');
  const annotated = filterAndAnnotate(catalog, profile, [], []);

  mockClaude.queueResponse(loadFixture('curated-selections/burnout-budget-tight'));

  const result = await runCurator({ report, profile, annotated });

  expect(result.candidates).toHaveLength(2);
  expect(result.unmet_dimensions).toContainEqual(
    expect.objectContaining({ reason: expect.stringMatching(/orçamento/) })
  );
});
```

Cada estágio tem seu test file, com fixtures de input/output já validados manualmente. Sem nenhuma chamada real ao Claude.

**(3) E2E com LLM real — manual ou CI noturno**

Único alvo: `tests/e2e/pipeline-full.test.ts`, com flag `--run-llm` (default off):
- Carrega DB de teste (Supabase local), cria empresa fixture com perfil completo
- Roda pipeline real end-to-end
- Verifica: tabelas populadas, `action_outcomes` criados, JSON do `ai_recommendation` valida contra schema TS (via Zod)
- Não verifica conteúdo textual (varia entre execuções) — só estrutura e campos obrigatórios

Roda manualmente antes de release ou em CI agendado (semanal). Custo: ~$0.10–0.20 por execução.

### 12.2 Validação de schema do output

`AIRecommendation` v2 ganha um schema Zod paralelo em `src/lib/ai/schemas.ts`:

```ts
export const AIRecommendationSchema = z.object({
  title: z.string().max(80),
  description: z.string(),
  quick_action: z.string(),
  rationale: z.string(),
  roadmap: z.array(z.object({ phase: z.string(), deliverable: z.string(), owner_role: z.string() })).min(1),
  prerequisites: z.array(z.string()),
  // ... (todos os campos)
});
```

O orchestrator valida com Zod ANTES de inserir no DB. Se falhar, marca o plano específico como `AI_GENERATION_FAILED` (não derruba os outros). Em testes, qualquer fixture inválida é capturada nesse passo.

### 12.3 Fixtures sintéticas para cenários extremos

Lista mínima para regressão:
- Empresa com `setup_completeness=0%` (planos genéricos) — pipeline deve rodar e marcar `rationale` com aviso de perfil incompleto
- Empresa com `annual_budget_brl=R$5.000` (orçamento minúsculo) — Curator deve preferir intervenções `cost_per_employee.min=0`, `unmet_dimensions` cresce
- Empresa com 3 outcomes anteriores: 1 positivo high, 1 negativo, 1 pendente — Curator deve respeitar todos os sinais
- Survey com taxa de resposta <30% — Stage 1 (Analyst) deve incluir `data_limitations`
- Departamento com <5 respostas — outcome marcado `anonymity_blocked`, fora da fila

Cada cenário tem fixture própria + test case dedicado. Total: ~30-40 testes unitários + 5-8 integração + 1 E2E.

---

## 13. Migração e rollout

### 13.1 Migration 008

Conteúdo principal (resumo executável):

1. `DELETE FROM kanban_tasks WHERE action_plan_id IS NOT NULL;`
2. `DELETE FROM action_plans;`
3. `CREATE TABLE` para as 6 tabelas novas
4. Trigger `company_profile_autocreate`
5. Backfill: 1 row de `company_profiles` vazio para cada `companies` existente
6. RLS policies (mesmo padrão do resto do app)

### 13.2 Fases de implementação

| Fase | Escopo | Estimativa solo | Bloqueador |
|---|---|---|---|
| **0** | Migration 008, tipos TS, reorganização de pastas em `src/lib/ai/`, deletar `generate-action-plans.ts` e `knowledge-base.ts` | ~3 dias | — |
| **1** | `/configuracoes/perfil` + endpoints + banner setup + pre-fill | ~1 sem | Fase 0 |
| **2** | Pipeline multi-step (3 estágios) + filters TS | ~1-2 sem | Fase 0 |
| **3** | KB reorganizada (catalog + providers-br + cases) — paralelo à Fase 2 | ~1-2 sem | Fase 0 |
| **4** | Chat: drawer + assistente + streaming + fact-extractor | ~1-2 sem | Fase 1 |
| **5** | Loop de aprendizado: outcomes + atribuição + aba eficácia + email | ~1 sem | Fases 1, 2 |
| **6** | Enriquecimento progressivo: drawer de sugestões, captura na rejeição | ~1 sem | Fases 4, 5 |
| **7** | Polimento, atualização do CLAUDE.md | ~3 dias | Tudo |

**Total**: ~5-7 semanas solo, ~3-4 com curadoria de KB em paralelo.

### 13.3 Sem coexistência V1/V2

- `generate-action-plans.ts` apagado (não movido).
- `knowledge-base.ts` apagado (conteúdo migrado para `catalog.ts` + `providers-br.ts`).
- Componente atual de renderização de plano substituído integralmente por `plan-v2.tsx`.
- Sem `schema_version` no JSONB, sem feature flag, sem fallback.
- Tabelas e código antigos coexistem **apenas durante a fase 0 do desenvolvimento**, na branch — não chegam à main com ambos.

---

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Curadoria da KB atrasa o pipeline | Fase 2 usa KB atual reorganizada (mesmo conteúdo, nova estrutura). Casos setoriais entram na Fase 3 sem bloquear |
| Multi-step custa 3x | Custo monitorado. Métricas de tokens em `profile_events` (event_type='pipeline_run') |
| Empresas não preenchem perfil → continuam genéricas | Banner persistente, rationale dos planos explicita "perfil incompleto". Owner aprende valor depois de preencher uma vez |
| Fact-extractor cria ruído | Apenas `confidence='high'`. Threshold ajustável sem deploy (config DB) |
| Fila de atribuição vira eterna | Banner some quando atribuído OU pulado 2x (2º pulo = `cannot_tell` automático) |
| Vazamento entre empresas no chat | RLS em todas queries usadas pelo context-builder. System prompt cita só dados da empresa logada. Auditoria via `profile_events` e `chat_messages` |
| Quebra de produção pela migration agressiva | Autorizado pelo usuário (app em testes, sem casos reais). Backup do banco recomendado antes de aplicar |

---

## 15. Sinais de sucesso (instrumentação leve)

Sem dashboard chique. Métricas no log e/ou painel interno bastam:

1. **Taxa de aprovação de planos** (antes vs. depois) — esperado: subir
2. **Mediana de dias entre aprovação e primeira task no Kanban** — esperado: cair
3. **% de planos com `roadmap.length >= 3`** — alvo 100%
4. **% de planos com `vendors.length >= 1`** — alvo 100%
5. **Δ médio das dimensões com plano aprovado vs. sem plano** — esperado: diferencial positivo
6. **`hr_attribution='high'`** como fração do total — esperado: subir ao longo dos ciclos
7. **Custo médio por survey fechada** — monitorar para não estourar

---

## 16. Open questions / decisões adiadas

Itens deixados explicitamente para depois (não bloqueiam a implementação inicial):

1. **Integração com fornecedores reais via API** (Zenklub, Vittude, etc.) — hoje os `vendors` são dados estruturados curados; integração API fica para um spec próprio.
2. **Notificações por e-mail** — mencionadas em vários fluxos (planos prontos, outcomes calculados). Já no escopo, mas detalhamento de templates fica como TODO da Fase 5.
3. **Tool use no Stage 3** — Opção C do brainstorming. Deixado como evolução futura; mais valor quando vendors tiverem API real para cotação.
4. **RAG / busca científica em tempo real** — Opções B e D do brainstorming. Não previstas neste design.
5. **`workforce_composition` detalhada** — JSONB livre por enquanto; pode evoluir para campos tipados quando o uso ficar claro.
6. **Multi-idioma do chat** — só PT-BR neste design (consistente com a regra do projeto).
7. **Direção de pontuação por dimensão no loop de aprendizado** — atualmente `annotateByOutcomes` (Seção 10.3) assume "delta positivo = melhora". O COPSOQ II tem direção variável: para dimensões como Exigências Quantitativas, score subindo significa PIORA. A solução correta é usar `dimension.scoring_direction` (já existente em `questionnaire_scales`) para inverter o sinal quando aplicável. Marcado como TODO da Fase 5, com nota: enquanto não implementado, planos para dimensões `HIGH_IS_RISK` podem ter o aprendizado invertido. Schema de `action_outcomes` já comporta a correção sem migration — basta lógica no `learning/outcomes.ts`.

---

## 17. Relação com o brainstorming

Este design consolida as decisões tomadas na conversa de brainstorming de 2026-05-20. Decisões-chave do usuário citadas no documento:

- Genericidade como dor principal (não embasamento, não aplicabilidade, não eficácia — embora design enderece todos).
- Todos os 4 eixos de personalização relevantes.
- "Agente" = perfil rico + chat sob demanda (Opção mistura).
- Onboarding híbrido (formulário + enriquecimento progressivo).
- KB curada manualmente (sem RAG/busca).
- Chat duplo (por plano + geral).
- Feedback: medição automática + atribuição HR.
- Pipeline multi-step (Opção B).
- Quebra de dados autorizada (sem coexistência V1/V2).

Quaisquer divergências entre este spec e o que ficou na conversa devem ser apontadas no spec review.

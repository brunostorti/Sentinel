# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sentinel** — a Next.js web app (PT-BR) for companies to run COPSOQ II psychological wellbeing surveys, comply with Brazilian Law 14.831, and drive AI-powered action plans to address occupational health risks.

**Language:** The entire application UI must be in **Portuguese (PT-BR)**. All labels, messages, validations, errors, and content in Portuguese.

## Current State

Design/planning phase — no application code exists yet. The repository contains:
- `.agents/skills/` — Google Stitch agent skills library for design-to-code workflow
- `.stitch/DESIGN.md` — canonical design system spec
- `cursor_prompt.md` — full architecture brief and DB schema

**COPSOQ II question bank:** Fully defined from the official Portuguese manual (`COPSOQ-Manual-Portugal2013.pdf`, included in the repo). All questions, dimensions, inverted flags, and scoring rules are ready for DB seed.

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (magic links for employees and new-user onboarding; email/password for returning HR/Admin)
- **AI:** `@anthropic-ai/sdk` — Claude API for action plan generation
- **Email:** Supabase Auth built-in or Resend
- **Deploy:** Vercel (not yet configured)
- **Charts:** TBD (Recharts or similar)

## Commands (once bootstrapped)

```bash
npm run dev                  # Start dev server
npm run build                # Production build
npm run lint                 # ESLint
# DB migrations managed via Supabase CLI / dashboard
# COPSOQ II seed script TBD
```

## Architecture

### Roles & Multi-tenancy
- `SUPER_ADMIN` (platform-level): admin area to create/manage companies and their HR/Admin users. No public self-registration. New users receive an email invite with a magic link to set their password on first access.
- `ADMIN`, `HR`, `MANAGER` (company-scoped): all see company-wide data across all departments.
- All data is isolated by `company_id`.

### Survey Lifecycle
A company can have **multiple active surveys simultaneously**. HR creates a survey by configuring:
- **Title** (e.g., "Pesquisa Q1 2025")
- **Version:** Short, Medium, or Long (determines which COPSOQ II questions are included)
- **Expiry date**
- All company departments participate in every round automatically.

HR can manually trigger a **reminder email blast** to employees whose `SurveyToken.is_used = false`.

When a survey is closed:
1. AI action plans are auto-generated (see below).
2. HR receives an **email notification** that plans are ready for review.

### Employee Survey Flow — Auth + Anonymity

1. HR imports a **CSV (email, department)** → creates `SurveyParticipant` records.
2. System sends a **magic link** (Supabase Auth) to each employee email.
3. Employee clicks link → authenticated session → accesses and completes the survey inside the platform.
4. On submission:
   - `SurveyToken.is_used` → `true`
   - A **detached** `SurveyResponse` is created: `survey_id`, `department_id`, `submitted_at` only. **No email, session ID, or IP is stored.**
   - `SurveyAnswer` rows link only to `SurveyResponse`.

**The auth session gates access only — it must never appear in the response record.**

### Anonymity: Rule of 5
If a department has fewer than 5 completed `SurveyResponse` records, the dashboard must show:
> "Dados insuficientes para preservar o anonimato"

Response rates (e.g., "3 de 10 responderam") are always visible. Dimension scores are withheld below the threshold.

### COPSOQ II Question Bank

Source: `COPSOQ-Manual-Portugal2013.pdf` (Portuguese national validation, N=4,162 workers). Questions used **as-is in PT-PT** (no PT-BR adaptation).

**Versions (nested subsets — Long contains Medium contains Short):**
| Version | Questions | Subscales |
|---------|-----------|-----------|
| Short   | 41        | 26        |
| Medium  | 76        | 29        |
| Long    | 119       | 35        |

**8 Dimension Categories:**
1. Exigências no Trabalho
2. Organização do Trabalho e Conteúdo
3. Relações Sociais e Liderança
4. Interface Trabalho-Indivíduo
5. Valores no Local de Trabalho
6. Personalidade (trait — not actionable, context only)
7. Saúde e Bem-Estar
8. Comportamentos Ofensivos

**Inverted Items:** Only 2 in the Medium version (items 42, 45); maps to items 51, 54 in Long. Short has none. Apply `score = 6 - raw_score` before averaging.

### COPSOQ II Scoring
- 5-point Likert: 1 = Nunca/Nada → 5 = Sempre/Extremamente
- Dimension score = mean of question scores in that dimension
- **Tercile cut-points:** 2.33 and 3.66 on the 1–5 scale
- **Scoring direction varies by dimension:**
  - Some dimensions: high score = risk (e.g., Exigências Quantitativas) → >3.66 = Red, <2.33 = Green
  - Other dimensions: high score = favorable (e.g., Possibilidades de Desenvolvimento) → >3.66 = Green, <2.33 = Red
- Traffic light system:
  - 🟢 **Favorável** — low risk
  - 🟡 **Intermédio** — medium risk
  - 🔴 **Risco** — immediate health concern
- **National reference values** available per subscale (Table 3 in manual: means, SDs, Cronbach's alpha for N=4,162)

### HR BI Dashboard
- **Semáforo por dimensão:** Each COPSOQ II dimension as a traffic light card with score and risk level.
- **Comparação por departamento:** Side-by-side dimension scores across departments.
- **Tendências históricas:** Score evolution across multiple survey rounds (chart).
- **Exportação:** PDF report (formatted, print-ready) + CSV/Excel of aggregated data.
- **Owner vs. HR view distinction:** Not yet scoped — define before implementing role-specific views.

### AI Action Plans
When a survey closes, the platform automatically calls the **Claude API** (`@anthropic-ai/sdk`) to:
- Analyze dimensions scored as Red or Yellow
- Generate a list of recommended action items: title, rationale, suggested responsible role, estimated impact
- HR/Owner reviews and approves each suggestion before it appears on the Kanban board
- HR receives an email notification when AI-generated plans are ready for review

### Action Plans Kanban Board
One permanent board per company (tasks persist and accumulate across survey rounds):

- **Column statuses (PT-BR):** e.g., A Definir → Em Andamento → Quase Concluído → Concluído
- **Card fields:** title, description, linked COPSOQ II dimension, responsible user (platform users only), due date, status, source survey round
- **HR/Admin:** full board management (create, edit, delete tasks, assign users)
- **Managers:** can view all tasks and update status/add comments on tasks assigned to them

## Design System

All UI must follow `.stitch/DESIGN.md`. Key rules:

| Token | Value |
|---|---|
| Primary | `#1968e6` (Cerulean Blue) |
| Success / Favorável | `#2ecc71` |
| Warning / Intermédio | `#f1c40f` |
| Danger / Risco | `#e74c3c` |
| BG Light | `#f6f7f8` |
| BG Dark | `#111721` |
| Font | Inter (`font-black tracking-tight` for headings) |
| Cards | `rounded-xl shadow-sm border-slate-200` |
| Buttons | `rounded-lg` |
| Inputs | `bg-slate-100`, focus ring in primary color |
| Layout | Sidebar `w-64` + fixed header + main `flex-1 max-w-7xl p-8` |

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.

## Agent Skills Workflow

Use the skills in `.agents/skills/` for UI design work:

1. **`stitch-design`** — generate screens via Stitch MCP; output goes to `.stitch/designs/`
2. **`react-components`** — convert Stitch output to modular TypeScript React components
3. **`shadcn-ui`** — install and customize shadcn/ui components
4. **`stitch-loop`** — autonomous page-building loop driven by `.stitch/next-prompt.md`

`.stitch/metadata.json` persists Stitch project/screen IDs across sessions.

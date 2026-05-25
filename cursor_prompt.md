# Project: PsychoRisk Platform (COPSOQ II)

## Context & Goal
We are building a comprehensive web application for companies to distribute psychological wellbeing surveys to their employees, in compliance with the new Brazilian regulation (Law 14.831). The app will implement the Copenhagen Psychosocial Questionnaire (COPSOQ II) in its three versions (Short, Medium, and Long).

## The Core Challenge: Absolute Anonymity
The most critical requirement is **absolute anonymity** for the respondents while simultaneously allowing HR and company owners to view aggregated metrics and track response rates. 
To achieve this, the architecture MUST strictly separate the identity of the respondent from their answers.

## Architecture & Database Schema (PostgreSQL/Prisma or Drizzle)

### 1. Core Entities
*   `Company`: `id`, `name`, `cnpj`, `created_at`
*   `Department`: `id`, `company_id`, `name`
*   `User`: `id`, `company_id`, `role` (ADMIN, HR, MANAGER), `email`, `password_hash`

### 2. Survey Administration
*   `Survey`: `id`, `company_id`, `title`, `version` (SHORT, MEDIUM, LONG), `status` (DRAFT, ACTIVE, CLOSED), `created_at`, `expires_at`

### 3. Anonymity Engine (Crucial)
Do NOT link responses to employees. Use the following approach:
*   **Distribution:** HR generates unique "access tokens" for a department (e.g., 10 tokens for a Marketing team of 10 people). These are sent out via email or distributed physically.
*   **Tracking Table (`SurveyToken`):** `id`, `survey_id`, `department_id`, `token_hash`, `is_used` (boolean). **NO identifying employee data here.**
*   **Response Table (`SurveyResponse`):** `id`, `survey_id`, `department_id`, `submitted_at`. **DO NOT store the token_hash or IP address here.** When a token is used, mark it as `is_used = true` in `SurveyToken` and create a detached `SurveyResponse` record.
*   **Answers Table (`SurveyAnswer`):** `id`, `survey_response_id`, `question_id`, `score` (1-5).

### 4. Aggregation & Privacy Thresholds
*   **The "Rule of 5":** In the HR Dashboard, if a `department_id` has fewer than 5 completed `SurveyResponses`, the system MUST return generic "Insufficient Data to preserve anonymity" or merge that department's data with the company average. Owners can see *response rates* (e.g., 3 out of 10 answered), but never the metrics if the threshold isn't met.

## COPSOQ II Scoring Logic
*   The questions are answered on a 5-point Likert scale (1-Nunca to 5-Sempre OR 1-Nada to 5-Extremamente).
*   **Inverted Items:** Some questions have inverted scores (1=5, 2=4, 3=3, 4=2, 5=1). The database seed must include an `is_inverted` boolean for questions.
*   **Dimensions:** Average the scores for all questions belonging to a dimension (e.g., "Exigências Quantitativas").
*   **Terciles (Semáforo/Traffic Light):**
    *   **Green (Favorável):** Situation is favorable for health.
    *   **Yellow (Intermédio):** Intermediate risk.
    *   **Red (Risco):** Immediate risk to health.
    *   *Note: Next steps will involve mapping the specific thresholds per dimension based on the COPSOQ II national normative data.*

## Design System & UI Guidelines
Use TailwindCSS and modern UI components (like `shadcn/ui`) strictly adhering to the following `.stitch/DESIGN.md` rules:
*   **Vibe:** Professional, Clean, Trustworthy.
*   **Colors:** Primary: `#1968e6` (Deep Cerulean Blue). Success: `#2ecc71`. Warning: `#f1c40f`. Danger/Risk: `#e74c3c`. Backgrounds: `#f6f7f8` (Light) and `#111721` (Dark).
*   **Typography:** 'Inter' font. Headings should be Extra Bold/Black (`font-black`, `tracking-tight`).
*   **Components:** Rounded corners (`rounded-xl` for cards, `rounded-lg` for buttons). Flat design with subtle drop shadows (`shadow-sm`) and light borders (`border-slate-200`).
*   **Layout:** Sidebar layout (`w-64`) with a fixed header and fluid main content (`flex-1`, `max-w-7xl`). Generous padding (`p-8`).

## Tech Stack Requirements
*   Framework: Next.js (App Router)
*   Language: TypeScript
*   Styling: TailwindCSS
*   Database: PostgreSQL (Serverless or local) + Prisma or Drizzle ORM
*   Authentication: NextAuth.js (Auth.js)

## First Steps for Cursor
1.  Initialize the Next.js project with Tailwind and TypeScript.
2.  Set up the PostgreSQL schema based on the "Architecture & Database Schema" section above.
3.  Create the HR Dashboard layout (Sidebar + Header as per Design System).
4.  Implement the Survey Distribution logic (generating Dept tokens) and the unauthenticated Survey Taking flow for employees.

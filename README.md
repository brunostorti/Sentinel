# Sentinel — Plataforma de Gestão de Riscos Psicossociais (COPSOQ II)

O **Sentinel** é uma plataforma web desenvolvida em Next.js para auxiliar empresas a avaliarem o bem-estar psicológico de seus colaboradores, em total conformidade com a **Lei Federal nº 14.831**. A plataforma implementa o questionário científico *Copenhagen Psychosocial Questionnaire* (COPSOQ II), permitindo monitorar a saúde ocupacional e gerar planos de ação eficientes baseados em dados reais.

---

## 🔒 Princípio de Anonimato Absoluto
O pilar mais crítico do Sentinel é a garantia de anonimato para os respondentes:
* **Tokens de Acesso Desvinculados**: Os funcionários respondem por meio de links de uso único gerados para seus respectivos departamentos. O Sentinel **nunca** armazena dados de sessão, e-mail ou endereço IP associados às respostas.
* **Regra dos 5**: Resultados e pontuações detalhadas de um departamento só se tornam visíveis no dashboard do RH caso pelo menos **5 colaboradores** tenham respondido à pesquisa.

---

## ✨ Funcionalidades Principais

* **Aplicação Científica do COPSOQ II**: Suporte aos questionários em versões Curta (41 perguntas), Média (76 perguntas) e Longa (119 perguntas) conforme o manual oficial.
* **Dashboard de BI para o RH**: Análise semafórica de riscos (Verde, Amarelo e Vermelho), comparação side-by-side entre departamentos e acompanhamento de tendências históricas.
* **Planos de Ação Inteligentes**: Integração com IA (Claude API) para sugerir intervenções organizacionais baseadas nas dimensões com score crítico (Amarelo ou Vermelho).
* **Quadro Kanban Preventivo**: Fluxo completo de gestão de tarefas geradas pelas pesquisas, desde a aprovação pelo RH até a conclusão por gestores.
* **Selo Lei 14.831 e Certificação**: Validador público de certificados e selos de conformidade com a legislação de saúde mental no trabalho.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend**: Next.js (App Router), TypeScript, TailwindCSS e shadcn/ui.
* **Backend e Banco de Dados**: Supabase (PostgreSQL) com políticas de segurança RLS (Row Level Security) rigorosas.
* **Autenticação**: Supabase Auth (Magic Links para colaboradores e Credenciais para RH/Administradores).
* **IA**: SDK oficial da Anthropic (Claude API).

---

## 🚀 Como Executar o Projeto

1. **Configurar as Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz com base no `.env.local.example` fornecido:
   ```bash
   cp .env.local.example .env.local
   ```
   Preencha as chaves do Supabase, da Claude API e outras configurações.

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

---

## 👥 Autores (Grupo do TCC)
* **Bruno Storti** — `bruno.storti04@gmail.com`
* **João Alvarez** — `nuke.gota.io@gmail.com`
* **Gustavo Hideki** — `gustavohideki124@gmail.com`
* **Pedro Bertolucci** — `pedrovictorbertolucci@gmail.com`
* **Pedro Wagner** - `alessandra.pedro.wagner@hotmail.com`

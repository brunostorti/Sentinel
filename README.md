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

---

## Diagramas para a Banca do TCC

> **[ABRIR OS DIAGRAMAS ATUAIS DO SENTINEL](docs/artigo_diagramas_tcc/)**
>
> Material técnico de apoio à banca, em PNG de alta resolução. Os diagramas atuais estão diretamente nessa pasta; os três arquivos da primeira banca ficam separados no histórico.

### Diagramas Principais

- [Arquitetura geral em C4](docs/artigo_diagramas_tcc/arquitetura-geral.png).
- [Diagrama de atividades UML completo do ciclo de pesquisas](docs/artigo_diagramas_tcc/atividades-ciclo.png).
- [Pipeline de IA e RAG: visão geral já publicada](docs/artigo_diagramas_tcc/pipeline-ia-rag.png).
- [Entidade-relacionamento: ciclos, instrumentos e respostas](docs/artigo_diagramas_tcc/der-ciclos-coleta.png).
- [Controle de privacidade do colaborador: participação, respostas e resultados agregados](docs/artigo_diagramas_tcc/controle-privacidade-colaborador.png).
- [Pipeline de IA e RAG: fluxo detalhado das três etapas e recuperação documental](docs/artigo_diagramas_tcc/pipeline-ia-rag-detalhado.png).
- [Implantação UML: Vercel, Supabase e serviços externos de IA](docs/artigo_diagramas_tcc/implantacao-uml.png).

**[Histórico: diagramas da banca TCC 1](docs/artigo_diagramas_tcc/diagramas_banca_tcc_1/)**. Esses três arquivos foram preservados como material da primeira banca e não devem ser usados como referência da versão atual do sistema.

O DER usa notação Information Engineering (pé de galinha) e mostra um recorte do esquema físico relacionado a ciclos, instrumentos e respostas; não é um dicionário completo do banco. A implantação usa notação UML em uma visão lógica dos ambientes, sem especificar região, hardware ou quantidade de instâncias. O pipeline é um diagrama descritivo de processamento e fluxo de dados, não um diagrama UML. As figuras foram conferidas contra o código e as migrações da revisão `86bf9d1`; a hospedagem na Vercel foi confirmada pela equipe.

O controle de privacidade é uma representação descritiva da separação entre participação identificada e respostas, da agregação e das regras de supressão. Não constitui auditoria de segurança nem atesta anonimato absoluto.

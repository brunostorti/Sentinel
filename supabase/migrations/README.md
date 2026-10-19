# Migrações do banco (Supabase — projeto sentinel-v2)

Cada arquivo se chama `<versão>_<nome>.sql`, em que `<versão>` é **exatamente** a versão
registrada no banco em `supabase_migrations.schema_migrations` (data/hora UTC em que a
migração foi aplicada, formato `AAAAMMDDHHMMSS`). Assim:

- a ordem alfabética dos arquivos é a ordem em que as migrações rodaram;
- cada arquivo corresponde a um registro do banco (e vice-versa);
- o padrão é o mesmo que a Supabase CLI usa, caso ela venha a ser adotada.

## Como criar e aplicar uma migração nova (fluxo via MCP)

1. Escreva o SQL num arquivo novo nesta pasta.
2. Aplique pelo MCP do Supabase (`apply_migration`) com um nome em snake_case,
   passando o conteúdo do arquivo **sem nenhuma alteração**.
3. Consulte a versão que o banco registrou (`list_migrations`) e renomeie o arquivo
   para `<versão>_<nome>.sql`.
4. Faça o commit.

Com a Supabase CLI o fluxo seria `supabase migration new <nome>` + `supabase db push`
(a versão vem do nome do arquivo, então não é preciso renomear depois).

## Regras

- Toda mudança de schema passa por uma migração registrada. Nada de DDL avulso pelo
  SQL Editor ou por `execute_sql`: foi isso que gerou o drift corrigido em 2026-10-08.
- Não edite uma migração que já foi aplicada; corrija com uma migração nova.

## Dados iniciais (seeds)

**COPSOQ II:** a versão portuguesa oficial (Silva et al.) é criada pela migração
`20261009124759_copsoq_ii_oficial.sql`, gerada por script a partir do texto do manual. A
versão anterior, não oficial, ficou arquivada no banco (`copsoq_ii_legado`, inativa) e o
`scripts/seed-copsoq.ts` que a gravava foi desativado (ele também apagava as perguntas de
todos os instrumentos).

**COPSOQ III, JSS e OLBI:** as versões validadas (COPSOQ III português, JSS e OLBI
brasileiros) vêm da migração `20261012174401_instrumentos_validados.sql`, que também grava os
cortes de semáforo por escala. As versões anteriores ficaram arquivadas (`copsoq_iii_legado`,
`olbi_legado`) e os scripts `seed-copsoq-iii.ts`, `seed-jss.ts` e `seed-olbi.ts` foram
desativados. Fontes e decisões em `docs/instrumentos/2026-10-12-instrumentos.md`.

**Referências curadas (`kb_references`, lista da página Metodologia):** seed em
`20260521070316_seed_kb_references.sql`, auditoria em `20261008011829_fix_kb_references.sql` e
versões validadas dos questionários e documentos do MTE de 2026 em
`20261019185436_referencias_versoes_validadas.sql`. Cada referência também vira uma ficha na
base do RAG: depois de mudar referências, rode
`npx tsx --env-file=.env.local scripts/rag/ingest-global.ts --only referencias` (só reprocessa
as fichas que mudaram).
O antigo `003_copsoq_seed.sql` (nunca aplicado em produção, escrito para as tabelas
`copsoq_*` anteriores à renomeação) foi removido em 2026-10-08; ele continua no histórico
do git (commit a11ea42).

## Testes

`supabase/tests/` guarda testes em SQL que criam dados sintéticos, conferem o resultado e
desfazem tudo (`ROLLBACK`). Rode no SQL Editor; se algo falhar aparece uma exceção
"FALHOU: ...".

## Histórico

Até 2026-10-08 os arquivos usavam numeração sequencial (`001_`, `002_`, …), com números
repetidos e fora da ordem real de aplicação. A auditoria e a renomeação estão descritas em
`tasks/migration-drift.md`.

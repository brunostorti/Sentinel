# Auditoria de drift das migrações (sentinel-v2 × repo)

Levantamento feito em 2026-10-07. **Nada foi aplicado no banco e nenhum arquivo de migração foi alterado ainda.**

## Fonte da verdade descoberta

`supabase_migrations.schema_migrations.statements` guarda o SQL **exato** de cada migração aplicada via MCP.
Usar isso para reconstruir os arquivos (em vez de engenharia reversa via pg_policies/pg_proc).

## Comparação (SQL do histórico × arquivo do repo, ignorando comentários/espaços)

| Repo | Versão no banco | Situação |
|---|---|---|
| 001, 002, 005_certificates, 005_employees, 006, 007, 009, 015, 016_survey_cycles, 017 | registradas | idênticas |
| 008 | 20260520230255 | equivalente (repo já embute o fix do 008b) |
| 010, 013 | registradas | só diferenças cosméticas (013: texto do COMMENT difere) |
| 018 | 20261008011829 | equivalente (repo só tem BEGIN/COMMIT a mais). Está **untracked** no checkout principal e ausente nesta worktree |
| 003_fix_rls_recursion | 20260317052617 | **diverge**: histórico = v1 (subqueries inline); repo = v2 (get_my_role/get_my_company_id). O banco está no estado da v2 (aplicada por fora) |
| 004_participant_rls | 20260321205533 | **diverge**: histórico só cria participant_surveys_select; repo cria também participant_self_select |
| 011, 012, 014 | registradas | repo só tem comentários → restaurar com o SQL do histórico |
| — | 20260507003541 create_reports_table_and_bucket | sem arquivo → criar com SQL do histórico |
| — | 20260520230533 008b_lock_function_search_path | sem arquivo → criar com SQL do histórico |
| — | 20260825145139 kanban_source_survey_index | sem arquivo → criar com SQL do histórico |
| 003_copsoq_seed | — | nunca rodou no banco; dados COPSOQ em produção vieram de `scripts/seed-copsoq.ts` (UUIDs aleatórios) |
| 016_company_ai_settings | aplicada em 2026-10-08 (via MCP, nome `016_company_ai_settings`, SQL idêntico ao arquivo) | **resolvido** pela sessão do RAG com aprovação do usuário: colunas `companies.ai_model` e `ai_api_keys` agora existem |

## Drift fora de qualquer migração

- Policy `survey_participants_delete` (DELETE TO authenticated) existe no banco, não está em nenhum arquivo.
- Policy `participant_surveys_select` foi removida por fora (não existe no banco).
- Índice `idx_kanban_tasks_source_survey` está registrado como aplicado mas **não existe** no banco.

→ Os três itens acima foram resolvidos pela 019_reconcile_drift (aplicada em produção em 2026-10-08, versão 20261008184914).

## Alertas (fora do escopo, decidir depois)

- ~~Código usa `companies.ai_model/ai_api_keys` e as consultas falham~~ → resolvido: 016 aplicada em 2026-10-08 (versão 20261008184903).
- Design da 016 guarda API keys em texto puro numa tabela legível por qualquer usuário da empresa.
- 014 fez `REVOKE EXECUTE ... FROM anon` mas anon ainda executa (grant vem de PUBLIC).
- Bucket `reports` continua `public = true` (0 objetos hoje).
- COPSOQ II tem 128 itens no banco (esperado 119).

## Próximos passos (um ponto por vez, com aprovação do usuário)

- [x] Restaurar 011, 012, 014 com o SQL exato do histórico (conferido por md5 em 2026-10-08)
- [x] Criar arquivos das 3 migrações que só existem no banco (nomes provisórios 007b, 008b, 017b; conferidos por md5)
- [x] Migração de reconciliação escrita (019_reconcile_drift.sql, provisório): survey_participants_delete, drop participant_surveys_select, recriar índice (opção A, escolhida em 2026-10-08)
- [x] Aplicar 019 em produção (autorizado pelo usuário; versão 20261008184914; SQL registrado idêntico ao arquivo; índice criado, policies conferidas)
- [x] Renomear tudo para `<versão>_<nome>.sql` usando as versões do banco (opção A, 2026-10-08) + README.md na pasta com a regra para novas migrações
  - Conferência pós-renomeação: 18 arquivos iguais ao registro; diferentes: fix_rls_recursion, participant_rls (reais), personalized_plans_pipeline, kb_references, lgpd_consent (cosméticos/equivalentes); sem arquivo nesta branch: 20261008011829 (018, untracked no checkout principal)
- [x] 003 (fix_rls_recursion) e 004 (participant_rls): opção A — mantido o conteúdo atual + cabeçalho explicando a diferença com o registro (2026-10-08)
- [x] 008, 010, 013: SQL exato do registro restaurado (aprovado e conferido por md5 em 2026-10-08). Resultado: 21 arquivos idênticos ao registro; 003/004 diferentes de forma documentada; 018 sem arquivo nesta branch
- [x] 003_copsoq_seed: removido da pasta de migrações (opção A, 2026-10-08); README aponta scripts/seed-*.ts como fonte oficial (a 016_company_ai_settings já foi aplicada em 2026-10-08)
- [ ] 018: após commit no checkout principal, renomear para 20261008011829_fix_kb_references.sql (o arquivo de lá tem BEGIN/COMMIT a mais que o registro)
- [ ] Investigar à parte: COPSOQ II com 128 itens em produção (esperado 119)
- [x] Verificação (2026-10-08): replay das 24 migrações (23 da branch + 018 do checkout principal) no PGlite 0.5.8 (Postgres 18.3) — todas rodaram sem erro. Retrato comparado com produção:
  - schema idêntico em 12/12 categorias: colunas (289), constraints (128), índices (95), policies (76), funções (5), triggers (14), enums (6), RLS (31), grants de tabela (93), EXECUTE de funções (15), comentários (5), bucket (1)
  - dados: kb_references (25) e kb_intervention_references (78) idênticos linha a linha; universal_categories e response_formats idênticos; questionnaire_instruments difere como esperado (só copsoq_ii vem de migração; copsoq_iii/jss/olbi vêm dos scripts de seed)
  - obs.: o hash agregado de kb_references diferia só pela ordenação (collation C no PGlite × en_US em produção)
- [ ] Commit desta branch (aguardando o usuário)

## Nota da sessão do RAG/diagnóstico (2026-10-08)

Aplicadas no banco com aprovação do usuário (arquivos no checkout principal, ainda sem commit):
- `020_security_hotfix` — trava role/company_id em users (escalada para SUPER_ADMIN), neutraliza horários das respostas (anonimato), survey_answers sem acesso direto, denúncias só RH/Admin.
- `021_reports_bucket_private` — bucket `reports` privado, sem policies públicas no storage, limite 10 MB e PDF/JPG/PNG.
Considerar ao renomear/numerar as migrações.
- `022_protect_ai_api_keys` (2026-10-08) — privilégios por coluna em companies: authenticated sem SELECT/UPDATE em ai_api_keys (acesso só via service role na rota /api/company/ai-settings).

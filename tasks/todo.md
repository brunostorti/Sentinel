# Instrumentos precisos em todo o app (12/10/2026)

Objetivo: COPSOQ II, COPSOQ III, JSS e OLBI corretos e coerentes em escores, semáforo,
painéis, relatórios, Dossiê NR-1, planos da IA e RAG.

Decisões do usuário (12/10): COPSOQ III → versão média portuguesa validada; OLBI → 13 itens
validados no Brasil; JSS → manter com aviso de licença; semáforo com cortes próprios por
instrumento.

## Fontes
- COPSOQ III: Cotrim et al. (2022), IJERPH 19(3):1167 — 93 itens, versão reduzida de 85
  (saem Q20, Q24, Q25, Q68, Q73, Q77, Q80, Q81). Texto PT na Tabela 1 (acesso aberto, CC BY).
- JSS: Spector (1985/1994); versão brasileira de Souza, Milani & Alexandre (2015, RBSO) e
  Souza et al. (2017, J Nurs Meas). Arquivo oficial do autor (Souza, Unicamp). Interpretação:
  média por item ≤ 3 insatisfeito, ≥ 4 satisfeito (Spector, "Interpreting satisfaction scores").
  Licença: grátis só para pesquisa/ensino; uso comercial requer licença do autor.
- OLBI: Demerouti & Bakker (2008); versão brasileira de Schuster & Dias (2018), Ciênc. Saúde
  Coletiva 23(2):553-562 — 13 itens (saem DT6, EE8, EE6). Cortes: exaustão ≥ 2,25 e
  desengajamento ≥ 2,10 (Peterson et al., 2008).

## Plano
- [x] 1. Migração: colunas de corte por escala (cut_low, cut_high, cut_source); padrão = tercis.
- [x] 2. COPSOQ III: arquivar o atual (copsoq_iii_legado); criar a versão portuguesa (85 itens,
      31 escalas), formatos e direções na convenção do COPSOQ II português.
- [x] 3. JSS: textos da versão brasileira oficial; cortes 40/60; aviso de licença na descrição;
      categoria de Promoção (era "segurança").
- [x] 4. OLBI: arquivar o atual (olbi_legado); criar a versão brasileira de 13 itens; inversão
      pelo conteúdo (EE3, EE5, DT1, DT4, DT7); cortes 41,7 (exaustão) e 36,7 (desengajamento);
      Desengajamento passa a "Burnout e Saúde".
- [x] 5. Categorias: COPSOQ II "Conflito trabalho/família" sai de "segurança" para "carga".
- [x] 6. Código: toTrafficLight com cortes por escala; leitura dos cortes em painel, relatórios,
      formulário e IA; probabilidade do Dossiê proporcional ao corte (COPSOQ inalterado).
- [x] 7. Dossiê: mapa explícito escala → perigo por instrumento (sem cair no genérico); aviso
      de que o JSS mede satisfação.
- [x] 8. RAG: documento de metodologia dos instrumentos na base global (+ artigos abertos, se
      autorizado o download).
- [x] 9. Testes: cortes, probabilidade (COPSOQ igual a antes), cobertura do mapa de perigos.
- [x] 10. Verificação: pesquisas simuladas de cada instrumento → painel, Dossiê e semáforo.

## Revisão (12/10)
- Migração 20261012174401_instrumentos_validados aplicada (md5 conferido): COPSOQ III PT 85/31
  (1 invertido), JSS com textos oficiais e cortes 40/60, OLBI BR 13/2 (5 invertidos) com cortes
  41,67/36,67; antigos arquivados (copsoq_iii_legado, olbi_legado); seeds antigos desativados.
- Semáforo com cortes por escala em painel, relatórios, formulário, IA e chat (via painel);
  probabilidade do Dossiê proporcional ao limite verde (COPSOQ idêntico ao anterior).
- Mapa escala → perigo explícito para os 4 instrumentos ativos; aviso do JSS no Dossiê.
- Verificação com pesquisas simuladas na Empresa Teste (ciclo "[Verificação]"): JSS
  Supervisão 30 → vermelho e risco alto; Pagamento 80 → verde; OLBI exaustão 67 → vermelho e
  nenhuma linha no inventário com aviso; COPSOQ III com 14 perigos mapeados.
- RAG: 3 artigos de validação + documento de metodologia na base global; as 6 perguntas de
  teste trazem o trecho certo (5 em 1º lugar).
- Testes: 76 passando (10 novos). Lint limpo nos arquivos alterados; 10 erros antigos em
  arquivos não tocados (any em gerenciar-pesquisas/actions.ts, planos-acao, chat/send).
- Não verificado na tela: exige login no Supabase de produção a partir do localhost.

# Revisão: metodologia e base do RAG em dia (19/10/2026)

Pedido: conferir se a metodologia e os documentos do RAG refletem os commits recentes e se
há pontas soltas. Decisões do usuário: corrigir página Metodologia, referências no banco e
docs do git; design do RAG mantém resultados sem caminhos para arquivos locais; busca do chat
e PDFs da raiz ficam para depois.

- [x] Página Metodologia: "Como a IA usa essas fontes" com RAG (vagas por tipo, F1…, fontes
      inventadas descartadas) e chat; grupo "Estudos observacionais" (Chisholm 2016 não
      aparecia); limitação da base de consulta.
- [x] Migração 20261019185436_referencias_versoes_validadas (md5 conferido): Cotrim 2022,
      Schuster e Dias 2018, Peterson 2008, Souza 2015 e 2017, Manual GRO/PGR e P&R do MTE 2026;
      notas de Burr, Demerouti e Spector; manual do COPSOQ II (editor e link corrigidos). DOIs
      conferidos na Crossref.
- [x] fontes.json: kb_reference nos 5 documentos completos (sem ficha duplicada); fichas
      reindexadas (5, custo desprezível).
- [x] Docs: design do RAG (10 fontes, busca dos planos de 10/10, custos, avaliação sem caminhos
      locais, limitação do chat) e Dossiê (probabilidade pelo limite verde de cada
      questionário, mapas próprios); comentários de código sem caminhos locais.
- [ ] Depois da banca: busca do chat com vagas por tipo de fonte; página Segurança com as
      proteções do RAG.

## Revisão
- Conferido em dia: doc de metodologia no RAG = versão do git (hash); 10 links oficiais
  respondem; 7 planos de exemplo com origem válida; Privacidade e aba de questionários.
- tsc, lint, 80 testes e build ok. A página Metodologia exige login: conferida pelo banco
  (32 referências, todas em algum grupo), não na tela.

# Links de acesso por e-mail (19/10/2026)

Objetivo: os links de acesso do colaborador (primeiro acesso em /entrar, lembrete do RH e
denúncia) funcionarem para qualquer e-mail, em qualquer aparelho.

Diagnóstico (logs do Supabase, 15/10): SMTP padrão do Supabase (só entrega para membros da
organização, ~2 e-mails/hora; 429 no 3º envio); link PKCE exige o code verifier no navegador
de quem pediu (no lembrete, é o navegador do RH); pedidos repetidos invalidam o link anterior.

Decisões do usuário (19/10): SMTP via Gmail com senha de app; link abre página com botão
"Entrar" (não é consumido por verificadores de links do e-mail corporativo); incluir o
convite de RH/Admin, com tela de primeira senha.

## Plano
- [x] 1. Página pública /confirmar-acesso: mostra o botão; o envio do formulário chama
      verifyOtp({ token_hash, type }) no servidor e redireciona para o destino.
- [x] 2. /api/auth/callback: com token_hash, encaminha para /confirmar-acesso (sem consumir o
      link); com code, segue como hoje (compatível com os e-mails antigos).
- [x] 3. Destino (next) validado: só caminhos internos ("/..." e nunca "//").
- [x] 4. Lembretes: envio pelo cliente admin (não grava cookie no navegador do RH); para no
      limite de envio; informa falhas em vez de "sucesso" com 0 enviados.
- [x] 5. /entrar: aviso "link inválido ou expirado" quando o callback falha.
- [x] 6. Modelos de e-mail em PT-BR (Magic Link, Confirm signup e Invite) em supabase/templates/.
- [x] 6b. Convite: redirectTo com next=/definir-senha; tela /definir-senha (vale uma vez,
      sem pedir senha atual; marca password_defined).
- [x] 7. Testes do validador de destino; tsc, lint e testes.
- [x] 10. Ativar pesquisa envia o link de acesso a todos os participantes (mesmo envio do
      lembrete, de 5 em 5; falha de e-mail não desfaz a ativação). Cadastro de colaborador
      continua sem e-mail (decisão do usuário).
- [x] 11. QR Code do link na tela de confirmação (só no computador; gerado no servidor, sem
      serviço externo).
- [ ] 8. Passos no painel do Supabase (usuário): SMTP Gmail, limite de e-mails/hora, modelos,
      Site URL e Redirect URLs. Só trocar os modelos depois do deploy do código.
- [ ] 9. Teste de ponta a ponta em produção com um e-mail real da equipe (com OK do usuário).

## Revisão (19/10)
- Local: callback com token_hash leva a /confirmar-acesso sem gastar o link; clique com
  token falso volta a /entrar?error=auth com o aviso; next externo (//, /\, https://) vira
  /inicio; destino da denúncia preservado; /definir-senha sem login vai para /entrar.
- Lembretes não devolvem mais e-mails ao RH (revelaria quem não respondeu).
- tsc limpo; 80 testes (4 novos); lint limpo nos arquivos alterados; build ok.
- QR confere com o link da página; some na tela de celular. Ativação não testada localmente
  (exige login e manda e-mails reais).
- Falta: deploy, passos no painel do Supabase e teste real de e-mail (itens 8 e 9).

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

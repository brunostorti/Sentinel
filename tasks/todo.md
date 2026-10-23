# Área do colaborador: denúncia dentro dela e formulário melhor (22/10/2026)

Pedido: trazer a denúncia para dentro da área do colaborador, tão anônima quanto as respostas
das pesquisas; o formulário ganhar volta ao início e ficar mais agradável; melhorar toda a parte
do colaborador.

Diagnóstico: a área é só uma lista de pesquisas ativas (sem abas, sem estado "respondida"); o
formulário não volta ao início e perde tudo ao sair; a bolinha marcada mostra o valor interno
(0–100); "Obrigado" cita COPSOQ II para qualquer questionário. A denúncia fica fora (/denuncia,
pública) e lista todas as empresas clientes para qualquer pessoa (/api/companies); guarda dia e
HORA (o RH vê "às 14:32"); a caixa "anônimo" não muda nada mas gera selo para o RH; anexos vão
com metadados (GPS, aparelho, autor); protocolo curto, ano fixo, consulta pública sem limite.

Decisões do usuário (22/10): uma pergunta por tela com avanço automático (e tela curta entre as
partes); progresso salvo só no aparelho; denúncia sempre anônima (sai a caixa); resultado
individual mantido com tom acolhedor e apoio (CVV 188, RH, SESMT); denúncia guarda só o dia,
INCLUSIVE as já gravadas (irreversível); anexos limpos automaticamente (sharp vira dependência);
endereços /denuncia pedem login e levam à aba; protocolo mais forte + lista no aparelho;
seis tipos de ocorrência (assédio moral, assédio sexual, discriminação, violência ou ameaça,
conduta antiética, outro). Aprovado para implementar.

## Plano
### A. Área do colaborador
- [x] A1. Grupo de rotas (colaborador): cabeçalho (logo, empresa, Sair) e abas "Pesquisas" e
      "Canal de denúncia"; /pesquisas passa para ele.
- [x] A2. Início: cartões com estado (a responder com tempo estimado e prazo; em andamento com
      % salvo no aparelho e "Continuar"; respondida); tela vazia amigável.
- [x] A3. Middleware: /denuncia exige login de colaborador; rotas comparadas por segmento (hoje
      "/denuncia" também casa com "/denuncias", a tela do RH).
- [x] A4. Login com destino: /entrar?next=/denuncia leva o link do e-mail de volta à aba
      (safeNext); quem já está logado vai direto.
- [x] A5. Sair apaga do aparelho os rascunhos de pesquisa desse usuário.

### B. Formulário da pesquisa (servidor/actions.ts inalterado)
- [x] B1. Abertura: nº de perguntas, tempo estimado, como responder, anonimato; "Começar" ou
      "Continuar de onde parei".
- [x] B2. Uma pergunta por tela, avanço automático, Voltar, teclas 1–5, progresso; transição
      suave que respeita "reduzir movimento".
- [x] B3. Tela curta ao concluir cada parte, sem nome de tema (não induzir a resposta).
- [x] B4. Revisão antes de enviar; "Início" em todas as telas.
- [x] B5. Rascunho em localStorage por usuário e pesquisa; apagado ao enviar ou sair; ao
      carregar, descarta perguntas e valores que não existem.
- [x] B6. Sem número interno na opção; opções acessíveis (radio).
- [x] B7. Resultado acolhedor: Favorável / Intermédio / Ponto de atenção, ícones neutros; com
      ponto de atenção, apoio (CVV 188, RH, SESMT).
- [x] B8. Obrigado: texto vale para qualquer questionário; "Voltar ao início".

### C. Canal de denúncia na área
- [x] C1. Aba /denuncia: o que é, garantias, "Fazer um relato", "Acompanhar", "Relatos enviados
      neste aparelho" com status.
- [x] C2. /denuncia/nova: empresa do cadastro (se várias, só as suas); tipo, relato com
      orientações, anexos; protocolo com "copiar", salvo na lista do aparelho.
- [x] C3. /denuncia/acompanhar: consulta por protocolo, com login.
- [x] C4. Apagar src/app/denuncia (público), /api/reports/request-access e /api/companies.

### D. Anonimato da denúncia
- [x] D1. Migração: só o dia em created_at/updated_at no INSERT e nas já gravadas.
- [x] D2. Protocolo DEN-AAAA-XXXX-XXXX (sem 0/O/1/I), ano automático; PROT- antigo consultável.
- [x] D3. Anexos: fotos regravadas sem metadados (sharp); PDF sem Info/XMP (pdf-lib); arquivo
      que não abre é recusado.
- [x] D4. Submit sempre anônimo, empresa validada no cadastro do usuário; track exige login.
- [x] D5. Tela do RH: sem selo "Anônimo" e sem hora.
- [x] D6. Página Privacidade: explicação do canal atualizada.

### E. Verificação
- [x] E1. Testes: protocolo, limpeza de anexos (foto com GPS, PDF com autor), rascunho, rotas.
- [x] E2. tsc, lint, testes e build.
- [ ] E3. Telas no navegador (celular e computador) com conta da Empresa Teste; dados de teste
      apagados ao final (com OK do usuário, pois o banco é o de produção).

## Revisão (22/10)
- Migração 20261022233148_denuncia_so_o_dia aplicada: corte na meia-noite de Brasília (em UTC
  a data exibida voltaria um dia); as 3 denúncias existentes (demo) ficaram só com o dia.
- Denúncia real pelo fluxo novo (DEN-2026-BP8H-MNQW, Empresa Teste) gravada com protocolo novo,
  só o dia e is_anonymous; tela do RH (rh@sentinel.com) mostra os 6 tipos, só a data e sem
  selo "Anônimo".
- Redirecionamentos conferidos: /denuncia, /pesquisas e /responder sem login vão para
  /entrar?next=... (acompanhar preserva o protocolo); /denuncias (RH) segue separado.
- Protocolos de demonstração (PROT-2026-DEMOBUSSOLA1) continuam consultáveis.
- Achado no caminho: prazo contado em blocos de 24 h dizia "amanhã" para algo que vence hoje;
  agora conta dias do calendário de Brasília (teste novo).
- tsc, lint e 112 testes (36 novos: protocolo, limpeza de anexos com foto e PDF reais,
  rascunho, prazo, rotas, formatação) e build ok.
- Falta (E3): percorrer como colaborador (início, formulário com rascunho, resultado, relato e
  acompanhamento). Pesquisa temporária "[Verificação] Área do colaborador" (ciclo próprio, só
  ana.teste) criada na Empresa Teste para isso; apagar ao final com OK do usuário.

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

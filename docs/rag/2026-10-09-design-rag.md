# RAG do Sentinel: documento de design (v1)

Data: 09/10/2026 · Escopo: Fase 2 do plano (entrega para a banca em 20/10/2026)

## 1. Objetivo

Fazer o assistente (chat) e o gerador de planos de ação responderem **com base em documentos
verificáveis e citando a fonte** (documento, seção e página), em vez de depender só do que o
modelo "lembra". Isso vale para dois tipos de fonte:

- **Base global**: normas e guias oficiais (NR-1, Guia do MTE, Manual GRO/PGR, Perguntas e
  Respostas do MTE, Lei 14.831), o manual do COPSOQ II e as referências científicas curadas.
- **Base da empresa**: documentos que o RH envia (políticas internas, relatórios, atas da CIPA,
  PGR anterior etc.). Só a própria empresa os vê.

## 2. O que NÃO passa pelo RAG

| Informação | Como chega à IA | Por quê |
|---|---|---|
| Escores do COPSOQ II, adesão, setores | Contexto estruturado direto, calculado no banco (`survey_dimension_scores`) | Números precisam ser exatos; busca por semelhança pode trazer o número errado ou de outra pesquisa |
| Perfil da empresa, planos ativos, resultados medidos | Contexto estruturado direto (como já é hoje) | Já é dado estruturado e pequeno |
| Estimativa de investimento | Calculada em código (`grounding.ts`) | O LLM nunca produz números sozinho |

O RAG traz **texto** (o que a norma diz, o que o guia recomenda, o que a política interna prevê).
Os **números** vêm sempre do banco.

## 3. Fontes da base global (v1)

| Documento | Tipo | Origem |
|---|---|---|
| NR-1 — Portaria MTE nº 1.419/2024 (nova redação do GRO, capítulo 1.5) | norma | gov.br/trabalho-e-emprego |
| Guia de informações sobre os fatores de riscos psicossociais (MTE, 2025) | guia oficial | gov.br/trabalho-e-emprego |
| Manual GRO/PGR da NR-1 (MTE, 2026) | manual técnico | gov.br/trabalho-e-emprego |
| Perguntas e Respostas GRO/PGR (MTE, 1ª rodada, 2026) | guia oficial | gov.br/trabalho-e-emprego |
| Lei nº 14.831/2024 (Certificado Empresa Promotora da Saúde Mental) | lei | planalto.gov.br |
| Manual do COPSOQ II, versão portuguesa (Silva et al.) | instrumento | copsoq-network.org |
| Referências científicas curadas (`kb_references` + alegações por intervenção) | referência científica | banco do Sentinel |

A lista fica em `docs/rag/fontes.json` (título, órgão, ano, URL oficial, citação). Os PDFs
ficam fora do git (`docs/referencias/`); o script de ingestão baixa da URL oficial quando o
arquivo local não existe.

**Planos de outras empresas (exemplos):** planos aprovados de empresas marcadas como "empresa
de exemplo" (dados sintéticos criados pela equipe) entram na base global **anonimizados**: sem
nome da empresa, sem nomes de setores ou pessoas; só setor econômico, porte, dimensão, nível de
risco, a intervenção e o resultado medido, se houver. Empresas reais só entrariam com
autorização expressa em contrato (fora do escopo da v1).

## 4. Ingestão (como um documento vira trechos pesquisáveis)

1. **Extração do texto** página a página (biblioteca `unpdf`, em JavaScript puro, que roda
   também na Vercel). PDFs escaneados (só imagem) não têm texto e são recusados com mensagem
   clara (OCR fica para depois).
2. **Limpeza**: remove sumário (linhas com "......"), cabeçalhos e rodapés repetidos em muitas
   páginas e hifenização de quebra de linha ("trabalha-\ndor" vira "trabalhador").
3. **Divisão por estrutura** (*chunking*): o texto é cortado nos títulos e itens numerados
   ("1.5.7.3.2", "11.2 Matriz de risco", "Art. 3º", "CAPÍTULO") e cada trecho fica com
   **até 120 palavras** (cerca de 170 tokens). Cada trecho guarda a **seção** a que pertence
   e as **páginas**. É isso que permite citar "Manual GRO/PGR, 11.6 Classificação dos Riscos,
   p. 70". O tamanho saiu da avaliação (seção 9): trechos de 300 palavras misturavam assuntos
   e acertavam menos.
4. **Só o texto vai para o embedding**: testamos prefixar "Documento: … / Seção: …" e a busca
   piorou (MRR 0,68 → 0,58), porque o prefixo deixa parecidos trechos diferentes da mesma
   seção. Título e seção continuam guardados para a busca por palavras e para a citação.
5. **Embeddings**: OpenAI `text-embedding-3-large` com 1.536 dimensões (escolhido no teste de
   09/10, `docs/rag/2026-10-09-teste-embeddings.pdf`: 18/24 acertos no 1º lugar contra 12/24
   do modelo menor). O modelo é fixo da plataforma e fica registrado em cada documento
   (`embedding_model`), para permitir trocar de modelo no futuro reprocessando a base.
6. **Triagem anti-injeção** (ver seção 8): trechos com cara de instrução para IA são marcados e
   ficam fora da busca.

Custo: a base global inteira (6 documentos + 21 referências, cerca de 650 trechos) tem perto
de 110 mil tokens, o que dá menos de US$ 0,02 por reprocessamento completo (US$ 0,13 por
milhão de tokens).

## 5. Armazenamento (Supabase/Postgres + pgvector)

- `kb_documents`: um registro por documento (título, tipo, órgão, ano, URL, citação, empresa
  dona ou `null` = global, status do processamento, modelo de embedding).
- `kb_chunks`: os trechos (texto, seção, páginas, vetor de 1.536 dimensões, índice de texto
  completo em português sem acentos, marcação de triagem).
- **Isolamento**: RLS. Documentos globais são visíveis a todos os usuários autenticados;
  documentos da empresa só a ADMIN/RH/gestores da mesma empresa. Gravação só pelo servidor
  (service role), depois de conferir o papel do usuário.
- **Sem índice aproximado (HNSW) na v1**: com poucos milhares de trechos, a busca exata leva
  milissegundos e não perde resultados por causa do filtro por empresa. O índice entra quando a
  base passar de ~50 mil trechos.
- Arquivos enviados pela empresa ficam no bucket privado `kb-documents` (10 MB, PDF/TXT/MD).

## 6. Busca híbrida

Para cada pergunta, duas buscas em paralelo dentro do banco (função `kb_search`):

1. **Semântica**: os 40 trechos com vetor mais próximo da pergunta (distância de cosseno).
2. **Por palavras**: os 40 trechos que somam mais **IDF** dos termos da pergunta (texto
   completo em português, sem acentos, com radicais: "avaliação" encontra "avaliar"). O IDF dá
   peso a termos raros ("1.5.5.2.2", "AEP", "PCMSO") e quase nenhum a termos que estão em todo
   trecho ("trabalho", "risco"). A primeira versão usava o `ts_rank_cd` do Postgres, sem IDF,
   e piorava a busca.

As duas listas são combinadas por **Reciprocal Rank Fusion** (RRF, k = 60): cada trecho soma
1/(60 + posição) da lista semântica e 0,5/(60 + posição) da lista por palavras. O peso 0,5 saiu
da avaliação: com ele, a busca acerta as perguntas com termo exato (item da norma, artigo,
sigla), que a busca só semântica perdia, com perda pequena nas perguntas em linguagem natural
(seção 9).

**Sem reranker na v1**: o top-5 híbrido cobre 78% das perguntas da avaliação e mandamos 6
trechos para o modelo. Um reranker é o próximo passo se a avaliação com as perguntas da equipe
mostrar perda.

Filtros: só documentos prontos, do mesmo modelo de embedding, globais ou da empresa do usuário,
sem trechos marcados pela triagem. Um **limiar mínimo de semelhança (0,40)** evita "citar por
citar" quando nenhum documento trata do assunto: na avaliação, o acerto menos parecido teve
0,47 e a pergunta fora do escopo mais parecida, 0,35.

## 7. Uso na IA

### Chat (assistente)
- A cada mensagem, o servidor busca os trechos mais relevantes (global + empresa) e os anexa ao
  prompt numerados `[1]`, `[2]`… junto com os **escores da pesquisa mais recente** (contexto
  direto).
- A IA é instruída a citar `[n]` ao usar um trecho e a dizer quando os documentos não cobrem o
  assunto.
- As fontes ficam salvas na mensagem (`chat_messages.metadata.sources`) e aparecem abaixo da
  resposta: título, seção, página e link. Só aparecem as fontes que a resposta citou.

### Planos de ação (pipeline)
- Para cada par dimensão + intervenção, o servidor busca trechos usando o nome da dimensão, a
  intervenção e a pergunta da pesquisa que mais pesou.
- O Consultant recebe os trechos com identificadores `[F1]`, `[F2]`… e devolve em cada plano
  quais usou (`source_ids`).
- O servidor **descarta identificadores que não foram fornecidos** (a IA não consegue inventar
  uma fonte) e grava as fontes no plano (`ai_recommendation.sources`), exibidas na tela do plano
  em "Fontes consultadas".

## 8. Segurança: injeção de instruções (*prompt injection*)

Um documento enviado (ou um trecho de PDF) pode conter texto como "ignore as instruções
anteriores e…". Defesas, em camadas:

1. **Triagem na ingestão**: trechos com padrões típicos de instrução para IA (em português e
   inglês) são marcados (`flagged`) e não entram na busca; o RH vê o aviso na tela de documentos.
2. **Delimitação**: os trechos vão ao modelo dentro de um bloco `<documentos>`, cada um em
   `<trecho id=… fonte=…>`. Qualquer tag parecida dentro do próprio texto é removida antes, para
   o documento não "fechar" o bloco e escrever fora dele.
3. **Instrução explícita**: o prompt diz que o conteúdo do bloco é material de consulta, nunca
   ordem, e que instruções encontradas ali devem ser ignoradas (e, se relevante, apontadas ao
   usuário).
4. **Rótulo de confiança**: cada trecho indica se é fonte oficial ou documento da empresa (não
   verificado).
5. **Saída validada**: as fontes citadas são conferidas contra as fornecidas; o plano continua
   passando pela validação de formato já existente; nenhum número vem da IA.
6. **Sem ferramentas**: nem o chat nem o pipeline executam ações a partir do texto da IA (não
   enviam e-mail, não alteram o banco por conta própria). O pior caso de uma injeção que
   escape é um texto ruim, que o RH revisa antes de aprovar.

**Isolamento entre empresas**: a empresa da busca vem sempre da sessão no servidor, nunca do
navegador. A função de busca só é executável pelo servidor.

**LGPD**: o texto dos documentos é enviado à OpenAI para gerar os vetores (já informado em
Privacidade e no consentimento de 09/10). A tela de envio orienta a **não enviar documentos com
dados pessoais** (nomes, CPF, prontuários). Excluir um documento apaga o arquivo e os trechos.

## 9. Avaliação

**Resultado em 09/10** (36 perguntas com resposta + 3 fora do escopo; relatório completo em
`docs/rag/avaliacao/resultado-2026-10-09.md`):

| Configuração | 1º lugar | Top-5 | MRR |
|---|---|---|---|
| Trechos de 300 palavras, cabeçalho no embedding, palavras sem IDF (1ª versão; 31 perguntas, sem as de termo exato) | 32% | 68% | 0,45 |
| Trechos de 120 palavras, só texto, só busca semântica | 44% | 81% | 0,59 |
| **Trechos de 120 palavras, só texto, híbrida com IDF (peso 0,5) — adotada** | 36% | 78% | 0,54 |

Nas perguntas com termo exato (item da norma, artigo, sigla), a híbrida traz o trecho certo no
top-5 em 4 de 5 (o 5º vem em 6º lugar, ainda dentro dos 6 trechos enviados à IA); a
só-semântica, em 2 de 5. No conjunto todo, a híbrida fica 1 acerto abaixo no top-5 — diferença
dentro do ruído de 36 perguntas. Trocamos esse 1 acerto por robustez em termos exatos, que são
comuns em perguntas de RH sobre a norma. As 3 perguntas fora do escopo não trazem trechos
acima do limiar. Com 36 perguntas, diferenças de 1 a 2 acertos são ruído: o conjunto da equipe
(30 a 50 perguntas reais de RH) vai confirmar ou corrigir esses números.

Como funciona:

- Conjunto de perguntas em `docs/rag/avaliacao/perguntas.csv`: pergunta, documento esperado e
  um ou mais **trechos-âncora** (frase curta que precisa aparecer no trecho recuperado). A
  âncora em texto, em vez de número do trecho, sobrevive a mudanças no *chunking*.
- A equipe escreve de 30 a 50 perguntas reais de RH. O arquivo já começa com as 24 perguntas do
  teste de 09/10.
- `scripts/rag/evaluate.ts` roda a busca real do banco e calcula **acerto no 1º lugar**,
  **acerto no top-5** e **MRR**, por documento, gravando o relatório em
  `docs/rag/avaliacao/`.
- Rodar a avaliação antes e depois de qualquer mudança em *chunking*, busca ou modelo.

## 10. Limitações conhecidas (v1)

- PDFs escaneados sem texto não são aceitos (sem OCR).
- DOCX/planilhas não são aceitos (converta para PDF).
- Tabelas e figuras viram texto corrido. A matriz 5×5 e a tabela de níveis e prazos do Manual
  GRO/PGR (p. 68 a 70) saem legíveis, mas as cores da figura 32 não.
- Documentos de datas diferentes podem divergir: o Guia de 2025 cita vigência em 26/05/2025, e
  o Perguntas e Respostas de 2026 traz a data atual (26/05/2026). A IA recebe o ano de cada
  fonte e a orientação de preferir a mais recente e apontar a divergência.
- Sem reranker; sem índice HNSW (ver seções 5 e 6).
- A base global é atualizada por script (`scripts/rag/ingest-global.ts`), não pela interface.

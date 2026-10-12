# Questionários do Sentinel — versões, pontuação e uso na NR-1

Atualizado em 12/10/2026 (migração `20261012174401_instrumentos_validados.sql`). Este
documento explica, para cada questionário, qual versão o Sentinel aplica, de onde ela vem,
como os escores e o semáforo são calculados e como cada dimensão entra no Dossiê NR-1.

## Resumo

| Questionário | Versão aplicada | Perguntas / dimensões | Resposta | Semáforo | No Dossiê NR-1 | Licença |
|---|---|---|---|---|---|---|
| COPSOQ II | Portuguesa oficial (Silva et al., manual 2013) | 41 / 76 / 119 (curta, média, longa); 26 / 29 / 35 dimensões | 5 pontos | Tercis do manual (33,3 e 66,7) | Identifica perigos (instrumento principal) | Gratuito, inclusive uso comercial, seguindo as diretrizes da rede COPSOQ |
| COPSOQ III | Média portuguesa (Cotrim et al., 2022) | 85 / 31 dimensões | 5 pontos | Tercis | Identifica perigos | Idem COPSOQ |
| JSS | Brasileira (Souza, Milani e Alexandre, 2015; validada em 2017) | 36 / 9 facetas | 6 pontos | Cortes do autor (40 e 60) | Indício de perigo, a confirmar | Gratuito só para pesquisa e ensino; **uso comercial exige licença do autor** |
| OLBI | Brasileira, 13 itens (Schuster e Dias, 2018) | 13 / 2 dimensões | 4 pontos | Cortes de burnout (Peterson et al., 2008) | Efeito à saúde: não monta inventário | A verificar com a autora antes de uso comercial |

## COPSOQ II — versão portuguesa oficial

Versão validada em Portugal com 4.162 trabalhadores (Silva et al.). Detalhes na migração
`20261009124759_copsoq_ii_oficial.sql`. Tem valores de referência nacionais por dimensão
(Tabela 3 do manual). Semáforo pelos tercis do manual: a amplitude 1–5 dividida em três
partes iguais (2,33 e 3,66), que no 0–100 são 33,3 e 66,7.

## COPSOQ III — versão média portuguesa

- **Fonte do COPSOQ III:** Cotrim, T. P. et al. (2022), *IJERPH* 19(3):1167. Validação preliminar em
  municípios e serviços de saúde (N = 659). Os textos vêm da Tabela 1 do artigo (acesso
  aberto, licença CC BY).
- **Perguntas que saíram do COPSOQ III (versão reduzida de 85 itens, recomendada pelo
  artigo):** Q20 "O seu trabalho requer que tenha iniciativa?", Q24 "Se tiver um assunto
  pessoal para tratar, consegue deixar a sua tarefa por meia hora sem precisar de
  autorização?", Q25 "Precisa de fazer horas extra?", Q68 "A gestão de topo oculta
  informação aos seus trabalhadores?", Q73 "Há momentos em que precisa de estar a trabalhar e
  gerir a vida privada/familiar ao mesmo tempo?", Q77 "Devido ao seu trabalho tem que alterar
  os seus planos familiares e pessoais?", Q80 (satisfação com o salário) e Q81 (satisfação com
  as condições físicas). A versão média do COPSOQ III não tem a escala "Comportamentos
  ofensivos".
- **Formatos de resposta e direções do COPSOQ III:** o artigo diz só que os itens usam escala de 5 pontos
  ("nunca" a "sempre" e "nada" a "extremamente"), sem dizer qual item usa qual. Seguimos a
  convenção do COPSOQ II português, da mesma equipe: exigências, organização do trabalho e
  relações em **frequência**; significado, compromisso, insegurança, qualidade do trabalho,
  conflito trabalho-família e satisfação em **intensidade**; saúde geral com a escala do
  COPSOQ II (Excelente … Deficitária).
- **Itens de saúde** (sono, burnout, stress, sintomas depressivos) recebem o período "Nas
  últimas 4 semanas", como no COPSOQ III internacional.
- **Item invertido:** "Os trabalhadores confiam uns nos outros de um modo geral?" — a
  Confiança horizontal fica com alto = risco, como no COPSOQ II português.
- **O COPSOQ III não tem valores de referência nacionais publicados**; o semáforo usa os tercis.
- **Não existe validação brasileira robusta do COPSOQ III** publicada em revista revisada por
  pares; por isso usamos a portuguesa, na mesma língua do COPSOQ II que já aplicamos.
- A versão anterior que estava no banco (70 itens, 26 escalas, origem desconhecida) foi
  arquivada como `copsoq_iii_legado`.

## JSS — Job Satisfaction Survey (versão brasileira)

- **Fonte do JSS:** Spector (1985/1994). Versão brasileira de Souza, Milani e Alexandre (2015,
  *RBSO* 40(132):219-227), validada por Souza, Alexandre e Guirardello (2017, *Journal of
  Nursing Measurement* 25:46-65). Textos do arquivo publicado no site do autor
  (tradução/adaptação de Ana Cláudia de Souza, Unicamp).
- **Estrutura do JSS:** 9 facetas de 4 itens — Pagamento (1, 10, 19, 28), Promoção (2, 11, 20, 33),
  Supervisão (3, 12, 21, 30), Benefícios (4, 13, 22, 29), Recompensas (5, 14, 23, 32),
  Procedimentos (6, 15, 24, 31), Colegas de trabalho (7, 16, 25, 34), Natureza do trabalho
  (8, 17, 27, 35) e Comunicação (9, 18, 26, 36).
- **Itens invertidos do JSS (19):** 2, 4, 6, 8, 10, 12, 14, 16, 18, 19, 21, 23, 24, 26, 29, 31, 32, 34
  e 36.
- **Resposta do JSS:** Discordo muito, Discordo moderadamente, Discordo pouco, Concordo pouco,
  Concordo moderadamente, Concordo muito.
- **Semáforo do JSS (insatisfeito, ambivalente, satisfeito):** o autor diz que não há um corte "científico" e propõe a regra absoluta —
  média por item (após inverter) **de 3 ou menos = insatisfação**, **de 4 ou mais =
  satisfação**, entre 3 e 4 = ambivalência. No 0–100 do Sentinel: vermelho até 40
  (inclusive), verde a partir de 60, amarelo entre os dois.
- **O JSS no Dossiê NR-1 / inventário de riscos:** o JSS mede satisfação, não exposição a perigos. As facetas entram no
  inventário como **indício** do perigo correspondente, e o Dossiê avisa que precisam ser
  confirmadas por observação e escuta.
- **Licença do JSS (pode usar de graça na empresa?):** o JSS é gratuito só para uso não
  comercial em pesquisa e ensino (inclui trabalhos de conclusão). Cobrar por um serviço que inclua a escala exige licença paga do autor
  (paulspector.com). O aviso aparece na descrição do questionário ao criar a pesquisa.

## OLBI — Inventário de Burnout de Oldenburg (versão brasileira)

- **Fonte do OLBI:** Demerouti e Bakker (2008); versão brasileira de Schuster e Dias (2018,
  *Ciência & Saúde Coletiva* 23(2):553-562), com 273 trabalhadores. O original tem 16 itens;
  o Sentinel aplica a **versão brasileira validada de 13 itens**, sem os três que o artigo
  retirou: DT6 "O trabalho que faço hoje é o único que me imagino fazendo", EE8 "De uma
  forma geral, consigo administrar bem a quantidade de trabalho que tenho" e EE6 "Quando
  trabalho, sinto-me bem".
- **Dimensões do OLBI:** Exaustão (6 itens) e Desengajamento (7 itens), na ordem do original.
- **Resposta do OLBI:** 4 pontos, de "Discordo plenamente" a "Concordo plenamente".
- **Itens invertidos do OLBI (5):** as frases positivas — "Consigo suportar muito bem as pressões do
  meu trabalho", "Depois das tarefas profissionais, tenho energia para as minhas atividades
  de lazer", "Com frequência faço coisas novas e interessantes no meu trabalho", "Considero
  meu trabalho um desafio positivo" e "Sinto-me cada vez mais empenhado no meu trabalho". O
  original tem 4 frases positivas e 4 negativas por dimensão; a lista de itens invertidos do
  artigo põe DT8 ("farto das minhas tarefas", frase negativa) no lugar de DT7 ("cada vez mais
  empenhado"), o que tratamos como erro do artigo.
- **Correção de digitação no OLBI:** "venho me desinteressado" → "venho me desinteressando".
- **Ponto de corte de burnout do OLBI (semáforo):** pontos de corte de Peterson et al. (2008) — exaustão com média ≥ 2,25
  e desengajamento com média ≥ 2,10 (escala 1–4). No 0–100: 41,67 e 36,67. Há um corte só,
  então o semáforo tem duas cores: verde abaixo, vermelho a partir do corte.
- **O OLBI no Dossiê NR-1 / inventário de riscos:** o OLBI mede efeito à saúde (burnout), não fatores de risco do trabalho. Ele
  não monta inventário sozinho; o Dossiê avisa e recomenda usar com o COPSOQ. Quando aplicado
  junto, exaustão em vermelho conta como evidência de agravo no grupo.
- A versão anterior (16 itens, com os itens 5 e 6 trocados de dimensão e o item 16 diferente
  do original) foi arquivada como `olbi_legado`.

## Semáforo com cortes por escala

Cada dimensão pode ter cortes próprios (`questionnaire_scales.cut_low` e `cut_high`, no
0–100, com a fonte em `cut_source`). Sem cortes próprios, valem os tercis do COPSOQ.

| Direção | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Alto = risco | abaixo de `cut_low` | entre os cortes | a partir de `cut_high` |
| Alto = favorável | a partir de `cut_high` | entre os cortes | até `cut_low` (inclusive) |

Conversão de uma escala de 1 a *k* para 0–100: (média − 1) / (*k* − 1) × 100. As respostas
são gravadas como inteiros (ex.: 0, 33, 67 e 100 na escala de 4 pontos); o arredondamento
desloca a média em no máximo 0,01 na escala original.

## Dossiê NR-1

- **Mapa escala → perigo próprio de cada instrumento** (`src/lib/nr1/hazards.ts`), seguindo a
  listagem exemplificativa do Guia do MTE (2025). Um teste confere que nenhuma escala de
  instrumento ativo fica sem papel definido.
- **Probabilidade proporcional ao limite verde da dimensão:** acima do limite verde, sem
  exposição relevante; abaixo, 3/4, 1/2 e 1/4 do limite separam as probabilidades 2 a 5. Nos
  tercis do COPSOQ (limite 66,7) isso dá 50, 33,3 e 16,7 — os mesmos valores de antes; no JSS
  (limite 60), 45, 30 e 15.

## Categorias universais corrigidas

As categorias agrupam dimensões de instrumentos diferentes na Visão Geral e orientam o
catálogo de intervenções da IA.

- COPSOQ II: "Conflito trabalho/família" e "Conflito família/trabalho" saem de "Segurança e
  Estabilidade" para "Carga de Trabalho".
- JSS: "Promoção" sai de "Segurança e Estabilidade" para "Autonomia e Desenvolvimento".
- OLBI: as duas dimensões ficam em "Burnout e Saúde".

## Para a equipe validar

- Direções do COPSOQ (II e III): Saúde geral, Confiança horizontal e Exigências cognitivas
  com alto = risco.
- Formatos de resposta do COPSOQ III atribuídos pela convenção do COPSOQ II (o artigo não
  detalha) e o período "Nas últimas 4 semanas" nos itens de saúde.
- Mapa escala → perigo dos quatro instrumentos.
- Licenças antes de vender: JSS (licença do autor), OLBI (verificar), COPSOQ (diretrizes da
  rede: sem modificar o questionário e sem cobrar pelo questionário em si).

## Referências

- Cotrim, T. P., Bem-Haja, P., Pereira, A., Fernandes, C., Azevedo, R., Antunes, S., Pinto,
  J. S., Kanazawa, F., Souto, I., Brito, E., & Silva, C. F. (2022). The Portuguese third
  version of the Copenhagen Psychosocial Questionnaire: preliminary validation studies of the
  middle version among municipal and healthcare workers. *International Journal of
  Environmental Research and Public Health*, 19(3), 1167. https://doi.org/10.3390/ijerph19031167
- Demerouti, E., & Bakker, A. B. (2008). The Oldenburg Burnout Inventory: a good alternative
  to measure burnout and engagement. In J. Halbesleben (Ed.), *Stress and burnout in health
  care*. Nova Science.
- Peterson, U., Demerouti, E., Bergström, G., Samuelsson, M., Åsberg, M., & Nygren, Å. (2008).
  Burnout and physical and mental health among Swedish healthcare workers. *Journal of
  Advanced Nursing*, 62(1), 84-95. https://doi.org/10.1111/j.1365-2648.2007.04580.x
- Schuster, M. S., & Dias, V. V. (2018). Oldenburg Burnout Inventory — validação de uma nova
  forma de mensurar Burnout no Brasil. *Ciência & Saúde Coletiva*, 23(2), 553-562.
  https://doi.org/10.1590/1413-81232018232.27952015
- Silva, C. F. et al. Copenhagen Psychosocial Questionnaire — COPSOQ: Portugal e países
  africanos de língua oficial portuguesa. Universidade de Aveiro.
- Souza, A. C., Milani, D., & Alexandre, N. M. C. (2015). Adaptação cultural de um instrumento
  para avaliar a satisfação no trabalho. *Revista Brasileira de Saúde Ocupacional*, 40(132),
  219-227. https://doi.org/10.1590/0303-7657000113715
- Souza, A. C., Alexandre, N. M. C., & Guirardello, E. B. (2017). Validation of the Brazilian
  version of the Job Satisfaction Survey using confirmatory factor analysis. *Journal of
  Nursing Measurement*, 25, 46-65.
- Spector, P. E. (1985). Measurement of human service staff satisfaction: development of the
  Job Satisfaction Survey. *American Journal of Community Psychology*, 13(6), 693-713.
- Spector, P. E. Interpreting satisfaction scores with the Job Satisfaction Survey.
  paulspector.com.

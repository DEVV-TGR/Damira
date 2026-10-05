# Base de dados — o esquema

Este ficheiro traduz o contrato de `src/lib/dados/tipos.ts` em tabelas. **Não
redefine regras**: o pedido é do `pedidos.md`, a concorrência e os índices são do
`robustez.md`, a entrada no painel é do `painel.md`. Aqui está só **como** a base
de dados as guarda e as faz cumprir.

Proposta de 05/10/2026 (Sobral), para rever na #27. A implementação troca o que
está por trás de `src/lib/dados/index.ts` e `src/lib/sessao-painel/index.ts` —
**as assinaturas não mudam**. Se uma tabela daqui pedir uma assinatura diferente,
muda primeiro o contrato, num PR revisto pelo outro (`divisao.md`).

O que falta fazer e confirmar quando houver conta Neon — a região, os ramos, as
variáveis, a ordem dos passos — está em `ligar-a-neon.md`.

## As ferramentas

- **Neon**, com o driver HTTP (`@neondatabase/serverless`). Dois ramos:
  desenvolvimento e produção. Nunca se testa contra o de produção.
- **Drizzle** como ORM. O esquema escreve-se em TypeScript em `src/db/` (que o
  `CODEOWNERS` já protege) e o `drizzle-kit` gera as migrações em SQL, que vão no
  PR e se leem como SQL. Funciona com o driver HTTP da Neon e com o PGlite.
- **PGlite** nos testes: um Postgres verdadeiro a correr dentro do Node, sem
  conta, sem Docker e sem rede. É o que deixa construir e testar tudo isto antes
  de a conta Neon existir (a #26 abre-a na visita à loja).

⚠️ **O driver HTTP da Neon só faz transações não interativas.** Manda-se um lote
de instruções e ele corre-o inteiro ou nada — mas não se pode ler um resultado a
meio e decidir o resto. Por isso, **toda a escrita que tem de ser tudo-ou-nada é
uma instrução SQL só** (com `WITH … RETURNING`) **ou um lote em que nenhuma
instrução depende de ler a anterior**. Nunca «ler, decidir no código, escrever».
É a mesma regra de `robustez.md` › Concorrência vista do lado do código — e é
também o que faz o PGlite e a Neon comportarem-se igual nos testes.

## Convenções

- Tabelas e colunas em português, `snake_case`; no TypeScript, `camelCase`.
- **Instantes em `timestamptz`** (guardam UTC). **Dias de Lisboa em `date`**
  (`esgotado_no_dia`, os contadores por dia): um dia de calendário não é um
  instante, e guardá-lo como meia-noite UTC dava o dia anterior no verão.
- **Dinheiro em `integer`, em cêntimos, com `CHECK (… >= 0)`**. Colunas com o
  sufixo `_cent`.
- **Quantidades em `numeric`**: ao quilo pede-se 1,5 kg. O dinheiro continua
  inteiro — o total de uma linha arredonda-se uma vez, como já faz o `json.ts`.
- **Texto em duas línguas**: `_pt` obrigatório, `_en` opcional — como o `Texto`
  do contrato.
- **Pares que vivem juntos** (o tempo de produção, o limite) levam um `CHECK`
  que os obriga a estar os dois ou nenhum. Meio par é um dado que o código não
  sabe ler.
- **Listas simples em `text[]`**. **Estruturas que só se mostram em `jsonb`**,
  validadas pelo esquema `zod` do contrato ao gravar e ao ler.
- **Nada se apaga.** Produtos arquivam-se, pedidos nunca saem (`pedidos.md`).
  As chaves estrangeiras não levam `ON DELETE CASCADE`.

## O catálogo

### `produtos`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `id` | `text` chave primária | `id` (`nata`, `festa-premium`) |
| `posicao` | `integer` | a ordem do catálogo; um produto novo vai para o fim |
| `origem` | `text` `CHECK` (`ementa`, `encomendas`) | `origem` |
| `familia` | `text` `CHECK` (`ementa`, `festa`, `bolo`, `box`, `medida`) | `familia` |
| `nome_pt`, `nome_en` | `text`, `text` nulo | `nome` |
| `descricao_pt`, `descricao_en` | `text` nulo | `descricao` |
| `carta`, `categoria`, `subcategoria` | `text` nulo | iguais |
| `unidade` | `text` `CHECK` (`un`, `kg`) | `unidade` |
| `escolhas` | `text[]` | `escolhas` |
| `tempo_producao_unidade`, `tempo_producao_valor` | `text`, `numeric`, nulos | `tempoProducao` — `NULL` é «por preencher» |
| `quantidade_minima`, `multiplo` | `numeric` `> 0` | iguais |
| `a_venda_online`, `aparece_na_ementa` | `boolean` | iguais |
| `alergenios` | `text[]` nulo | ⚠️ `NULL` é «por responder», `{}` é «sem alergénios» |
| `vegan`, `sem_gluten` | `boolean` | iguais |
| `fotos` | `text[]` | os URLs do Vercel Blob (#32) |
| `sinal_percent` | `integer` nulo, `CHECK` 1–100 | `sinalPercent` |
| `limite_quantidade`, `limite_modo` | `integer`, `text` (`porDia`, `total`), nulos | `limite` |
| `arquivado`, `fora_de_venda` | `boolean` | iguais |
| `esgotado_no_dia` | `date` nulo | o dia de Lisboa; amanhã já não vale |

**O `id` é o próprio código, e não um número.** O contrato diz que ele nunca
muda e usa-o em todo o lado — no URL, no cesto guardado no browser, nas linhas
dos pedidos. Um número por baixo obrigava a traduzir número ↔ código em cada
leitura e escrita, sem ninguém de fora o ver. O código gera-se no servidor a
partir do nome, como já faz o `json-painel.ts` (`croissant`, `croissant-2`…). O
`produtos(slug)` único do `robustez.md` é esta chave primária.

### `variantes`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `produto_id` | `text` → `produtos` | — |
| `id` | `text` | `id` (`unica`, `20`) |
| `posicao` | `integer` | a ordem dos escalões (20, 30, 50…) |
| `rotulo_pt`, `rotulo_en` | `text` nulo | `rotulo` |
| `pessoas` | `integer` nulo | `pessoas` |
| `preco_cent` | `integer` nulo, `>= 0` | ⚠️ `NULL` é **sob orçamento**, nunca zero |
| `composicao` | `jsonb` | `composicao`, validada pelo `EsquemaGrupoComposicao` |

Chave primária `(produto_id, id)`: a `unica` repete-se em todos os produtos.

**A composição vai em `jsonb` e não em tabelas** porque só se mostra — ninguém
pergunta «que kits levam rissóis?» — e o pedido guarda a sua própria cópia em
texto. Duas tabelas a mais para um dado que se lê inteiro e se escreve inteiro
eram duas tabelas para manter sem ganho nenhum.

## A casa — uma linha só

`casa`, com `id smallint` chave primária e `CHECK (id = 1)`: há uma casa, e a
restrição impede que um erro crie a segunda.

| Coluna | Tipo | Do contrato |
|---|---|---|
| `horario_loja`, `horario_cozinha` | `jsonb`, a cozinha nula | `loja`, `cozinha` (`HorarioSemanal`) |
| `dias_fechados` | `jsonb` | `diasFechados` |
| `duracao_vaga_minutos`, `dias_a_frente` | `integer` | iguais |
| `limite_por_vaga` | `integer` nulo | `limitePorVaga` |
| `limiar_livre`, `limiar_media` | `integer` | `limiaresAfluencia` |
| `aceitar_cancelamentos_site`, `devolver_sinal_ao_cancelar` | `boolean`, `false` por defeito | `DefinicoesLoja` |
| `valor_minimo_cent` | `integer` nulo | `valorMinimoCent` |
| `pausa_ate` | `timestamptz` nulo | `pausaAte` |
| `ordem_ementa` | `jsonb` | `OrdemEmenta` |
| `versao_pedidos` | `bigint` | `versaoPedidos` |
| `pin_equipa_hash` | `text` nulo | a entrada no painel (#33) |

**Os horários vão em `jsonb`** porque a gerente grava-os sempre inteiros
(`guardarHorarios` recebe o `EsquemaHorarios` todo), o motor lê-os inteiros, e
nenhuma consulta SQL pergunta por um dia da semana. O `EsquemaHorarios` valida-os
ao gravar; um `jsonb` que não passe no esquema ao ler é um erro, não um dado.

**A cozinha começa `NULL`**: a casa ainda não a deu (`horarios.md` › À espera), e
sem ela o calendário diz «indisponível» em vez de inventar.

## Os pedidos

### `pedidos`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `id` | `uuid` chave primária | `id` (o `json.ts` já gera um UUID) |
| `referencia` | `text` único | `DAM-DDMM-XXXX` |
| `estado` | `text` `CHECK` dos 5 estados | `estado` |
| `criado_em`, `levantamento_em` | `timestamptz` | iguais |
| `pago_em`, `impresso_em`, `entregue_em`, `cancelado_em`, `reagendado_em` | `timestamptz` nulo | iguais |
| `cliente_nome`, `cliente_email`, `cliente_telefone` | `text` | `cliente` — o telefone é obrigatório (ver «Em aberto», 5) |
| `cliente_nif`, `conta_id` | `text` nulo | `cliente` |
| `observacoes` | `text` nulo | `observacoes` |
| `total_cent`, `pago_online_cent` | `integer` `>= 0` | iguais |
| `modo_pagamento` | `text` `CHECK` (`total`, `sinal`) | `modoPagamento` |
| `chegou_tarde` | `boolean` | `chegouTarde` |
| `cancelado_por` | `text` nulo `CHECK` (`cliente`, `gerente`) | `canceladoPor` |
| `avisos_tratados` | `text[]`, `CHECK` contra os 4 do contrato | `avisosTratados` |
| `chave_idempotencia` | `uuid` único | **só da base de dados** |
| `ip` | `text` nulo | **só da base de dados** |
| `stripe_session_id` | `text` único, nulo | **só da base de dados** (#38) |
| `procura` | `text` | **só da base de dados** |
| `reembolso_reservado_cent` | `integer` `>= 0`, `CHECK (… <= pago_online_cent)` | **só da base de dados** (ver «Reembolsos ao mesmo tempo») |

**O `reembolsadoCent` não tem coluna.** O contrato define-o como a soma dos
reembolsos `concluido`, e o `pedidos.md` avisa que um campo derivado guardado é um
campo que um dia não bate certo. A fonte soma-o ao ler; o `Pedido` que o painel
recebe traz-o na mesma.

**O cliente vive no pedido** e não numa tabela `clientes`. É a fotografia do
momento: quem muda de telefone não muda o pedido de ontem. E a conta de cliente
nem é nossa — vem do Google; o `conta_id` é só o identificador dela.

**As colunas «só da base de dados»** servem regras que já estão escritas, e o
frontend nunca as vê: a idempotência (`robustez.md` › Envios duplicados), o
limite por IP (`robustez.md` › Limites), a sessão do Stripe (`pagamentos.md`).
A `procura` é o nome do cliente e a referência **sem acentos e em minúsculas**,
escrita uma vez ao criar o pedido — é o que deixa encontrar «a encomenda da
Márcia» escrevendo `marcia`, sem depender de uma extensão do Postgres que o
PGlite e a Neon podiam ter de forma diferente.

### `linhas_pedido`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `pedido_id` | `uuid` → `pedidos` | — |
| `posicao` | `integer` | a ordem do cesto |
| `produto_id`, `variante_id` | `text` | iguais; `produto_id` → `produtos` |
| `nome`, `variante` | `text`, `text` nulo | **cópia** do texto desse dia |
| `escolhas` | `text[]` | **cópia** |
| `unidade` | `text` | **cópia** |
| `quantidade` | `numeric` `> 0` | `quantidade` |
| `preco_unitario_cent`, `total_cent` | `integer` `>= 0` | o preço **desse dia** |
| `notas` | `text` nulo | `notas` |

Chave primária `(pedido_id, posicao)`. A ligação a `produtos` é segura porque
nenhum produto se apaga; e ⚠️ **nunca se lê o nome nem o preço através dela** —
um pedido antigo diz o que se pagou nesse dia (`pedidos.md`).

### `reembolsos`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `id` | `text` chave primária | `id` |
| `pedido_id` | `uuid` → `pedidos` | — |
| `valor_cent` | `integer` `> 0` | `valorCent` |
| `estado` | `text` `CHECK` (`pendente`, `concluido`, `falhado`) | `estado` |
| `pedido_em` | `timestamptz` | `pedidoEm` |
| `stripe_refund_id` | `text` único, nulo | **só da base de dados** (#49) |

### Reembolsos ao mesmo tempo

É a última vaga outra vez, do lado do dinheiro. O `pedidos.md` diz «nunca mais
do que o que foi pago online e ainda não foi devolvido». Dois reembolsos pedidos
ao mesmo tempo — a gerente no telemóvel e no computador, ou um duplo clique —
leem os dois o mesmo «falta devolver», passam os dois a verificação, e juntos
devolvem mais do que se pagou.

Por isso o pedido guarda **`reembolso_reservado_cent`**: o que já foi devolvido
**ou está a caminho** (os reembolsos `pendente` e `concluido`), com
`CHECK (reembolso_reservado_cent <= pago_online_cent)`. Pedir um reembolso é um
lote só: soma ao contador e insere o reembolso. Se a soma passar o que foi pago,
o `CHECK` falha e o segundo reembolso não existe. Quando o Stripe diz que um
falhou (`pagamentos.md`), o contador desconta-o na mesma instrução que muda o
estado — o dinheiro volta a estar «por devolver».

Não contradiz a decisão sobre o `reembolsadoCent`: este contador não é o que o
contrato devolve — é uma trava, como os contadores das vagas, e o
`reembolsadoCent` continua a somar-se só dos `concluido`. Um teste confirma que
o contador bate sempre com a soma dos reembolsos `pendente` e `concluido`.

### Como o pedido muda de estado

- **Cada transição é um `UPDATE … WHERE estado = …` com `RETURNING`.** Zero
  linhas devolvidas quer dizer que o pedido já não estava no estado de partida
  — é o `estado-mudou` do contrato. Dois toques em «entregue», em dois tablets,
  entregam uma vez.
- **Os 5 minutos do balcão** para desfazer um «entregue» vão na mesma condição
  (`… AND entregue_em > agora − 5 min`), com o `agora` do contexto.
- **Cada escrita num pedido sobe `casa.versao_pedidos` na mesma instrução**, e a
  ação chama a seguir o `avisarQuePedidosMudaram()`. Assim o polling do painel
  não falha uma alteração e a base de dados continua a dormir (`painel.md`).
- **A paginação é por cursor** — `(levantamento_em, id)` ou `(criado_em, id)`,
  conforme a `ordem` — e o cursor vai para o browser codificado e opaco, como o
  contrato pede. Nunca `OFFSET`: com pedidos a entrar, uma página saltava ou
  repetia linhas.
- **Sem N+1**: a lista do painel traz os pedidos, as linhas e os reembolsos em
  três consultas em lote, nunca uma por pedido.

## Vagas e quantidades — os contadores

É aqui que a regra 5 do `AGENTS.md` se cumpre: **a última vaga decide-a a base
de dados**.

| Tabela | Chave | Colunas |
|---|---|---|
| `vagas` | `inicio` (`timestamptz`) | `ocupadas integer`, `limite integer` nulo |
| `quantidades_dia` | `(produto_id, dia)` | `ocupadas numeric`, `limite integer` |
| `quantidades_total` | `produto_id` | `ocupadas numeric`, `limite integer` |

As três com `CHECK (ocupadas >= 0)` e `CHECK (limite IS NULL OR ocupadas <= limite)`.

**Como se reserva.** Criar o pedido soma aos contadores com
`INSERT … ON CONFLICT DO UPDATE SET ocupadas = ocupadas + n, limite = <limite de agora>`,
no mesmo lote que insere o pedido. Se a soma passar o limite, o `CHECK` falha, o
lote inteiro cai e ninguém fica com meia reserva: o cliente recebe `vaga-cheia`.
Dois clientes na última vaga — um passa, o outro é recusado pela base de dados.

**O limite é copiado para a linha do contador** porque um `CHECK` não pode ler
outra tabela. Vem um efeito que é exatamente o que o `painel-gerente.md` pede:
se a gerente baixar o limite abaixo do que já está vendido, os pedidos que
existem ficam, e o próximo a tentar reservar é recusado.

⚠️ **Descontar nunca mexe no `limite`.** Expirar, cancelar e reagendar só baixam
o `ocupadas`. Se o desconto escrevesse o limite novo, cancelar um pedido depois
de a gerente baixar o limite falhava no `CHECK` — e um cancelamento que falha é
um bolo feito para ninguém.

⚠️ **Pago depois de expirar volta a ocupar, e nunca falha** (`pedidos.md`: pago
ganha sempre). Nesse caminho a soma sobe o limite da linha até caber
(`limite = GREATEST(limite, ocupadas + n)`): a vaga fica acima do limite, e isso
é verdade — a cozinha tem mesmo mais um. A gerente vê o aviso `chegou-tarde` e
decide.

**A vaga identifica-se pelo instante em que começa**, e não por «dia + hora»: a
25 de outubro a hora 01:00 repete-se. A loja não abre a essa hora, mas um
instante não tem de pensar nisso.

**O que ocupa:** `pendente`, `pago` e `entregue`. `expirado` e `cancelado` não.
O `ocupacao(desde, ate)` do contrato é um `SELECT` nesta tabela, sem cache, e
devolve `{ inicio, pedidos: ocupadas }`.

**Reagendar** é um lote só: desconta na vaga antiga, soma na nova (com o
`CHECK`) e muda o pedido. Se a nova estiver cheia, cai tudo e o pedido fica onde
estava.

## Expirar sem tarefa agendada

Um `pendente` com mais de 30 minutos passa a `expirado` e liberta a vaga. Quem o
faz, por ordem:

1. o regresso do cliente que voltou atrás no checkout, e o webhook
   `checkout.session.expired` (`pagamentos.md`, do Gonçalo);
2. **uma limpeza que corre antes de ler a ocupação e dentro do `criarPedido`** —
   só quando há um cliente no site, ou seja, com a base de dados já acordada.

Não há tarefa agendada a acordar a base de dados para isto (regra 6). A limpeza
é uma instrução só: muda os pendentes antigos para `expirado` e desconta-os dos
contadores. A lógica completa é da #41.

## Limites de pedidos

- **Criar pedido**: 5 pendentes por IP e 3 por email ao mesmo tempo. Conta-se
  na própria instrução que insere o pedido, com índices parciais
  (`WHERE estado = 'pendente'`) em `ip` e em `cliente_email`.
- **PIN e código da gerente**: tabela `limites`, chave `(chave, janela)`, com
  uma `contagem`. A janela é o início do intervalo (os 15 minutos do PIN), e a
  chave diz o quê e de onde (`pin:<dispositivo>`, `codigo:<email>`).

## A entrada no painel (#33)

| Tabela | O que guarda |
|---|---|
| `sessoes_painel` | `token_hash` (chave), `papel`, `lembrar`, `dispositivo`, `criada_em`, `ultimo_uso_em`, `expira_em` |
| `codigos_gerente` | `email`, `codigo_hash`, `criado_em`, `expira_em`, `usado_em`, `tentativas` |

O PIN da equipa é o `casa.pin_equipa_hash`.

- **O cookie leva um token aleatório; a base de dados guarda o *hash* dele.**
  Quem lesse a base de dados não ficava com sessões abertas.
- **Mudar o PIN apaga as sessões de funcionário no mesmo lote** — é assim que se
  tira o acesso a quem saiu da casa (`painel.md`).
- O detalhe fecha-se na #33. As tabelas entram no mesmo PR do esquema porque a
  #27 já as inclui.

## O Stripe

`eventos_stripe`: `id` (o id do evento, chave primária), `tipo`, `recebido_em`.
Um evento repetido bate na chave primária e não faz nada (`pagamentos.md`). Mais
as colunas `pedidos.stripe_session_id` e `reembolsos.stripe_refund_id`, únicas.
Estão no esquema para o Gonçalo não precisar de uma migração para começar a #42.

## Índices

Os de `robustez.md` › Consultas, e mais nenhum:

- `pedidos(referencia)`, `pedidos(chave_idempotencia)` e
  `pedidos(stripe_session_id)`, únicos
- `pedidos(estado, levantamento_em)` — as listas do balcão
- `pedidos(criado_em, id)` — o arquivo e os pedidos da gerente, por cursor
- `pedidos(cliente_email)` — o histórico e os possíveis duplicados
- `pedidos(ip)` e `pedidos(cliente_email)` parciais, só `pendente` — os limites
- as chaves primárias dos contadores, das sessões e dos limites

## A migração do catálogo (#28)

O `json.ts` já converte os JSON no `Produto` do contrato (`CATALOGO_JSON`) —
euros em cêntimos, com o erro a rebentar em vez de arredondar em silêncio. **A
migração insere exatamente isso**, e a verificação é ler tudo da base de dados e
comparar com o `CATALOGO_JSON`, campo a campo, sem diferenças. Os ids ficam os de
hoje: vão no URL.

O horário da loja sai do `casa.json` para `casa.horario_loja`; a cozinha fica
`NULL`. As fotos de `public/` passam para o Blob na #32.

## O modo de teste e a base de dados

⚠️ **Os dados de exemplo nunca entram na base de dados.** A cozinha, os tempos e
os pedidos de exemplo (`exemplo.ts`) continuam a ser uma camada por cima da
fonte, ligada pelo `LOJA_EM_TESTE=1`. Um pedido de exemplo gravado na base de
dados não se distinguia de um verdadeiro, e ia parar a um relatório de vendas.

## Os testes

Os testes de especificação do Gonçalo (`dados.test.ts`, `painel.test.ts`,
`pedidos-painel.test.ts`, `vagas-servidor.test.ts`) estão hoje presos ao
`criarFonteJson`. Passam a correr contra **as duas fontes**, a dos JSON e a da
base de dados sobre o PGlite, com o mesmo conjunto de casos. É a prova de que a
troca no `index.ts` não muda nada para as páginas. Como mexe em
`src/lib/dados/`, pede a revisão do Gonçalo.

⚠️ **O PGlite tem uma ligação só**: não reproduz dois clientes ao mesmo tempo. O
teste da última vaga prova que o `CHECK` recusa a segunda reserva, não a corrida
em si. A corrida verdadeira testa-se no ramo de desenvolvimento da Neon, depois
da visita.

## Em aberto

1. **O limite por produto não se aplica em lado nenhum hoje** — o `json.ts` põe
   sempre `null`. Falta dizer de que dia é o «por dia». Proposta: o **dia de
   levantamento**, que é o único dia que o pedido tem; o dia de produção, num
   bolo de três dias, são três. *(Gonçalo)*
2. **Os avisos `disputa` e `apanhado-pela-verificacao`** estão no contrato, mas
   o pedido ainda não tem onde os guardar. Entram numa migração própria, depois
   de o `pedidos.md` os ter (#42, #43). *(Gonçalo)*
3. **Pago depois de expirar sobe o limite da vaga** (acima). É a forma de o
   `marcarPago` nunca falhar; confirmar com quem o escreve. *(Gonçalo)*
4. **PIN de 4 ou 6 dígitos** — pergunta à Damira (#25). Não muda o esquema.
5. **O telefone do cliente é obrigatório aqui, e opcional no contrato.** A
   página de compra (#59) exige-o, até 40 caracteres, porque é por ele que o
   balcão liga e o talão leva-o; o `EsquemaCliente` aceita `null`, até 30. O
   `pedidos.md` lê-se como obrigatório, e é o que esta coluna segue. Falta o
   contrato alinhar com a página (revisão do #59). *(Gonçalo)*

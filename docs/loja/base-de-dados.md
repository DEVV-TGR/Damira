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
  desenvolvimento e produção. Nunca se testa contra o de produção, com a
  exceção do site no ar em modo de teste até ao lançamento (`pagamentos.md` ›
  Ambientes).
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

**O lote escreve-se uma vez, e cada driver corre-o à sua maneira**
(`src/db/lote.ts`). A Neon por HTTP faz lotes e não faz transações; o PGlite faz
transações e não faz lotes. Uma escrita com várias partes — um produto e as
variantes dele — é por isso um `Lote`: uma função que devolve a lista de
instruções. O `loteNeon` manda-a como lote; o `loteEmTransacao` corre-a numa
transação. A fonte (`src/lib/dados/bd.ts`) recebe o executor e não sabe qual é —
o código que os testes provam é o mesmo que corre no site.

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
| `pede_confirmacao` | `boolean`, `false` por defeito | `pedeConfirmacao` — «Necessita de confirmação da loja», da gerente (`painel-gerente.md`) |
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

**O `pede_confirmacao` nasce calculado, e não do `DEFAULT`** (migração `0005`).
O `false` por defeito é o de um produto novo. Os que já existem ficam ligados só
se não tiverem preço nenhum — nenhuma variante com `preco_cent` —, a mesma conta
do `pedeConfirmacaoInicial` (`regras.ts`); é um `UPDATE` escrito à mão a seguir
à coluna que o `drizzle-kit` gera, e numa base vazia não muda nada. Daí para a
frente é da gerente. A prova sobre uma base que já tem produtos está em
`src/db/migracao-pede-confirmacao.test.ts`.

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

**A cozinha entra com a importação**: 06:00–11:00 todos os dias, como a casa
respondeu a 11/10 (`CONFIGURACAO_JSON`). A coluna continua a aceitar `NULL`, e
sem cozinha o calendário diz «indisponível» em vez de inventar. A cozinha de
exemplo do modo de teste só tapa esse `NULL` na loja, e nunca é gravada.

**A ordem das categorias vive no `ordem_ementa`**, e não numa tabela à parte
(#87). A gerente só muda a ordem, nunca o conjunto: o
`guardarOrdemCategorias` aceita uma permutação das categorias gravadas, e é a
própria instrução que o confere (as mesmas nos dois sentidos, com `@>`, e o
mesmo tamanho), sem ler primeiro e escrever depois. Mexe só nas `categorias`:
as `cartas` e as `subcategorias` ficam como vieram do impresso. O
`criarProduto` e o `editarProduto` recusam uma categoria que não esteja na
ordem — ficava órfã, fora da `/ementa`.

## Os pedidos

### `pedidos`

| Coluna | Tipo | Do contrato |
|---|---|---|
| `id` | `uuid` chave primária | `id` (o `json.ts` já gera um UUID) |
| `referencia` | `text` único | `DAM-DDMM-XXXX` |
| `estado` | `text` `CHECK` dos 5 estados | `estado` |
| `criado_em`, `levantamento_em` | `timestamptz` | iguais |
| `pago_em`, `impresso_em`, `entregue_em`, `cancelado_em`, `reagendado_em` | `timestamptz` nulo | iguais |
| `cliente_nome`, `cliente_email`, `cliente_telefone` | `text` | `cliente` — o telefone é obrigatório, em E.164 (`CHECK ^\+[1-9][0-9]{6,14}$`), como no `EsquemaCliente` |
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
| `stripe_payment_intent_id` | `text` único, nulo | **só da base de dados** (#42): liga ao pedido o que se fez no painel do Stripe |
| `procura` | `text` | **só da base de dados** |
| `reembolso_reservado_cent` | `integer` `>= 0`, `CHECK (… <= pago_online_cent)` | **só da base de dados** (ver «Reembolsos ao mesmo tempo») |
| `de_teste` | `boolean`, **sem valor por defeito**, imutável | **só da base de dados** (ver «Os pedidos de teste») |

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

**O que tem de ser verdade em qualquer estado vive em `CHECK`**, e as transições
não (essas são os `UPDATE … WHERE estado = …`, abaixo). Ter `pago_em` é o mesmo
que estar `pago`, `entregue` ou `cancelado` — só se cancela um pedido pago, e
nada volta de pago para trás; um `entregue` tem `entregue_em`; um `cancelado`
tem quando e por quem, e só ele; o `chegou_tarde` só existe com pagamento; os
`avisos_tratados` são os quatro do contrato. ⚠️ **Fica de fora
`pago_online_cent <= total_cent`**: um montante que não bate ainda não tem regra
(`pagamentos.md` › Em aberto, 8), e um `CHECK` que recusasse um pagamento
recebido perdia um pedido pago.

### Os pedidos de teste

O site no ar corre em modo de teste até ao lançamento, contra a base de dados de
produção, e os pedidos que lá ficam têm de sair das contas no lançamento
(`pagamentos.md` › Ambientes). Por isso cada pedido diz **desde que nasce** se é
de teste — o `LOJA_EM_TESTE` desse momento.

- **Sem valor por defeito.** Um `default false` deixava passar em silêncio um
  `criarPedido` que se esquecesse de o dizer, e os pedidos de teste do mês antes
  do lançamento passavam por vendas. Assim, esquecê-lo é um erro.
- **Não muda depois de nascer**: um gatilho recusa-o (migração `0003`, escrita à
  mão — o `drizzle-kit` não gera gatilhos). Um `CHECK` só vê a linha nova, e o
  que importa aqui é a diferença entre a velha e a nova.
- **No lançamento** (#55), um comando desconta numa transação as vagas e as
  quantidades dos pedidos de teste, e arquiva-os: ficam guardados, e fora das
  vagas, das quantidades e das vendas. ⚠️ **Na mesma transação, tira os pendentes
  de teste do `pendente`.** Senão, a limpeza seguinte desconta-os outra vez, a
  vaga fica abaixo de zero e o `CHECK` recusa a limpeza a partir daí. Repor o ramo `production` a um ponto
  anterior não serve — apagava o que a gerente fez no catálogo e nos horários.

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
| `estado_stripe` | `text` nulo, `CHECK` dos 5 do Stripe | `estadoStripe`, quando a #49 o puser no contrato |
| `motivo` | `text` nulo | `motivo` — o `failure_reason` do Stripe, ou um motivo nosso |
| `falha_tratada_em` | `timestamptz` nulo, só num `falhado` | o aviso `reembolso-falhado` dado por tratado |

**O mapeamento do `pedidos.md` está na base de dados.** Um `CHECK` só aceita
`pending` e `requires_action` num `pendente`, `succeeded` num `concluido`, e
`failed` e `canceled` num `falhado`: um `succeeded` gravado como falhado é
recusado, venha de onde vier. O `estado_stripe` nulo é um reembolso a que o Stripe
ainda não respondeu, ou um que demos nós por falhado.

**A falha trata-se por reembolso, e não no `avisos_tratados` do pedido.** Para o
contrato, `reembolso-falhado` aparece nos `avisosTratados` quando houve falhas e
nenhuma ficou por tratar. Um
segundo reembolso falhado no mesmo pedido ficava escondido pelo primeiro, já
tratado. O aviso existe enquanto houver um `falhado` sem `falha_tratada_em`.

⚠️ **Um reembolso `pendente` sem `stripe_refund_id` é trabalho por fazer.**
Grava-se antes de se chamar o Stripe, no mesmo lote que soma ao
`reembolso_reservado_cent`, e repete-se com a mesma chave (o `id`). Não há outra
tabela de trabalho pendente para os reembolsos: seria guardar o mesmo facto em
dois sítios.

**Um reembolso feito no painel do Stripe** que não caiba ao lado de um pendente
nosso — proposta, em resposta à pergunta do #100, por fechar com o Gonçalo: o
nosso cede. Na mesma instrução que insere o do Stripe, os nossos
`pendente` **ainda sem `stripe_refund_id`** passam a `falhado` com o motivo
`cedeu-a-reembolso-externo`, e o reservado desconta-os. O Stripe não deixa
reembolsar mais do que falta, contando com os pendentes, por isso o nosso ia ser
recusado — a confirmar na sandbox, com o `…7726`. Se mesmo assim não couber, é
uma inconsistência a sério: 5xx com alerta, e nunca um 200 a escondê-la. Não muda
o esquema: é a instrução da #49.

### `emails_por_enviar`

Os emails — a confirmação ao cliente, o aviso à loja — gravam-se **na mesma
transação** que os origina (a passagem a `pago`, o cancelamento) e só depois se
enviam (`pagamentos.md` › Em aberto, 3). Se o envio falhar, ou o processo morrer
a meio, a linha fica, e repete-se quando a base de dados já está acordada por
outra razão; o que ficar parado aparece no painel.

| Coluna | Tipo |
|---|---|
| `id` | `uuid` chave primária — é a chave de idempotência que vai ao Resend |
| `pedido_id` | `uuid` → `pedidos` |
| `modelo` | `text` — qual é o email; os nomes são da #42 |
| `destinatario` | `text` |
| `criado_em`, `ultima_tentativa_em`, `enviado_em` | `timestamptz` (os dois últimos nulos) |
| `tentativas` | `integer` `>= 0` |
| `ultimo_erro` | `text` nulo — o que o Resend respondeu, para o painel |

**Não há chave única «natural»** (pedido, modelo, destinatário): o mesmo email
pode ter de sair duas vezes — um pedido reagendado duas vezes. O que impede o
duplicado é a transição só acontecer uma vez (`pedidos.md`).

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
  (`… AND entregue_em >= agora − 5 min`), com o `agora` do contexto.
- **Os efeitos vão na mesma instrução**, em passos do mesmo `WITH`
  (`bd-painel-pedidos.ts`): a vaga, o reembolso e a versão. Sem isso, um pedido que
  já não está no estado de partida descontava a vaga na mesma, e o driver HTTP da
  Neon não tem transações interativas para ler a meio.
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
(`limite = CASE WHEN limite IS NULL THEN NULL ELSE GREATEST(limite, ocupadas + n) END`):
a vaga fica acima do limite, e isso é verdade — a cozinha tem mesmo mais um. A
gerente vê o aviso `chegou-tarde` e decide. ⚠️ O `CASE` faz falta: o `GREATEST`
ignora os `NULL`, e `GREATEST(NULL, 3)` dá 3 — uma vaga sem limite ficava cheia,
e um reagendar para lá era recusado.

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

Um `pendente` com mais de 31 minutos passa a `expirado` e liberta a vaga. ⚠️ Nunca
antes: os 31 minutos são o prazo da sessão do Stripe, e até lá o cliente ainda
pode pagar (`pedidos.md`). Quem o faz, por ordem:

1. o regresso do cliente que voltou atrás no checkout, e o webhook
   `checkout.session.expired` (`pagamentos.md`, do Gonçalo);
2. **uma limpeza que corre antes de ler a ocupação e dentro do `criarPedido`** —
   só quando há um cliente no site, ou seja, com a base de dados já acordada.

Não há tarefa agendada a acordar a base de dados para isto (regra 6). A limpeza
(`limparExpirados`, em `bd-pedidos.ts`) é uma instrução só: muda os pendentes antigos para `expirado` e desconta-os dos
contadores. A lógica completa é da #41. O pedido expirado pelo id, no ponto 1,
usa a mesma instrução (`expirarPedido`).

⚠️ **Se a limpeza falhar, o calendário e o `criarPedido` continuam.** O erro fica
no log, com a regra que falhou, e a vaga fica ocupada: é o lado seguro, porque
não se vende nada duas vezes e só se liberta mais tarde.

## Limites de pedidos

- **Criar pedido**: 5 pendentes por IP e 3 por email ao mesmo tempo. Conta-se
  na própria instrução que insere o pedido, com índices parciais
  (`WHERE estado = 'pendente'`) em `ip` e em `cliente_email`. O `INSERT … SELECT … WHERE`
  não insere nada fora dos limites, e a instrução seguinte do lote — as linhas —
  falha na chave estrangeira por não haver pedido: o lote cai inteiro, e essa
  falha é o `demasiados-pedidos`. Sem IP, só conta o email.
- **PIN e código da gerente**: tabela `limites`, chave `(chave, janela)`, com
  uma `contagem`. A janela é o início do intervalo (os 15 minutos do PIN), e a
  chave diz o quê e de onde (`pin:<dispositivo>`, `codigo:<email>`).

## A entrada no painel (#33)

As tabelas estão em `src/db/esquema.ts` e na migração `0001_sessoes.sql`, num
PR de esquema próprio.

| Tabela | O que guarda |
|---|---|
| `sessoes_painel` | `id` (chave), `token_hash` (único), `papel`, `lembrar`, `dispositivo`, `criada_em`, `ultimo_uso_em`, `expira_em` |
| `codigos_gerente` | `id` (chave), `email`, `codigo_hash`, `criado_em`, `expira_em`, `usado_em`, `tentativas` |
| `limites` | `(chave, janela)` (chave), `contagem` |

O PIN da equipa é o `casa.pin_equipa_hash`.

- **O cookie leva um token aleatório; a base de dados guarda o *hash* dele.**
  Quem lesse a base de dados não ficava com sessões abertas.
- **A sessão tem um `id` à parte do hash.** É o que o ecrã da gerente usa para
  mostrar e terminar uma sessão — o hash nunca vai ao browser.
- **O PIN e o código da gerente guardam-se com *hash* lento (`scrypt`).** São
  seis dígitos: com um hash rápido, quem tivesse esta tabela adivinhava-os em
  segundos. O token da sessão é aleatório e comprido, e chega-lhe um rápido.
- **Quem decide se uma sessão vale é o `expira_em`, e não o prazo do cookie.**
  O cookie dura muito; os 30 dias renovam-se aqui, a cada uso — e só se o
  último uso foi há mais de uma hora, para a base de dados não ser acordada a
  cada clique (regra 6).
- **Os limites contam por chave e janela**, somados com `ON CONFLICT` numa
  instrução só: o PIN conta por IP (`pin:<ip>`), porque antes de entrar não há
  nada que identifique o dispositivo, e um cookie apagava-se para fugir ao
  limite. As janelas são fixas: o bloqueio dura até ao fim da janela.
- ⚠️ **A tentativa conta-se antes de ser conferida.** «Ver se está bloqueado,
  tentar, contar o erro» deixava passar vinte tentativas mandadas ao mesmo
  tempo — todas viam o contador a zero. Somada primeiro, cada uma recebe o seu
  número, e só as cinco primeiras chegam a ser conferidas. Acertar apaga o
  contador: contam os erros seguidos. Há um teste que o prova, e que falha com
  a forma ingénua.
- **Mudar o PIN apaga as sessões de funcionário no mesmo lote** — é assim que se
  tira o acesso a quem saiu da casa (`painel.md`).

O que ainda falta para isto estar inteiro — no contrato, no ecrã e no ar — está
em `ligar-a-neon.md` › A entrada no painel.

## O Stripe

`eventos_stripe`: `id` (o id do evento, chave primária), `tipo`, `api_version`
(nulo — o Stripe não a dá em eventos antigos) e `recebido_em`. Um evento
repetido bate na chave primária e faz cair o lote inteiro, e **só essa violação**
quer dizer «repetido» (`pagamentos.md`). A versão da API guarda-se porque um
evento nunca muda depois de criado: uma retentativa que chega depois de uma
subida da API vem na forma antiga. Mais
as colunas `pedidos.stripe_session_id`, `pedidos.stripe_payment_intent_id` e
`reembolsos.stripe_refund_id`, únicas. Estão no esquema para o Gonçalo não
precisar de uma migração para começar a #42.

⚠️ **O `stripe_payment_intent_id` grava-o o `marcarPago`**, com o que a sessão
traz. Um reembolso ou uma disputa feitos no painel do Stripe trazem o
`payment_intent` e não o nosso id, e é por esta coluna que se encontra o pedido,
sem uma consulta ao Stripe a cada evento (migração `0004`).

## Índices

Os de `robustez.md` › Consultas, e mais nenhum:

- `pedidos(referencia)`, `pedidos(chave_idempotencia)`,
  `pedidos(stripe_session_id)` e `pedidos(stripe_payment_intent_id)`, únicos
- `pedidos(estado, levantamento_em)` — as listas do balcão
- `pedidos(criado_em, id)` — o arquivo e os pedidos da gerente, por cursor
- `pedidos(cliente_email)` — o histórico e os possíveis duplicados
- `pedidos(ip)` e `pedidos(cliente_email)` parciais, só `pendente` — os limites
- `linhas_pedido(pedido_id)` — é o princípio da chave primária, não precisa de outro
- `reembolsos(pedido_id)` — a soma do `reembolsadoCent` e a lista do painel
- `emails_por_enviar(criado_em)` parcial, só os por enviar
- as chaves primárias dos contadores, das sessões e dos limites

## A migração do catálogo (#28)

O `json.ts` já converte os JSON no `Produto` do contrato (`CATALOGO_JSON`) —
euros em cêntimos, com o erro a rebentar em vez de arredondar em silêncio. **A
migração insere exatamente isso**, e a verificação é ler tudo da base de dados e
comparar com o `CATALOGO_JSON`, campo a campo, sem diferenças. Os ids ficam os de
hoje: vão no URL.

O horário da loja sai do `casa.json` para `casa.horario_loja`; a cozinha fica
`NULL`. As fotos de `public/` ficam onde estão: nenhuma é de
um produto, por isso não há nada a migrar para o Blob.

## O modo de teste e a base de dados

⚠️ **Os dados de exemplo nunca entram na base de dados.** Com a `DATABASE_URL`,
a fonte é sempre a base de dados, e o `LOJA_EM_TESTE=1` põe-lhe por cima a
camada `comExemplo` (`exemplo.ts`): tapa os tempos, a cozinha e o limite que
faltam, e junta os pedidos de exemplo à ocupação — **só nas leituras da loja**.
Um pedido de exemplo gravado não se distinguia de um verdadeiro, e ia parar a um
relatório de vendas.

⚠️ **O painel lê sempre o que está gravado** — `produtosDoPainel` e
`configuracaoDoPainel`, que a camada não tapa. Era a armadilha: a gerente via a
cozinha de exemplo em «Horários», gravava outra coisa qualquer, e a cozinha
inventada ficava na base de dados como sendo a da casa. Há um teste que o prova,
e que falha se a camada deixar passar o exemplo para o painel.

Os pedidos de exemplo do painel e o «Simular pedido novo» ficam na fonte dos
JSON. Com a base de dados, o balcão mostra os pedidos que lá estão, e abre vazio
se não houver nenhum.

⚠️ **O `criarPedido` confere o pedido pela vista, e grava-o na base de dados.**
No modo de teste, os produtos não têm tempos de produção gravados (a casa ainda
não os deu) e é a camada que os tapa. Um `criarPedido` que lesse a base de dados
crua dava sempre «indisponível» enquanto o calendário mostrava vagas. Por isso
lê os produtos, a casa e as vagas por uma **leitura** que o `fonteDoAmbiente` lhe
dá: a vista com os exemplos (`bd-pedidos.ts` › `LeituraDoPedido`). A camada
continua a não gravar nada; o pedido grava-se como sempre, com `de_teste` a
`true` («Os pedidos de teste», acima).

## Os testes

**O `npm test` dá duas voltas** (`vitest.config.mts`). A primeira, `json`, é a
de sempre: tudo, contra a fonte dos JSON. A segunda, `bd`, corre os testes do
contrato (`dados.test.ts`, `painel.test.ts`, `ordem.test.ts`) contra a fonte da
base de dados, numa cópia limpa do catálogo importado para um PGlite
(`src/lib/dados/fontes-de-teste.ts`). É a prova de que a troca no `index.ts`
não muda nada para as páginas.

Os testes que precisam do que a base de dados ainda não tem — os tempos de
produção, que a casa ainda não deu — **saltam a volta `bd`, marcados**, com o
motivo escrito ao lado. O `pedidos-painel.test.ts` é a especificação do painel
dos pedidos, e corre nas duas voltas.

**O que só a base de dados garante no painel** prova-se em
`src/lib/dados/pedidos-painel-bd.test.ts`: dois tablets a entregar, dois reembolsos
que juntos passam o pago, a última vaga ao reagendar com a leitura desatualizada,
os contadores depois de cada mudança e o cursor sem saltos.

**Os pedidos da loja provam-se em `src/lib/dados/pedidos-bd.test.ts`**, com o
cenário dos testes do `criarPedido` dos JSON (o mesmo dia, o mesmo kit, o mesmo
total) e o que só a base de dados garante: a última vaga recusada **mesmo com uma
leitura desatualizada**, os limites por IP e por email, a limpeza que não expira
aos 30 min 59 s e expira aos 31 min 1 s, e o `de_teste` conforme o modo.

As regras das tabelas dos pedidos provam-se em `src/db/esquema-pedidos.test.ts`:
cada `CHECK`, as chaves únicas e estrangeiras, o gatilho do `de_teste` e a
reserva da última vaga com `ON CONFLICT`. As transições provam-se com a fonte.

Além disso, `bd.test.ts` e `bd-escritas.test.ts` põem as duas fontes a
responder às mesmas perguntas, lado a lado.

⚠️ **O PGlite tem uma ligação só**: não reproduz dois clientes ao mesmo tempo. O
teste da última vaga prova que o `CHECK` recusa a segunda reserva, não a corrida
em si. A corrida verdadeira testa-se no ramo de desenvolvimento da Neon, depois
da visita.

## Em aberto

1. ~~De que dia é o limite «por dia»~~ — **o dia de levantamento**, decidido a
   05/10. É o `dia` de `quantidades_dia`.
2. **Os avisos `disputa` e `apanhado-pela-verificacao`** estão no contrato, mas
   o pedido ainda não tem onde os guardar. Entram numa migração própria, depois
   de o `pedidos.md` os ter (#42, #43). *(Gonçalo)*
3. ~~Pago depois de expirar sobe o limite da vaga~~ — decidido a 05/10: volta a
   ocupar mesmo acima do limite (o `GREATEST`, acima).
4. **PIN de 4 ou 6 dígitos** — pergunta à Damira (#25). Não muda o esquema.
5. ~~O telefone obrigatório aqui e opcional no contrato~~ — alinhado a 05/10
   (#74): obrigatório nos dois, em E.164.
6. **O `estadoStripe` e o `motivo` do reembolso** já têm colunas, e o contrato
   ainda não os tem (`EsquemaReembolso`). Entram no contrato com a #49.
   *(Gonçalo)*
7. **As quantidades por produto ainda não se reservam.** As tabelas
   (`quantidades_dia`, `quantidades_total`) existem, mas o `criarPedido` só
   reserva a vaga: nenhum produto tem limite hoje, e o contrato não tem erro
   para «este artigo esgotou» (`ErroCriarPedido`). Quando a gerente puser o
   primeiro limite, falta esse erro e a soma no mesmo lote. *(Gonçalo)*

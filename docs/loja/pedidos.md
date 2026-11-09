# Pedidos — o contrato

Este ficheiro é o **dono do pedido**. Os pagamentos, o balcão, a gerente e a
impressão leem daqui e remetem para aqui; nenhum deles redefine estados, campos
ou regras. Se alguma coisa daqui tiver de mudar, muda **aqui primeiro, num PR
só para isso** — um estado novo que aparece no painel antes de aparecer aqui é
um estado que os pagamentos não sabem que existe.

## Paga-se na loja — e o pagamento online fica a dormir

⚠️ **Decidido pela casa a 04/11/2026: para já, o pagamento é só na loja**, ao
levantar (ou na entrega). O espaço ainda não está preparado para dar a quem paga
adiantado as condições de espera que lhe são devidas, e a casa não quer arriscar
clientes insatisfeitos. Por isso:

- **Não há Stripe**, nem para o cliente nem nos testes. O pedido grava-se logo,
  sem esperar por pagamento nenhum, e nunca expira.
- **Há duas portas de entrada**: os produtos de **confirmação imediata** entram
  confirmados; os **sob orçamento** e as **entregas ao domicílio** entram à
  espera de que a casa os confirme (ver «Confirmar»).
- ⚠️ **O pagamento online não se apaga — adormece.** A casa disse «para já». Os
  estados `pendente`, `pago` e `expirado`, as colunas do Stripe, os reembolsos e
  o sinal continuam no esquema e no contrato, e nenhum pedido lá entra enquanto
  o pagamento online estiver desligado. O que está escrito sobre eles nas
  secções marcadas **(pagamento online)** continua a ser o desenho para o dia em
  que voltar, e não descreve o que acontece hoje.

## Porquê «pedido» e não «encomenda»

`encomendas` já tem dono neste código: é o catálogo dos kits, das boxes e dos
bolos (`encomendas.json`, página `/encomendas`). O **pedido** também já existia
— é o que `pedidos.ts` valida e manda por email, com referência. A loja não cria
um conceito novo: dá ao pedido que já havia um sítio onde ficar guardado.

## A referência

`DAM-DDMM-XXXX`, gerada **no servidor**, como já acontece em `pedidos.ts`. Nasce
quando o pedido é criado, vai no email, no talão e no painel. Única na base de
dados.

## Os estados

| Estado | O que quer dizer | Quem o escreve | No painel | Imprime |
|---|---|---|---|---|
| `por-confirmar` | entrou, e precisa do «sim» da casa: tem um produto sob orçamento, ou é para entregar | servidor, ao criar | sim, em «Por confirmar» | não |
| `confirmado` | a casa vai fazê-lo; paga-se na loja ao levantar, ou na entrega | servidor, ao criar (só confirmação imediata); ou a gerente, ao confirmar | sim | sim, uma vez |
| `entregue` | o cliente levantou e pagou, ou foi entregue | balcão, com um toque | sim, no arquivo | não |
| `cancelado` | a casa recusou ou cancelou, ou o cliente desistiu | ver «Cancelar» | sim, riscado | talão de cancelamento, se o pedido já tinha talão |

Transições permitidas — **e mais nenhuma**:

- ao criar: `confirmado` se **todas** as linhas forem de confirmação imediata e
  o pedido for para levantar na loja; senão, `por-confirmar`
- `por-confirmar → confirmado` — a gerente (ver «Confirmar»)
- `por-confirmar → cancelado` — a gerente recusa; ou o cliente desiste
- `confirmado → entregue`
- `entregue → confirmado` — pelo balcão nos primeiros 5 minutos (desfazer um
  toque por engano); pela gerente a qualquer momento
- `confirmado → cancelado` — pela gerente, a qualquer momento; **ou pelo
  cliente**, com sessão iniciada, se a gerente tiver ligado «Aceitar
  cancelamentos pelo site», e só até à hora em que a produção tem de começar
  (ver `horarios.md`). Depois disso o botão desaparece e o cliente liga para a
  loja.

⚠️ **`entregue` quer dizer «levantou e pagou».** Sem pagamento online, o
dinheiro entra no mesmo toque em que o pedido sai do balcão. Não há um estado
«pago na loja» à parte: seria um segundo toque que ninguém dá numa fila de
sábado — a mesma razão que tirou o «aceite» e o «pronta» (abaixo).

⚠️ **Um pedido nunca expira enquanto se paga na loja.** Sem pagamento, não há um
prazo de que dependa: expirar um `por-confirmar` que a casa ainda não viu era
perder um pedido por falta de tempo nosso. Quem não está confirmado aparece em
«Precisa de atenção» até alguém decidir (ver «Confirmar»).

⚠️ **A transição dispara os efeitos, e só ela.** A passagem a `confirmado` é uma
atualização condicional (só acontece se o estado ainda for `por-confirmar`), e o
talão, o som e o email ao cliente saem **dessa transição**. Dois toques em
«Confirmar», em dois aparelhos, dão um talão e um email.

### (pagamento online) Os estados que dormem

Com o pagamento online desligado, nenhum pedido nasce `pendente`, e por isso
nenhum chega a `pago` nem a `expirado`. Ficam no contrato, com o desenho de
quando havia Stripe, para não se perderem:

| Estado | O que quer dizer |
|---|---|
| `pendente` | checkout aberto, à espera de pagamento; expira em `criadoEm + 31 min`, o prazo da sessão do Stripe |
| `pago` | o Stripe confirmou o pagamento — **só ele o escreve**, pelo webhook ou pela verificação periódica (`pagamentos.md`) |
| `expirado` | o prazo passou sem pagamento, ou o cliente voltou atrás no checkout |

As regras desse desenho, que voltam com ele: o browser nunca marca um pedido
como pago; **pago ganha sempre a expirado** (fica `chegouTarde`, e um pedido
pago nunca se perde); e o pedido só expira quando o Stripe já não aceita o
pagamento. O porquê de cada uma está no histórico deste ficheiro e no
`pagamentos.md`.

## Confirmar

**O que pede confirmação é o produto, e a gerente decide qual.** Cada produto
tem um interruptor, **«Pede confirmação da casa»** (`pedeConfirmacao`, na ficha
do produto). Desligado, é de confirmação imediata: entra no pedido com o preço
dele, e o pedido pode nascer `confirmado`. Ligado, é **sob orçamento**: o pedido
nasce `por-confirmar`, e é a casa que diz se o faz e por quanto.

⚠️ **Um produto sem preço pede sempre confirmação.** O bolo por medida não tem
preço (`preco: null` é *sob orçamento*, nunca zero); não há maneira de o
confirmar sem alguém dizer quanto custa. Ao criar a coluna, o valor por defeito
é **ligado nos que não têm preço e desligado nos outros**, e a gerente muda as
exceções — não os 107 um a um.

**Quem confirma é a gerente**, porque confirmar fixa dinheiro: o valor das
linhas sob orçamento e o custo da entrega. Na confirmação ela escreve:

- **o valor de cada linha sem preço** (as que têm preço ficam com o preço do
  momento do pedido, como sempre);
- **o custo da entrega**, se houver (ver «Entrega ao domicílio»);
- **a hora**, se tiver combinado outra com o cliente (com as regras de «Mudar o
  levantamento»).

O pedido guarda `confirmadoEm` e passa a `confirmado` com tudo isso **numa
instrução só**. O cliente recebe um email com o valor final e a hora.

⚠️ **Um `por-confirmar` ocupa a vaga e as quantidades**, como um pedido
confirmado. Se não ocupasse, dois orçamentos para a mesma hora entravam os dois,
e a casa só dava pelo conflito ao confirmar o segundo — com o cliente já à
espera de um sim. Liberta-as ao ser cancelado ou recusado.

⚠️ **Por confirmar não é esquecido.** Um `por-confirmar` aparece em «Precisa de
atenção» desde que entra, e **com urgência** quando falta pouco para a hora em
que a produção teria de começar (ver `horarios.md`). Não se cancela sozinho:
quem decide é sempre uma pessoa.

**O balcão ouve-o chegar**: um `por-confirmar` toca o som e mostra o aviso, como
um pedido novo, mas **não imprime** — o talão é a ordem para a cozinha, e um
pedido que a casa ainda não aceitou não pode ser essa ordem. O talão sai quando
é confirmado.

## Entrega ao domicílio

A casa pediu-a a 04/11. **Uma entrega pede sempre confirmação**, seja qual for o
produto: é a casa que sabe se chega lá, a que horas, e por quanto.

O pedido guarda, quando é para entregar:

| Campo | O que é |
|---|---|
| `entrega` | `null` é levantar na loja. Se não, a morada: rua e número, código postal, localidade, e notas («3.º esq., tocar duas vezes») |
| `entregaCent` | o custo da entrega, fixado pela gerente ao confirmar. `null` até lá |

A hora do pedido (`levantamentoEm`) é, numa entrega, a hora combinada para
entregar. As regras da zona, do custo e do horário estão em «Em aberto»: até a
casa as dar, a página só aceita a morada e diz que a casa confirma.

## Não há «aceite» nem «pronta», e é de propósito

Decisão da reunião de 23/09/2026: a equipa não usa colunas de estado. O pedido
entra, o som toca uma vez, aparece um aviso no canto do painel e o talão sai. O
único toque que a equipa dá é **entregue**. Não voltar a acrescentar estados
intermédios sem a casa os pedir — foi exactamente isso que ela recusou.

O `por-confirmar` não desfaz esta regra: não é um passo da cozinha, é a casa a
decidir se aceita um orçamento ou uma entrega, coisa que ela própria pediu.
Um pedido de confirmação imediata continua a ter um toque só.

Os relatórios de vendas ainda não existem, mas os dados guardam-se desde o
primeiro pedido: `criadoEm`, `confirmadoEm`, `impressoEm`, `entregueEm`. O tempo
de serviço mede-se de `confirmadoEm` a `entregueEm`.

## Dinheiro

Tudo em **cêntimos, inteiros**. Nunca `number` decimal num valor a cobrar.

| Campo | O que é |
|---|---|
| `totalCent` | o valor dos produtos, calculado no servidor. Num `por-confirmar` com linhas sem preço, é só a parte conhecida, e fica completo na confirmação |
| `entregaCent` | o custo da entrega, ou `null` (ver acima) |
| `modoPagamento` | `na-loja`, enquanto o pagamento online dormir. (`total` e `sinal` são do pagamento online — `pagamentos.md`) |
| `pagoOnlineCent` | o que o Stripe cobrou. Com pagamento na loja, é sempre 0 |
| `reembolsadoCent` | soma dos reembolsos **concluídos**. Com pagamento na loja, é sempre 0 |

O que se paga na loja é `totalCent + entregaCent − pagoOnlineCent`, e **calcula-se,
não se guarda** — um campo derivado guardado é um campo que um dia não bate
certo. O talão diz `A PAGAR NA LOJA · 23,50 €`.

⚠️ **O browser manda ids e quantidades, nunca preços.** O total recalcula-se no
servidor a partir da base de dados, sempre, mesmo que o cesto já mostre um.

⚠️ **Sem pagamento adiantado, quem não aparece não paga nada.** É o risco que a
casa aceitou ao escolher pagar na loja. O que o segura: o telefone é
obrigatório, os limites de criar pedidos (`robustez.md` › Limites) contam os
`por-confirmar` e os `confirmado` por levantar, e a gerente vê quem não
levantou. Se a casa quiser mais — um sinal por transferência, por exemplo —, é
uma decisão dela (ver «Em aberto»).

## O que o pedido guarda: uma fotografia do momento

Cada linha do pedido guarda o id do produto e da variante **e também** o nome, a
variante e as escolhas em texto, a unidade e o preço unitário **tal como estavam
no momento do pedido**, mais a quantidade e as notas do cliente. Uma linha sob
orçamento guarda o preço `null` até a gerente o fixar ao confirmar, e a partir
daí guarda esse.

**As escolhas** (sabores, recheios) confirmam-se no servidor: um produto com
escolhas leva **exatamente uma** por linha, e das dele; um sem escolhas, nenhuma
(`escolha-invalida`). Para misturar sabores, uma linha por sabor, e cada uma
conta o seu mínimo — 12 de alheira e 12 de legumes (decidido a 05/10).

⚠️ **Nunca se recalcula um pedido antigo a partir do produto atual.** A gerente
muda preços e nomes quando quer; um pedido de ontem tem de continuar a dizer o
que se combinou ontem — no painel e no talão reimpresso.

## O cliente

Nome, email, telefone, NIF (opcional) e o id da conta (opcional).

**O telefone é obrigatório** — é por ele que o balcão liga a quem não aparece, e
por onde a gerente combina um orçamento. A página escolhe o país (🇵🇹 +351 por
defeito), valida o número para esse país e guarda-o em **E.164**
(`+351911222333`); mostra-se arrumado como o país manda (`+351 911 222 333`).
Decidido a 05/10.

⚠️ **A conta nunca é obrigatória para pedir.** É a primeira regra do `AGENTS.md`
para a conta de cliente. (Cancelar pelo site é que exige conta — ver abaixo.)

O email é obrigatório: é para lá que vai a confirmação com a referência.

## Os emails

| Quando | A quem | O que diz |
|---|---|---|
| ao criar, `confirmado` | cliente | está confirmado, a hora, e quanto se paga na loja |
| ao criar, `por-confirmar` | cliente | recebemos; a casa vai confirmar o valor e a hora |
| ao criar, qualquer um | loja | o pedido novo, com tudo |
| ao confirmar | cliente | o valor final e a hora |
| ao cancelar ou recusar | cliente | que não vai ser feito |

Os emails gravam-se na mesma instrução que muda o estado, e só depois se enviam
(`base-de-dados.md` › Os emails por enviar): um email nunca sai de uma mudança
que não ficou gravada.

## O levantamento

`levantamentoEm`: o dia e a hora escolhidos no calendário. Guarda-se em UTC,
mostra-se em hora de Lisboa, e **valida-se no servidor** contra as regras de
`horarios.md` no momento em que o pedido é criado — o calendário no browser é
uma ajuda, não uma garantia.

Um pedido `por-confirmar` ou `confirmado` **ocupa** a vaga e as quantidades; se
for cancelado, liberta-as, na mesma transação que muda o estado (ver
`robustez.md`).

⚠️ **Um pedido `entregue` continua a ocupar a vaga** (decidido a 05/10): gastou a
capacidade daquela hora, e o «desfazer» — que o devolve a `confirmado` — nunca
pode esbarrar no limite. Só `cancelado` liberta (e, no pagamento online,
`expirado`).

«Levantam hoje», no balcão, é o dia de levantamento em hora de Lisboa — **não** o
dia em que o pedido entrou. O que tem de **começar a ser feito** hoje é outra
lista (ver `painel-balcao.md`). Os `por-confirmar` não entram nas listas da
cozinha: não se começa um bolo que a casa ainda não aceitou.

## Cancelar

Uma opção da gerente, **desligada por defeito**:

- **Aceitar cancelamentos pelo site** — o cliente, com sessão iniciada, vê o
  botão até à hora em que a produção tem de começar.

O código existe e é testado antes do lançamento; a casa decide se a liga.

O pedido guarda `canceladoPor` (`cliente` ou `gerente`) e `canceladoEm`. A
gerente cancela e recusa com a mesma ação (`cancelarPedido`): o estado muda e a
vaga e as quantidades libertam-se, juntos. Sem pagamento online não há nada a
devolver, por isso cancelar não pede reembolso.

⚠️ **Cancelar não é só mudar um estado.** Se o pedido já estava `confirmado`, o
talão já está na cozinha. Seja quem for a cancelar, o balcão é avisado como num
pedido novo — som, aviso «CANCELADO DAM-…» e talão de cancelamento (ver
`impressao.md`). Um cancelamento que só existe na base de dados é um bolo feito
para ninguém. Um `por-confirmar` cancelado nunca teve talão, e não imprime nada.

## Reembolsos (pagamento online)

Sem pagamento online não há dinheiro a devolver, e o painel não mostra o botão
de reembolsar. O desenho fica para quando voltar: o pedido guarda **cada
reembolso** (`reembolsos`) com o valor, o estado (`pendente`, `concluido`,
`falhado`), quando foi pedido, e o estado e o motivo como o Stripe os deu; o
`reembolsadoCent` é a soma dos `concluido`; um `falhado` aparece em «Precisa de
atenção». Os cinco estados do Stripe e as transições estão no `pagamentos.md` e
no histórico deste ficheiro.

## Mudar o levantamento

A gerente muda o dia ou a hora de um pedido `por-confirmar` ou `confirmado`
(`reagendarPedido`) — o cliente pediu, ou o dia fechou. **Só para uma hora em
que a loja esteja aberta e com vaga**, validada com o mesmo motor do calendário
(`horarios.md`); a vaga antiga liberta-se e a nova ocupa-se na mesma transação
(`robustez.md`). O pedido guarda `reagendadoEm`, e o histórico mostra-o.

## Avisos tratados

«Precisa de atenção» mostra factos — está por confirmar, parece duplicado, o
dia fechou —, e os factos não se apagam. O que a gerente decide guarda-se em
`avisosTratados` (`possivel-duplicado`, `dia-fechado`; e, no pagamento online,
`chegou-tarde` e `reembolso-falhado`), e um aviso tratado sai da lista. Num
duplicado, basta um dos dois estar tratado.

O `por-confirmar` não é um aviso que se dê por tratado: sai da lista quando o
pedido é confirmado ou cancelado, e só assim.

## O que nunca se guarda, e o que nunca se apaga

- **Dados de cartão: nunca.**
- **Pedidos: nunca se apagam.** Um cancelado ou recusado é um dado dos
  relatórios que vêm a seguir.

## Em aberto

Perguntas para a casa (vão para o Notion, em «Precisamos de vocês»):

1. **Entrega: até onde?** Uma lista de códigos postais ou de localidades, ou «a
   combinar» em cada pedido.
2. **Entrega: quanto custa?** Um valor fixo, um por zona, ou combinado em cada
   pedido. E se há um valor mínimo de encomenda para entregar.
3. **Entrega: quando?** Os dias e as horas em que a casa entrega, e quem
   entrega.
4. **Entrega: como se paga?** Em dinheiro, por MB WAY, ou na loja antes.
5. **Quem não aparece:** a casa quer alguma proteção além do telefone — um sinal
   por transferência nos pedidos grandes, por exemplo?
6. **Quem confirma:** só a gerente, como está acima, ou também o balcão?

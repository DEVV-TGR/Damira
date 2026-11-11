# Pedidos — o contrato

Este ficheiro é o **dono do pedido**. Os pagamentos, o balcão, a gerente e a
impressão leem daqui e remetem para aqui; nenhum deles redefine estados, campos
ou regras. Se alguma coisa daqui tiver de mudar, muda **aqui primeiro, num PR
só para isso** — um estado novo que aparece no painel antes de aparecer aqui é
um estado que os pagamentos não sabem que existe.

> ⚠️ **Contrato para a implementação seguinte, e não descrição do site**
> (11/11/2026). Desde 11/11 a produção tem a entrada verdadeira do painel ligada
> e grava na base de dados, mas **a compra continua a acabar num email à casa**
> e **nenhum pedido usa ainda os estados daqui** (`por-confirmar`,
> `a-aguardar-aceite`, `confirmado`, a expiração às 48 h): a base de dados
> ainda cria pedidos
> `pendente`, com o desenho do Stripe. Nada do que está abaixo «já funciona».
> Os pontos marcados «(em aberto: ver n.º X)» não estão decididos — estão no
> fim, com a proposta e quem decide. Este PR muda só o contrato; o alinhamento
> de `AGENTS.md`, `horarios.md` e restantes documentos segue no trabalho de
> documentação do #114, depois de aprovado este contrato.

## A política da casa manda

A 10/11/2026 a Andreia publicou a política de encomendas da Damira. **Onde este
ficheiro, o PR anterior ou um comentário antigo disserem outra coisa, ganha a
política** (decidido pelo Gonçalo a 11/11). As referências «§1» a «§7» abaixo
são as secções dela.

A política é texto para o cliente, e parte dela é conduta da casa ao telefone
(o que se avalia caso a caso, o que se guarda até ao fecho, que alternativa se
propõe). Nesses sítios este contrato diz só **o que o site tem de deixar a
equipa registar** — não decide pela casa.

⚠️ **Nada aqui limita os direitos legais do consumidor** (§7). As regras de
cancelamento são o que o site deixa registar e mostra à equipa, nunca um
bloqueio: faltar menos de 24 h não impede a equipa de cancelar sem custos.

## Paga-se na loja, ou por transferência — e o pagamento online fica a dormir

⚠️ **Registar um pedido no site não obriga a pagar nada** (§2), e o site não
cobra nada a ninguém:

- **Levantamento:** paga-se na loja, no momento do levantamento, **sem sinal nem
  pagamento antecipado** (§2). (Decidido pela casa a 04/11 e confirmado na
  política.)
- **Entrega ao domicílio:** paga-se **por transferência bancária**, depois de o
  cliente aceitar o orçamento da casa e no prazo que o orçamento indica (§3).
- **Não há Stripe**, nem para o cliente nem nos testes.

**Há duas portas de entrada** (§1): um pedido para levantar em que nenhum produto
precisa de confirmação entra `confirmado`; tudo o resto — um produto que
«Necessita de confirmação da loja», ou uma entrega — entra `por-confirmar`, à
espera da resposta da casa (ver «Confirmar»).

⚠️ **O pagamento online não se apaga — adormece.** A casa disse «para já». Os
estados `pendente` e `pago`, a causa de expiração do Stripe, as colunas do
Stripe, os reembolsos e o sinal continuam no esquema e no contrato, e nenhum
pedido lá entra enquanto o pagamento online estiver desligado. O que está
escrito sobre eles nas secções marcadas **(pagamento online)** continua a ser o
desenho para o dia em que voltar, e não descreve o que acontece hoje.

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
| `por-confirmar` | entrou e espera a resposta da casa: tem um produto que necessita de confirmação, ou é para entregar | servidor, ao criar | sim, em «Por confirmar», com o tempo que falta até `expiraEm` | não |
| `a-aguardar-aceite` | a casa respondeu com preço ou hora que o cliente ainda não viu, e espera que ele aceite | a gerente, ao responder | sim, como «à espera do cliente» | não |
| `confirmado` | a casa vai fazê-lo | servidor, ao criar (sem nada a confirmar); a equipa, ao confirmar um «sim» sem nada novo; o aceite do cliente | sim | sim, uma vez |
| `entregue` | o cliente levantou e pagou na loja; ou a entrega foi feita | balcão, com um toque | sim, no arquivo | não |
| `expirado` | a casa não respondeu até `expiraEm`; ou, se aprovado o n.º 2, o cliente não aceitou a resposta a tempo | servidor (ver «Expirar às 48 horas» e «O aceite do cliente») | sim, à parte dos cancelados | não |
| `cancelado` | a casa recusou ou cancelou, ou o cliente desistiu ou cancelou por contacto | a gerente (ver «Desistir, cancelar e alterar») | sim, riscado | talão de cancelamento, se o pedido já tinha talão |

Transições permitidas — **e mais nenhuma**, salvo a proposta explicitamente
marcada como ainda não ativa:

- **ao criar:** `confirmado` se for para levantar na loja e **nenhuma** linha
  necessitar de confirmação; senão, `por-confirmar`, com `expiraEm`
- `por-confirmar → confirmado` — a resposta da casa é um «sim» **sem preço nem
  hora que o cliente ainda não viu**: um levantamento em que todas as linhas
  têm preço e a hora fica a que ele escolheu. Pode dá-lo o balcão (ver
  «Confirmar»)
- `por-confirmar → a-aguardar-aceite` — a resposta da casa traz preço ou hora
  novos: o orçamento de uma entrega, o valor de uma linha sem preço, ou uma
  hora mudada. Dá-a a gerente (ver «O aceite do cliente»)
- `a-aguardar-aceite → confirmado` — o cliente aceita; grava `aceiteEm`
- `por-confirmar → expirado` — o servidor, a partir de `expiraEm`
- **Proposta, ainda não ativa:** `a-aguardar-aceite → expirado`, com causa
  `sem-aceite-do-cliente`. A transição e o prazo dependem da decisão do n.º 2.
- `por-confirmar → cancelado` e `a-aguardar-aceite → cancelado` — a casa recusa
  ou retira a resposta; ou o cliente desiste, por contacto, registado pela
  gerente
- `confirmado → entregue`
- `entregue → confirmado` — pelo balcão nos primeiros 5 minutos (desfazer um
  toque por engano); pela gerente a qualquer momento
- `confirmado → cancelado` — a pedido do cliente, por contacto, ou por iniciativa
  da casa; regista-o a gerente

⚠️ **`expirado` e `cancelado` não se confundem** (pedido da Andreia). Um pedido
que expirou ficou sem resposta **da casa**, ou, se aprovado o n.º 2, sem aceite do
cliente depois da resposta; um cancelado pelo cliente foi decisão **dele**. São causas
diferentes, e o painel mostra-as separadas. O pedido guarda a causa da
expiração (`causaExpiracao`): `sem-resposta-da-casa`; a causa
`sem-aceite-do-cliente` é proposta do n.º 2;
`sem-pagamento` é a do pagamento online, e dorme.

⚠️ **`entregue` quer dizer «levantou e pagou»** num levantamento. Sem pagamento
online, o dinheiro entra no mesmo toque em que o pedido sai do balcão. Não há um
estado «pago na loja» à parte: seria um segundo toque que ninguém dá numa fila
de sábado — a mesma razão que tirou o «aceite» e o «pronta» (abaixo). Numa
entrega, `entregue` é só «entregue»: a transferência é outra coisa (em aberto:
ver n.º 3).

⚠️ **A criação ou a transição efetiva dispara os efeitos, uma vez só.**
Quando já nasce `confirmado`, os efeitos saem da criação. Nas confirmações
posteriores, a passagem a `confirmado` é uma
atualização condicional (só acontece se o estado ainda for o de partida —
`por-confirmar` ou `a-aguardar-aceite`), e o talão, o som e o email ao cliente
saem **dessa transição**. Dois toques em «Confirmar», em dois aparelhos, ou dois
cliques em «Aceitar», dão um talão e um email. O mesmo vale para responder,
expirar e cancelar. Desfazer `entregue` não volta a emitir os efeitos da
primeira confirmação.

### (pagamento online) Os estados que dormem

Com o pagamento online desligado, nenhum pedido nasce `pendente`, e por isso
nenhum chega a `pago` nem expira por falta de pagamento. Ficam no contrato, com
o desenho de quando havia Stripe, para não se perderem:

| Estado | O que quer dizer |
|---|---|
| `pendente` | checkout aberto, à espera de pagamento; expira em `criadoEm + 31 min`, o prazo da sessão do Stripe |
| `pago` | o Stripe confirmou o pagamento — **só ele o escreve**, pelo webhook ou pela verificação periódica (`pagamentos.md`) |
| `expirado`, com `causaExpiracao = sem-pagamento` | o prazo passou sem pagamento, ou o cliente voltou atrás no checkout |

As regras desse desenho, que voltam com ele: o browser nunca marca um pedido
como pago; **pago ganha sempre a expirado** (fica `chegouTarde`, e um pedido
pago nunca se perde); e o pedido só expira quando o Stripe já não aceita o
pagamento. O porquê de cada uma está no histórico deste ficheiro e no
`pagamentos.md`.

## Confirmar

**O que necessita de confirmação é o produto, e a gerente decide qual.** Todos
os produtos têm a caixa **«Necessita de confirmação da loja»**
(`pedeConfirmacao`, na ficha do produto), e **só a gerente a muda**. Desligada,
o produto entra no pedido com o preço dele, e o pedido pode nascer `confirmado`.
Ligada, o pedido nasce `por-confirmar`, e é a casa que diz se o faz (e, se não
tiver preço, por quanto). Decidido a 11/11.

**No catálogo existente, a caixa começa ligada só nos produtos sem nenhuma
variante com preço**, e desligada nos outros; a gerente muda as exceções — não
os 107 um a um. Decidido a 11/11. O valor inicial nos produtos novos está
em aberto (n.º 10).

⚠️ **Um produto sem preço pede sempre confirmação.** O bolo por medida não tem
preço (`preco: null` é *sob orçamento*, nunca zero); não há maneira de o
confirmar sem alguém dizer quanto custa. O servidor trata uma linha sem preço
como «necessita de confirmação», diga a caixa o que disser.

⚠️ **Basta um produto para o pedido inteiro esperar** (§1). Um cesto com um
bolo que necessita de confirmação e doze pastéis que não necessitam é **um
pedido só**, todo `por-confirmar`, e confirma-se de uma vez. O mesmo para uma
entrega: é o pedido inteiro que espera, seja qual for o produto. Não se parte o
cesto em dois pedidos.

**Quem confirma.** O papel verifica-se **no servidor**, em cada confirmação
(`painel.md` › Esconder um botão não é proteger):

- **o balcão** confirma um pedido **tal como está** — o preço não muda, e a hora
  também não. É o «sim» que não precisa do aceite do cliente;
- **a gerente** responde a tudo, e é a única que **fixa os valores ainda desconhecidos**: o
  valor de uma linha sem preço, o custo de uma entrega. Mudar a hora segue
  «Mudar o levantamento», que é dela.

Na confirmação, a gerente escreve, quando há:

- **o valor de cada linha sem preço** (as que têm preço ficam com o preço do
  momento do pedido, como sempre);
- **a hora**, se tiver combinado outra com o cliente (com as regras de «Mudar o
  levantamento»).

**Se a resposta não traz nada de novo** — um levantamento com todas as linhas
com preço, na hora que o cliente escolheu —, o pedido guarda `confirmadoEm` e
passa a `confirmado` **numa instrução só**, e o cliente recebe o email de
confirmação (ver «Os emails»). **Se a gerente fixa o valor de uma linha sem
preço ou muda a hora**, o pedido passa a `a-aguardar-aceite`, com o que ela
fixou, e só fica confirmado quando o cliente aceitar (ver «O aceite do
cliente»). Decidido pelo Gonçalo a 11/11. Uma entrega nunca fica confirmada
pela casa sozinha: o orçamento traz sempre preço novo.

⚠️ **Responder depois de `expiraEm` é recusado** — confirmar ou passar a
`a-aguardar-aceite` —, mesmo que a limpeza ainda não tenha gravado o
`expirado`: a condição da transição inclui `agora < expiraEm`, com o `agora` do
servidor. Responder e expirar ao mesmo tempo dão um resultado só.

⚠️ **Um `por-confirmar` ocupa a vaga e as quantidades**, como um pedido
confirmado — e um `a-aguardar-aceite` também. Se não ocupasse, dois pedidos à espera para a mesma hora entravam os
dois, e a casa só dava pelo conflito ao confirmar o segundo — com o cliente já à
espera de um sim. Liberta-as ao ser cancelado ou ao expirar.

**O som é uma vez por acontecimento:** entrada e confirmação posterior são
avisos diferentes, cada um sem duplicação. **O balcão ouve-o chegar**: um `por-confirmar` toca o som e mostra o aviso, como
um pedido novo, mas **não imprime** — o talão é a ordem para a cozinha, e um
pedido que a casa ainda não aceitou não pode ser essa ordem. O talão sai quando
é confirmado.

**Por confirmar não é esquecido.** Um `por-confirmar` aparece em «Precisa de
atenção» desde que entra, com o tempo que falta até `expiraEm`, e **com
urgência** quando falta pouco para a hora em que a produção teria de começar
(ver `horarios.md`).

## Expirar às 48 horas

A política (§1): a casa responde habitualmente **nas primeiras 24 horas** depois
do registo; **sem resposta em 48 horas, o pedido expira**; os dois prazos contam
em **horas corridas**. Decidido a 11/11 como se faz:

- **O pedido guarda `expiraEm`** ao nascer `por-confirmar`: `criadoEm + 48 h`.
  (Se há um teto mais cedo para pedidos com levantamento próximo: em aberto: ver
  n.º 1.) Um pedido que nasce `confirmado` não tem `expiraEm`.
- **Um `por-confirmar` com `agora >= expiraEm` está expirado.** Quem o lê
  trata-o como tal, mesmo antes de a mudança estar gravada.
- **A vaga liberta-se na primeira leitura depois do prazo** — o padrão do
  `limparExpirados` (`base-de-dados.md` › Expirar sem tarefa agendada): uma
  limpeza antes de ler a ocupação e dentro do `criarPedido`, numa instrução só
  que muda o estado, desconta os contadores e grava o email ao cliente.
- **Há lembretes à casa e aviso de expiração ao cliente sem depender de uma
  visita ao site.** Cada lembrete sai uma vez por pedido; o email de expiração
  sai uma vez por transição, mesmo que a limpeza encontre o mesmo pedido.
  A cadência e o mecanismo são propostas a rever (n.º 11).

⚠️ **As 48 h e os lembretes só se aplicam à espera da resposta da casa.** Um
`a-aguardar-aceite` já teve resposta. Estes avisos não cobram pagamentos, nem
cancelam automaticamente entregas por falta de transferência.

⚠️ **Horas corridas contam-se em instantes, não em hora de parede.** É o
contrário do `horarios.md`, de propósito: lá a cozinha abre às 6h00 de Lisboa,
seja verão ou inverno; aqui são 48 horas que passam. Soma-se ao instante, e a
hora de Lisboa que o cliente lê pode mudar uma hora. Exemplo: um pedido de
24/10/2026 às 10h00 (Lisboa, verão) expira a **26/10 às 09h00** de Lisboa — a
hora mudou a 25/10. Os testes atravessam as duas mudanças (25/10/2026 e
28/03/2027) e provam o caso de exatamente 48 h.

A página do pedido e o email de «recebemos» dizem ao cliente que a casa costuma
responder em 24 horas e **até quando** o pedido espera (`expiraEm`, em hora de
Lisboa).

## O orçamento e o aceite (entrega)

A política (§3): se a entrega for possível, a casa envia um **orçamento** com o
custo da entrega, a data e a hora ou o intervalo horário proposto, o montante a
pagar, o IBAN e o prazo para pagar por transferência. **A encomenda fica
confirmada quando o cliente aceitar o orçamento.**

Decidido a 11/11:

- **O orçamento vai por email**, e o cliente **aceita por um link**. Não exige
  conta.
- **A aceitação fica registada** no pedido (`aceiteEm`).
- O orçamento fixa dinheiro, por isso **é da gerente**.
- Responder com um orçamento **é a resposta da casa**: as 48 h do §1 deixam de
  correr, e o pedido passa a `a-aguardar-aceite`. Quanto tempo o cliente tem
  para aceitar: (em aberto: ver n.º 2).

⚠️ **Abrir o link não aceita nada.** Os filtros de correio abrem os links dos
emails sozinhos. O link mostra o orçamento; aceitar é um botão na página. O acesso usa uma
credencial imprevisível própria do pedido e do orçamento, validada no servidor;
a referência pública do pedido não autoriza o aceite. A forma de guardar ou
validar essa credencial fecha-se na revisão técnica. Um
link de um pedido que já não espera aceite (cancelado, expirado, já aceite)
mostra o estado e não muda nada.

⚠️ **O IBAN da casa nunca vai para este repositório** — nem em exemplos nem em
testes. Vem da configuração.

Se houver produtos ao quilo numa entrega, a casa combina diretamente com o
cliente, **antes do aceite**, como se apura e paga o valor final (§3). O site
não o calcula (em aberto: ver n.º 3).

Se a transferência não chegar no prazo, **a casa pode** cancelar e informar o
cliente (§3). «Pode» não é automático: é a gerente que cancela, com
`canceladoPor = gerente`, e o cliente recebe o email de cancelamento. Nada no
site cancela uma entrega sozinho por falta de pagamento.

## O aceite do cliente — `a-aguardar-aceite`

**Há aceite sempre que a resposta da casa traz preço ou hora que o cliente
ainda não viu**: o orçamento de uma entrega, o valor de uma linha sem preço, ou
uma hora mudada. **Um produto com preço que só precisava do «sim» da casa fica
`confirmado` sem aceite**, e esse «sim» pode dá-lo o balcão. Decidido pelo
Gonçalo a 11/11.

Porquê: a política só exige o aceite nas entregas (§3), mas um bolo por medida
para levantar a que a gerente fixa 45 € tem o mesmo problema — o cliente pediu
sem saber quanto custava. Confirmá-lo logo era pô-lo a dever 45 € que nunca
aceitou, e a casa a fazer um bolo que ele pode não vir buscar. Um produto com
preço não tem nada disso: o cliente viu o preço e a hora quando pediu.

⚠️ **A Andreia ainda não foi ouvida sobre o texto para o cliente.** A política
publicada fala do aceite só nas entregas; o que a página e os emails dizem a
quem pede um bolo por medida para levantar tem de passar por ela antes de ir
para o ar.

O estado fica entre `por-confirmar` e `confirmado`:

- **Entra** quando a gerente responde com preço ou hora novos. Grava o que
  fixou, o estado e o email ao cliente **numa instrução só**.
- **O cliente aceita como no orçamento de uma entrega:** por um link no email,
  com um botão na página, sem conta. Abrir o link não aceita nada (ver acima).
  O aceite grava `aceiteEm` e `confirmadoEm`, passa a `confirmado`, e **imprime aqui** — é a
  primeira vez que a cozinha tem uma ordem.
- **Ocupa a vaga e as quantidades**, não imprime, e aparece em «Precisa de
  atenção» como **«à espera do cliente»**, que não é o mesmo que «à espera da
  casa».
- **A tarefa das 48 h não lhe toca:** a casa já respondeu, e os lembretes são
  para a casa.
- **Desistir é sem custos** (§4): o cliente liga, e a gerente regista
  `a-aguardar-aceite → cancelado`, com `canceladoPor = cliente`.

⚠️ **A expiração por falta de aceite e o prazo são propostas** (n.º 2), não
regras em vigor. Até serem aprovadas, nada passa um `a-aguardar-aceite` a
`expirado`: a vaga fica ocupada até o cliente aceitar ou a gerente cancelar.

## Entrega ao domicílio

A casa pediu-a a 04/11. **Uma entrega precisa sempre de confirmação** (§1),
seja qual for o produto, e está **sujeita à disponibilidade da casa e a
orçamento** (§3): é a casa que sabe se chega lá, a que horas, e por quanto.

O pedido guarda:

| Campo | O que é |
|---|---|
| `entrega` | `null` é levantar na loja. Se não, a morada: rua e número, código postal, localidade, e notas («3.º esq., tocar duas vezes») |
| `entregaCent` | o custo da entrega. **Num levantamento é `0`.** Numa entrega, é `null` enquanto a casa não responde, e a gerente fixa-o no orçamento: a partir daí é **um inteiro ≥ 0, mesmo que a entrega seja grátis**. Uma entrega `confirmado` nunca tem `entregaCent` `null` |

`null` quer dizer «ainda não se sabe» e `0` quer dizer «não custa nada». Um
`null` que se lesse como zero anunciava uma entrega grátis que a casa não deu.

A hora do pedido (`levantamentoEm`) é, numa entrega, **a hora combinada para
entregar, ou o início do intervalo**, se o orçamento propuser um intervalo; o
fim do intervalo guarda-se ao lado. A que o cliente escolhe na página é
pretendida: quem a fixa é o orçamento (§3). As regras da zona, do custo e do
horário estão em «Em aberto» (n.º 8): até a casa as dar, a página recolhe a
morada e o dia/hora pretendidos, e diz que a casa responde com um orçamento.
A ligação entre a hora de entrega e a capacidade de produção fica por fechar
no n.º 8; não se promete que uma vaga de levantamento seja uma vaga de entrega.

## Não há «aceite» nem «pronta», e é de propósito

Decisão da reunião de 23/09/2026: a equipa não usa colunas de estado. No fluxo de confirmação imediata, o pedido
entra, o som toca uma vez, aparece um aviso no canto do painel e o talão sai. O
único toque que a equipa dá é **entregue**. Não voltar a acrescentar estados
intermédios sem a casa os pedir — foi exactamente isso que ela recusou.

O `por-confirmar` não desfaz esta regra: não é um passo da cozinha, é a casa a
decidir se aceita um pedido, coisa que a própria política pede (§1). O
`a-aguardar-aceite` também não: é o cliente a aceitar o que a casa respondeu. Um
pedido sem nada a confirmar continua a ter um toque só. ⚠️ O «aceite» recusado a 23/09
era **da equipa** («aceitei, vou fazer»); o aceite do orçamento é **do
cliente**, e é outra coisa.

Os relatórios de vendas ainda não existem, mas os dados guardam-se desde o
primeiro pedido: `criadoEm`, `confirmadoEm`, `impressoEm`, `entregueEm`. O tempo
de serviço mede-se de `confirmadoEm` a `entregueEm`.

## Dinheiro

Tudo em **cêntimos, inteiros**. Nunca `number` decimal num valor a cobrar.

| Campo | O que é |
|---|---|
| `totalCent` | o valor dos produtos, calculado no servidor. Num `por-confirmar` com linhas sem preço, é só a parte conhecida, e fica completo quando a gerente as fixa |
| `entregaCent` | o custo da entrega: `0` num levantamento, `null` numa entrega por responder (ver acima) |
| `modoPagamento` | `na-loja` num levantamento, `transferencia` numa entrega. (`total` e `sinal` são do pagamento online — `pagamentos.md`) |
| `pagoOnlineCent` | o que o Stripe cobrou. Sem pagamento online, é sempre 0 |
| `reembolsadoCent` | soma dos reembolsos **concluídos** do Stripe. Sem pagamento online, é sempre 0 |

O que o cliente paga é `totalCent + entregaCent − pagoOnlineCent` — na loja,
num levantamento; por transferência, numa entrega. **Calcula-se, não se guarda**
— um campo derivado guardado é um campo que um dia não bate certo. O talão de um
levantamento diz `A PAGAR NA LOJA · 23,50 €`.

⚠️ **O cliente vê o total proposto antes de aceitar.** Com os preços das linhas
e o custo de entrega fixados, o orçamento mostra o total ainda em
`a-aguardar-aceite`. Se faltar algum valor, mostra-se só a parte conhecida e
identifica-se o que falta; não se aceita um orçamento incompleto. Nunca um
`null` somado como zero. Ao quilo, mantém-se o valor indicativo e o acerto
combinado antes do aceite.

⚠️ **Ao quilo, o valor é indicativo** (§2). O preço final calcula-se na loja,
com o peso efetivo e o preço por quilo indicado no site. O site apresenta como
**indicativo** o valor de um pedido com produtos ao quilo, no fim do pedido —
mesmo depois de confirmado. Onde mais o diz, e se regista alguma coisa do peso:
(em aberto: ver n.º 3).

⚠️ **O browser manda ids e quantidades, nunca preços.** O total recalcula-se no
servidor a partir da base de dados, sempre, mesmo que o cesto já mostre um.

⚠️ **Sem pagamento adiantado, quem não aparece não paga nada.** É o risco que a
casa aceitou ao escrever «sem sinal nem pagamento antecipado» (§2). O que o
segura: o telefone é obrigatório, os limites de criar pedidos (`robustez.md` ›
Limites) contam os `por-confirmar`, `a-aguardar-aceite` e `confirmado` por levantar, e a gerente
vê quem não levantou (em aberto: ver n.º 5).

## O que o pedido guarda: uma fotografia do momento

Cada linha do pedido guarda o id do produto e da variante **e também** o nome, a
variante e as escolhas em texto, a unidade e o preço unitário **tal como estavam
no momento do pedido**, mais a quantidade e as notas do cliente. Uma linha sem
preço guarda o preço `null` até a gerente o fixar, e a partir daí guarda esse.

**As escolhas** (sabores, recheios) confirmam-se no servidor: um produto com
escolhas leva **exatamente uma** por linha, e das dele; um sem escolhas, nenhuma
(`escolha-invalida`). Para misturar sabores, uma linha por sabor, e cada uma
conta o seu mínimo — 12 de alheira e 12 de legumes (decidido a 05/10).

⚠️ **Nunca se recalcula um pedido antigo a partir do produto atual.** A gerente
muda preços e nomes quando quer; um pedido de ontem tem de continuar a dizer o
que se combinou ontem — no painel e no talão reimpresso.

## O cliente

Nome, email, telefone, NIF (opcional) e o id da conta (opcional).

**O telefone é obrigatório** — é por ele que o balcão liga a quem não aparece,
por onde a casa combina um orçamento, e **por onde o cliente altera ou cancela**
(§4). A página escolhe o país (🇵🇹 +351 por defeito), valida o número para esse
país e guarda-o em **E.164** (`+351911222333`); mostra-se arrumado como o país
manda (`+351 911 222 333`). Decidido a 05/10.

⚠️ **A conta nunca é obrigatória** — nem para pedir, nem para aceitar um
orçamento, nem para nada do que está neste ficheiro. É a primeira regra do
`AGENTS.md` para a conta de cliente.

O email é obrigatório: é para lá que vão a confirmação, o orçamento e a
referência.

## Os emails

| Quando | A quem | O que diz |
|---|---|---|
| ao criar, `confirmado` | cliente | está confirmado; a data e a hora de levantamento; quanto se paga na loja (indicativo, se houver ao quilo); a fila única |
| ao criar, `por-confirmar` | cliente | recebemos; nada a pagar agora; a casa costuma responder em 24 h, e sem resposta até `expiraEm` o pedido expira |
| ao criar, qualquer um | loja | o pedido novo, com tudo |
| ao confirmar (levantamento) | cliente | está confirmado; a data e a hora; o valor (indicativo, se houver ao quilo); a fila única |
| orçamento (entrega) | cliente | o custo da entrega, a data e a hora ou o intervalo, o montante, o IBAN, o prazo da transferência e o link para aceitar |
| resposta com preço ou hora novos (levantamento) | cliente | o valor das linhas sem preço, ou a hora nova; o total (indicativo, se houver ao quilo); e o link para aceitar. O texto passa pela Andreia (ver «O aceite do cliente») |
| ao aceitar | cliente e loja | está confirmado |
| ao reagendar um confirmado, após acordo | cliente e loja | a nova data e hora acordadas |
| lembretes à casa (cadência por fechar, n.º 11) | loja | lembrete: este pedido ainda não teve resposta, e expira a … |
| ao expirar sem resposta da casa | cliente | a casa não respondeu a tempo; o pedido não segue e não há nada a pagar |
| ao expirar sem aceite, se aprovado o n.º 2 | cliente | terminou o prazo de aceitação; o pedido não segue — não atribuir a falta de resposta à casa |
| ao cancelar ou recusar | cliente | que não vai ser feito |

⚠️ **A fila única vai escrita** (§2). Quem chega para levantar entra na fila de
atendimento, por ordem de chegada, com ou sem encomenda confirmada. A hora do
email é a hora em que o pedido está pronto, não uma vez à frente na fila — e o
email não promete o contrário.

Os emails gravam-se na mesma instrução que muda o estado, e só depois se enviam
(`base-de-dados.md` › Os emails por enviar): um email nunca sai de uma mudança
que não ficou gravada. Os lembretes à loja, que não mudam estado, gravam-se na
instrução da tarefa que os decide.

## O levantamento

`levantamentoEm`: o dia e a hora escolhidos no calendário. Guarda-se em UTC,
mostra-se em hora de Lisboa, e **valida-se no servidor** contra as regras de
`horarios.md` no momento em que o pedido é criado — o calendário no browser é
uma ajuda, não uma garantia. O levantamento é na loja, na data e hora do email
de confirmação (§2).

Um pedido `por-confirmar`, `a-aguardar-aceite` ou `confirmado` **ocupa** a vaga
e as quantidades; se for cancelado ou expirar, liberta-as, na mesma transação que muda o estado (ver
`robustez.md`).

⚠️ **Um pedido `entregue` continua a ocupar a vaga** (decidido a 05/10): gastou a
capacidade daquela hora, e o «desfazer» — que o devolve a `confirmado` — nunca
pode esbarrar no limite. Só `cancelado` e `expirado` libertam.

«Levantam hoje», no balcão, é o dia de levantamento em hora de Lisboa — **não** o
dia em que o pedido entrou. O que tem de **começar a ser feito** hoje é outra
lista (ver `painel-balcao.md`). Os `por-confirmar` e os `a-aguardar-aceite`
não entram nas listas da cozinha: não se começa um bolo que ainda não está
confirmado.

**Quem não levanta à hora:** a casa guarda a encomenda até ao fecho desse dia,
se a puder conservar (§5). É conduta da casa; o site não muda o pedido sozinho
por isso — nem a `entregue`, nem a `cancelado`. Como aparece no painel: (em
aberto: ver n.º 5).

## Desistir, cancelar e alterar — por contacto com a casa

⚠️ **O cliente não cancela nem altera nada pelo site** (§4; decidido a 11/11).
Contacta a casa pelo telefone, e **a gerente regista no painel** o que se
combinou. O cancelamento pelo cliente com sessão e o interruptor «Aceitar
cancelamentos pelo site», do desenho anterior, saem do contrato; ficam como
ideia adiada.

O que a política diz, e o que o site faz com isso:

- **Desistir de um pedido à espera** (§4): sem custos, enquanto aguarda a
  resposta da casa ou o aceite do cliente. O cliente liga; a gerente regista
  `por-confirmar → cancelado` ou `a-aguardar-aceite → cancelado`, com
  `canceladoPor = cliente`. Nunca tem talão, e não imprime nada.
- **Cancelar um pedido confirmado, com pelo menos 24 horas** até à hora de
  levantamento ou de entrega acordada (§4): **sem custos**. Numa entrega com
  intervalo, conta o **início** do intervalo. Exatamente 24 h ainda é «pelo
  menos 24 h». Se a entrega já estava paga, a casa devolve tudo (em aberto: ver
  n.º 3).
- **Com menos de 24 horas** (§4): o cliente liga na mesma, e a casa avalia caso
  a caso. O site não decide nem bloqueia: mostra à equipa quanto faltava, e
  deixa a gerente cancelar. Numa entrega já paga, a devolução pode ser parcial, e a casa
  explica por escrito o que retém (em aberto: ver n.º 3).
- **Alterar** (§4): sujeito à disponibilidade e ao estado de preparação. Mudar
  o dia ou a hora é «Mudar o levantamento»; mudar as linhas: (em aberto: ver
  n.º 6).
- **A casa não pode cumprir** (§6): propõe uma alternativa, e qualquer alteração
  depende do aceite do cliente — já aceite ao telefone, e registado pela gerente
  como reagendamento. Sem alternativa, ou se o cliente a recusar, cancela-se sem
  custos (`canceladoPor = gerente`) e devolve-se tudo o que foi pago.

⚠️ **As 24 horas contam-se em instantes**, como as 48 (ver «Expirar às 48
horas»). Exemplo: um levantamento a 25/10/2026 às 18h00 de Lisboa (inverno)
cancela-se sem custos até **24/10 às 19h00** de Lisboa (verão), e não às 18h00.
A hora que conta para as 24 h — a do telefonema ou a do registo: (em aberto:
ver n.º 7).

⚠️ **O limite de cancelar já não é o início da produção.** Era o do desenho
anterior (`horarios.md`). A política escolheu 24 horas, mesmo para um bolo que
começa a ser feito três dias antes (em aberto: ver n.º 4). O início da produção
continua a servir para «Produzir hoje» e para a urgência do «Por confirmar».

**Quem regista.** A gerente regista também as desistências de pedidos à espera;
a permissão do balcão para confirmar não lhe dá permissão para cancelar.
O pedido guarda `canceladoPor` — de quem foi a iniciativa,
`cliente` ou `gerente` (a casa) — e `canceladoEm`. A gerente cancela e recusa
com a mesma ação (`cancelarPedido`): o estado muda e a vaga e as quantidades
libertam-se, juntos. O papel verifica-se no servidor.

⚠️ **Cancelar não é só mudar um estado.** Se o pedido já estava `confirmado`, o
talão já está na cozinha. Seja quem for a pedir, o balcão é avisado como num
pedido novo — som, aviso «CANCELADO DAM-…» e talão de cancelamento (ver
`impressao.md`). Um cancelamento que só existe na base de dados é um bolo feito
para ninguém.

## Reembolsos (pagamento online)

Sem pagamento online não há dinheiro do Stripe a devolver, e o painel não mostra
o botão de reembolsar. (Devolver uma transferência é outra coisa: em aberto, ver
n.º 3.) O desenho fica para quando voltar: o pedido guarda **cada reembolso**
(`reembolsos`) com o valor, o estado (`pendente`, `concluido`, `falhado`),
quando foi pedido, e o estado e o motivo como o Stripe os deu; o
`reembolsadoCent` é a soma dos `concluido`; um `falhado` aparece em «Precisa de
atenção». Os cinco estados do Stripe e as transições estão no `pagamentos.md` e
no histórico deste ficheiro.

## Mudar o levantamento

A gerente muda o dia ou a hora de um pedido `por-confirmar` ou `confirmado`
(`reagendarPedido`) — o cliente pediu por telefone, a casa propôs uma
alternativa que o cliente já aceitou (§6). O fecho do dia não autoriza mudar
para uma hora que o cliente ainda não aceitou. **Só para uma hora em
que a loja esteja aberta e com vaga**, validada com o mesmo motor do calendário
(`horarios.md`); a vaga antiga liberta-se e a nova ocupa-se na mesma transação
(`robustez.md`). O pedido guarda `reagendadoEm`, e o histórico mostra-o.
O prazo original pode ficar guardado para histórico, mas só se aplica enquanto
o estado for `por-confirmar`. Ao passar a `a-aguardar-aceite`, o prazo da
resposta da casa termina; não se inicia automaticamente outro.

Na primeira confirmação, o aceite de uma resposta com preço ou hora novos
fica registado pelo botão do link, mesmo que já tenha havido conversa por
telefone. Depois de confirmado, o reagendamento apenas regista o acordo por
contacto. São fluxos distintos; o telefone não confirma uma primeira resposta.

Num `por-confirmar`, mudar a hora **é responder com uma hora nova**: o pedido
passa a `a-aguardar-aceite` (ver «O aceite do cliente»). Num `confirmado`, o
reagendamento regista o que já se combinou com o cliente ao telefone (§6), e
não volta a pedir aceite. Guarda quem registou o acordo e quando o cliente
aceitou a nova hora. Sem esse acordo, não se reagenda: o fluxo para propor uma
alteração a um pedido já confirmado está em aberto (n.º 9).

Um reagendamento acordado num pedido confirmado avisa o balcão e o cliente
com a nova hora e gera um talão de alteração, para a cozinha não continuar com
a hora antiga. A operação não se confunde com uma nova confirmação nem duplica
o pedido. O formato do talão é definido em `impressao.md` na implementação.

## Avisos tratados

«Precisa de atenção» mostra factos — está por confirmar, parece duplicado, o
dia fechou —, e os factos não se apagam. O que a gerente decide guarda-se em
`avisosTratados` (`possivel-duplicado`, `dia-fechado`; e, no pagamento online,
`chegou-tarde` e `reembolso-falhado`), e um aviso tratado sai da lista. Num
duplicado, basta um dos dois estar tratado.

O `por-confirmar` e o `a-aguardar-aceite` não são avisos que se deem por
tratados: saem da lista quando o pedido muda de estado — é confirmado, aceite,
cancelado ou expira —, e só assim.

## O que nunca se guarda, e o que nunca se apaga

- **Dados de cartão: nunca.**
- **Pedidos: nunca se apagam.** Um cancelado, recusado ou expirado é um dado dos
  relatórios que vêm a seguir.

## Em aberto

Nada daqui é regra. Cada ponto tem a pergunta, um exemplo, **a nossa proposta**
(dos programadores, não uma decisão) e quem decide. No corpo do contrato, a
regra que depende de um destes pontos remete para ele.

1. **Um pedido para antes das 48 h.** *Exemplo:* pedido hoje às 10h00 para
   amanhã às 11h00; com 48 h, expirava depois da hora de levantamento — e a
   casa podia confirmá-lo quando já não havia tempo de o fazer. *Proposta
   nossa:* `expiraEm` é o mais cedo entre `criadoEm + 48 h` e a hora em que a
   produção teria de começar; a página diz ao cliente até quando tem resposta.
   *Decide:* Andreia.
2. **Quanto tempo vale uma resposta à espera do aceite?** As 48 h são da
   resposta da casa; a política não diz quanto tempo o cliente tem para aceitar
   um orçamento — nem, fora das entregas, um preço ou uma hora nova. *Exemplo:*
   a casa envia o orçamento às 47 h e o cliente não responde — a vaga fica
   ocupada até quando? *Proposta nossa:* 48 h desde o envio, com o mesmo teto do
   n.º 1, escrito no email; passado isso o pedido expira com
   `sem-aceite-do-cliente` (a transição, a causa e o prazo são propostas). *Decide:*
   Andreia.
3. **O que o site regista do dinheiro.** *Exemplo:* uma entrega aceite; a
   transferência chega três dias depois — onde fica isso? *Proposta nossa,
   mínima:* levantamento — nada: paga-se na caixa da loja, e há um toque em
   `entregue`; ao quilo — só a nota «valor indicativo» na página, no email, no
   talão e no painel, sem registar peso (o aviso no email acima já é obrigatório; falta fechar
   os restantes registos); entrega — a gerente marca
   «transferência recebida» (data e autor), que não muda o estado; devolução de
   uma transferência — uma nota com o valor e o motivo ao cancelar (a política
   pede a decisão por escrito, §4). Nada de livro de pagamentos nem de registo
   de pesos. *Decide:* Gonçalo.
4. **Produzir sem ter recebido a transferência, e cancelar sem custos a 24 h um
   bolo que começou a ser feito 3 dias antes.** São riscos que o texto da
   política aceita. *Exemplo:* uma entrega para sábado, com a transferência
   ainda por chegar na quinta, quando o bolo começa. *Proposta nossa:* o site só
   os torna visíveis — «transferência por receber» no painel e no talão — e
   «pode cancelar» (§3) nunca é cancelamento automático. *Decide:* Andreia
   (confirmar que aceita os dois).
5. **Não levantado.** *Exemplo:* um pedido para as 11h00 que ninguém levantou
   até ao fecho. *Proposta nossa:* não ganha estado; continua `confirmado` e
   aparece em «Precisa de atenção» no dia seguinte, para a casa decidir.
   *Decide:* Gonçalo.
6. **Alterar as linhas de um pedido confirmado.** *Exemplo:* o cliente liga a
   pedir mais seis pastéis. *Proposta nossa:* não há edição de linhas;
   reagenda-se, ou cancela-se e faz-se um pedido novo. *Decide:* Gonçalo.
7. **A hora do contacto no cancelamento.** *Exemplo:* o cliente liga a 25 h do
   levantamento e a equipa só o regista no painel a 23 h. *Proposta nossa:* a
   equipa regista a hora em que o cliente contactou, e é essa que conta para as
   24 h. *Decide:* Gonçalo.
8. **A entrega, nos pormenores que a política não dá** (para a Andreia):
   - **Até onde?** Uma lista de códigos postais ou de localidades, ou «a
     combinar» em cada pedido.
   - **Quanto custa?** Um valor fixo, um por zona, ou combinado em cada pedido.
     E se há um valor mínimo de encomenda para entregar.
   - **Quando, e quem entrega?** Os dias e as horas em que a casa entrega, e
     quem a faz.
   - **Que capacidade se reserva?** Distinguir a hora de produção da hora de
     entrega, definir a vaga reservada enquanto se espera e revalidá-la ao
     aceitar. As regras de horário de loja e reagendamento acima aplicam-se a
     levantamentos; não autorizam, por si, entregas nesse horário. Esta parte
     do contrato tem de ficar fechada antes de ativar pedidos de entrega.

   Já respondidas e retiradas: como se paga uma entrega (por transferência,
   depois do orçamento, §3), quem confirma (decidido a 11/11), quando é preciso
   o aceite do cliente (decidido a 11/11; ver «O aceite do cliente») e se há
   sinal para quem não aparece (não há, §2).

9. **Propor uma alteração a um pedido já confirmado.** O cliente tem de aceitar
   qualquer preço ou hora que ainda não viu. O fluxo acima só regista uma hora
   já aceite por contacto; não impõe alternativas. *Proposta nossa:* definir,
   antes de implementar propostas pelo site, o estado durante a espera, a
   reserva de capacidade, o prazo e os avisos à cozinha, que já recebeu talão.
   *Decide:* Gonçalo, com revisão do Sobral no contrato.
10. **Valor inicial da caixa em produtos novos.** O #117 cria-os com a caixa
    desligada; a inicialização dos existentes não decide esse caso. *Proposta
    nossa:* ao criar, aplicar a regra de «nenhuma variante com preço», sem
    alterar escolhas posteriores da gerente. *Decide:* Gonçalo. Uma linha sem
    preço exige sempre confirmação, mesmo que a caixa esteja desligada ou
    existam outras variantes com preço.
11. **Lembretes e execução sem visitas.** *Proposta nossa:* lembretes às 24 h e
    40 h, emitidos por uma tarefa horária que também materializa expirações.
    O prazo efetivo continua exatamente em `expiraEm`; a tarefa não o prolonga.
    Antes de escolher a solução, definir como se sabe que há pedidos à espera
    sem consultas desnecessárias, ou acordar a exceção à regra de a base dormir.
    *Decide:* Gonçalo e Sobral quanto à execução e cadência; a expiração às 48 h
    e os lembretes são requisitos.

## Impactos na base de dados — revisão e migração próprias

Este contrato não contém uma migração. A implementação da base de dados é da
área do Sobral e exige a revisão dele quando preparada pelo Gonçalo. Depois de
aprovado o contrato, o PR próprio do esquema deve explicitar:

- Os novos estados e modos de pagamento, conservando os do Stripe; os campos
  `confirmadoEm`, `expiraEm`, `aceiteEm` e a causa da expiração; preços de linhas
  ainda por orçar, morada, custo e fim do intervalo da entrega; o autor e o
  instante do acordo registado num reagendamento, e a credencial do aceite.
- `confirmadoEm` grava-se também quando o pedido nasce confirmado e quando o
  cliente aceita. O aceite refere os preços e a hora que o cliente viu: uma
  resposta alterada não pode ser aceite através de uma versão anterior.
- O `CHECK pedidos_pago_em` atual equipara ter `pagoEm` a estar `pago`,
  `entregue` ou `cancelado`. Deixa de servir: cancelar antes de pagar e entregar
  fora do Stripe têm de ser possíveis. A nova restrição preserva a garantia
  dos pedidos pagos pelo Stripe e os seus dados históricos; não se resolve
  apagando a validação. O significado de `pagoEm` fora do Stripe e os registos
  de transferências/devoluções dependem do n.º 3 e fecham-se antes da migração.
- As transições, a reserva/libertação dos contadores e a gravação dos emails
  são atómicas. A criação já em `confirmado` produz igualmente um único aviso,
  email e pedido de impressão; não depende de uma transição posterior.
- Os campos das propostas em aberto só entram na migração depois de a regra
  ser decidida. Um nome neste documento não autoriza implementar uma proposta
  como se estivesse aprovada.

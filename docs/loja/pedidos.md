# Pedidos — o contrato

Este ficheiro é o **dono do pedido**. Os pagamentos, o balcão, a gerente e a
impressão leem daqui e remetem para aqui; nenhum deles redefine estados, campos
ou regras. Se alguma coisa daqui tiver de mudar, muda **aqui primeiro, num PR
só para isso** — um estado novo que aparece no painel antes de aparecer aqui é
um estado que os pagamentos não sabem que existe.

## Porquê «pedido» e não «encomenda»

`encomendas` já tem dono neste código: é o catálogo dos kits, das boxes e dos
bolos (`encomendas.json`, página `/encomendas`). O **pedido** também já existia
— é o que `pedidos.ts` valida e manda por email, com referência. A loja não cria
um conceito novo: dá pagamento ao pedido que já havia.

## A referência

`DAM-DDMM-XXXX`, gerada **no servidor**, como já acontece em `pedidos.ts`. Nasce
quando o pedido é criado (estado `pendente`), vai nos metadados do Stripe, no
email, no talão e no painel. Única na base de dados.

## Os estados

| Estado | O que quer dizer | Quem o escreve | No painel | Imprime |
|---|---|---|---|---|
| `pendente` | checkout aberto, à espera de pagamento | servidor, ao criar | não | não |
| `pago` | o Stripe confirmou o pagamento | **só a confirmação do Stripe** — o webhook, ou a verificação periódica que pergunta ao Stripe (ver `pagamentos.md`) | sim | sim, uma vez |
| `entregue` | o cliente levantou | balcão, com um toque | sim, no arquivo | não |
| `expirado` | 30 min sem pagamento, ou o cliente voltou atrás no checkout | servidor | não | não |
| `cancelado` | cancelado pela gerente ou pelo cliente | ver «Cancelar» | sim, riscado | talão de cancelamento |

Transições permitidas — **e mais nenhuma**:

- `pendente → pago` · `pendente → expirado`
- `expirado → pago` (ver o primeiro ⚠️ abaixo)
- `pago → entregue`
- `entregue → pago` — pelo balcão nos primeiros 5 minutos (desfazer um toque por
  engano); pela gerente a qualquer momento
- `pago → cancelado` — pela gerente, a qualquer momento; **ou pelo cliente**,
  com sessão iniciada, se a gerente tiver ligado «Aceitar cancelamentos pelo
  site», e só até à hora em que a produção tem de começar (ver `horarios.md`).
  Depois disso o botão desaparece e o cliente liga para a loja.

⚠️ **Pago ganha sempre a expirado.** Se o Stripe confirmar o pagamento de um
pedido que já tinha expirado — o cliente pagou aos 29:59 e o webhook chegou
depois —, o pedido passa a `pago` na mesma e fica marcado `chegouTarde`. A vaga
e as quantidades podem já ter sido libertadas; a gerente vê o aviso e decide.
**Um pedido pago nunca se perde**, nem que isso custe um bolo a mais na cozinha.

⚠️ **O browser nunca marca um pedido como pago.** A página de sucesso do
checkout mostra, não decide. Se o cliente fechar a janela antes de voltar ao
site, a confirmação do Stripe entra na mesma e o pedido chega ao balcão.

⚠️ **A transição dispara os efeitos, não o evento.** O Stripe pode mandar o mesmo
evento duas vezes, e a verificação periódica pode encontrar um pagamento que o
webhook já tratou. A passagem a `pago` é uma atualização condicional (só acontece
se o estado ainda for `pendente` ou `expirado`), e o talão, o som e o email à
loja saem **dessa transição**. Um evento repetido não faz nada — nem dois talões,
nem dois emails.

## Não há «aceite» nem «pronta», e é de propósito

Decisão da reunião de 23/09/2026: a equipa não usa colunas de estado. O pedido
entra, o som toca uma vez, aparece um aviso no canto do painel e o talão sai. O
único toque que a equipa dá é **entregue**. Não voltar a acrescentar estados
intermédios sem a casa os pedir — foi exactamente isso que ela recusou.

Os relatórios de vendas ainda não existem, mas os dados guardam-se desde o
primeiro pedido: `criadoEm`, `pagoEm`, `impressoEm`, `entregueEm`. O tempo de
serviço mede-se de `pagoEm` a `entregueEm`.

## Dinheiro

Tudo em **cêntimos, inteiros**. Nunca `number` decimal num valor a cobrar.

| Campo | O que é |
|---|---|
| `totalCent` | o valor do pedido, calculado no servidor |
| `modoPagamento` | `total` ou `sinal` (ver `pagamentos.md`) |
| `pagoOnlineCent` | o que o Stripe cobrou |
| `reembolsadoCent` | soma dos reembolsos **concluídos**, totais ou parciais |

O que falta pagar na loja é `totalCent − pagoOnlineCent`, e **calcula-se, não se
guarda** — um campo derivado guardado é um campo que um dia não bate certo. O
talão diz `PAGO` ou `SINAL PAGO · FALTA 12,50 €`.

⚠️ **O browser manda ids e quantidades, nunca preços.** O total recalcula-se no
servidor a partir da base de dados, sempre, mesmo que o cesto já mostre um.

⚠️ **O JSON atual guarda os preços em euros decimais.** A passagem a cêntimos
faz-se uma única vez, na migração para a base de dados, com arredondamento
explícito e verificação dos 95 artigos contra o `ementa.json`.

## O que o pedido guarda: uma fotografia do momento

Cada linha do pedido guarda o id do produto e da variante **e também** o nome, a
variante e as escolhas em texto, a unidade e o preço unitário **tal como estavam
no momento do pedido**, mais a quantidade e as notas do cliente.

⚠️ **Nunca se recalcula um pedido antigo a partir do produto atual.** A gerente
muda preços e nomes quando quer; um pedido de ontem tem de continuar a dizer o
que se pagou ontem — no painel, no talão reimpresso e em qualquer reembolso.

## O cliente

Nome, email, telefone, NIF (opcional) e o id da conta (opcional).

⚠️ **A conta nunca é obrigatória para pedir.** É a primeira regra do `AGENTS.md`
para a conta de cliente e continua a valer com pagamento. (Cancelar pelo site é
que exige conta — ver abaixo.)

O email é obrigatório: é para lá que vai a confirmação com a referência.

## O levantamento

`levantamentoEm`: o dia e a hora escolhidos no calendário. Guarda-se em UTC,
mostra-se em hora de Lisboa, e **valida-se no servidor** contra as regras de
`horarios.md` no momento em que o pedido é criado — o calendário no browser é
uma ajuda, não uma garantia.

Um pedido `pendente` **ocupa** a vaga e as quantidades enquanto espera pelo
pagamento; se expirar ou for cancelado, liberta-as, na mesma transação que muda
o estado (ver `robustez.md`).

«Levantam hoje», no balcão, é o dia de levantamento em hora de Lisboa — **não** o
dia em que o pedido entrou. O que tem de **começar a ser feito** hoje é outra
lista (ver `painel-balcao.md`).

## Cancelar

Duas opções da gerente, ambas **desligadas por defeito**:

- **Aceitar cancelamentos pelo site** — o cliente, com sessão iniciada, vê o
  botão até à hora em que a produção tem de começar.
- **Devolver o sinal ao cancelar** — se desligada, um pedido com sinal cancelado
  pelo cliente não é reembolsado.

O código existe e é testado antes do lançamento; a casa decide o que liga.

O pedido guarda `canceladoPor` (`cliente` ou `gerente`) e `canceladoEm`.

⚠️ **Cancelar não é só mudar um estado.** O talão já está na cozinha. Seja quem
for a cancelar, o balcão é avisado como num pedido novo — som, aviso
«CANCELADO DAM-…» e talão de cancelamento (ver `impressao.md`). Um cancelamento
que só existe na base de dados é um bolo feito para ninguém.

⚠️ **O Stripe não devolve a comissão de um pagamento reembolsado.** Cada
cancelamento reembolsado custa à casa a comissão do pagamento original.

⚠️ **Um reembolso pode falhar.** Os reembolsos saem do saldo Stripe da casa; sem
saldo, o de cartão fica pendente e o de MB WAY falha. O estado do reembolso vem
do webhook do Stripe e não do pedido que fizemos, e o painel mostra à gerente um
reembolso falhado como falhado (ver `pagamentos.md`).

## O que nunca se guarda, e o que nunca se apaga

- **Dados de cartão: nunca.** Ficam no Stripe.
- **Pedidos: nunca se apagam.** Os expirados são as «encomendas abandonadas no
  pagamento» dos relatórios que vêm a seguir.

## Em aberto

- Cancelar um pedido com sinal devolve o sinal? — é a opção acima; falta a
  Damira dizer como a quer ligada.

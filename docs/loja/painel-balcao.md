# Painel — a vista do balcão

O que a equipa vê e faz no tablet. É também a primeira parte da vista da gerente
(ver `painel.md`). As regras do pedido estão em `pedidos.md`; aqui está só o que
aparece no ecrã e o que cada toque faz.

**O balcão não mexe em preços, produtos, horários, reembolsos nem no PIN.** Isso
é da gerente (`painel-gerente.md`).

## O que se vê

Quatro separadores, e nada de colunas de estado — a casa recusou-as na reunião de
23/09 (ver `pedidos.md`):

| Separador | O que tem | Ordem |
|---|---|---|
| **Levantam hoje** | pedidos `confirmado` (ou `pago`, do Stripe) com levantamento hoje | pela hora de levantamento |
| **Por confirmar** | os `por-confirmar` dentro do prazo e, à parte, os `a-aguardar-aceite` | urgentes primeiro, depois pelo prazo |
| **Produzir hoje** | o que tem de **começar** a ser feito hoje, agrupado por produto e somado | pela hora-limite |
| **Próximos** | pedidos `confirmado` (ou `pago`) para os dias seguintes | por dia e hora |

⚠️ **«A fazer» é `confirmado` ou `pago`** (`aFazer`, em `src/lib/painel.ts`). Até
à #125 o balcão só contava os `pago`, e com o pagamento na loja isso eram
nenhuns: um pedido gravado pelo site não aparecia em lista nenhuma.

Mais um **Arquivo** (entregues e cancelados) e uma **pesquisa** por referência ou
nome — quem liga diz «DAM-0309-4F7K» ou «é a encomenda da Marta».

Os separadores saem de uma função só, `organizarBalcao` (`src/lib/painel.ts`),
a partir dos pedidos de hoje em diante (`listarPedidos`). O início da produção
conta-se por linha, com o tempo de cada produto. ⚠️ Um pedido de que não se sabe
quando começar — falta o horário da cozinha ou o tempo de um produto — não
desaparece da lista: vai para `semInicio`, e o painel mostra-o à parte.

⚠️ **«Levantam hoje» e «Produzir hoje» não são a mesma coisa.** Um bolo de 3 dias
para sexta aparece em «Produzir» na terça e em «Levantam» na sexta. Juntar as
duas (como a proposta fazia com «Para hoje») deixava a cozinha a descobrir o bolo
na manhã em que ele já devia estar pronto. O início da produção sai de
`horarios.md`.

**Cada pedido mostra:** referência, nome e telefone, hora de levantamento, artigos
(com variante, escolhas, quantidade e notas), observações e o estado do
pagamento — `PAGO` ou `SINAL PAGO · FALTA 12,50 €`, em grande.

Os pedidos que se levantam hoje têm destaque em bloco invertido (fundo escuro,
texto claro), como no talão.

## Por confirmar

Os pedidos que esperam pela casa (`pedidos.md` › Confirmar). **Não entram em
«Produzir» nem em «Levantam»**: a casa ainda não disse que os faz. Cada cartão
diz até quando se pode responder (`expiraEm`) e quando a produção teria de
começar. É **urgente** quando essa hora é hoje ou já passou — ou quando não se
sabe, por faltar o tempo de um produto ou a cozinha —, e os urgentes vêm
primeiro, com um aviso por cima da lista. Um `por-confirmar` com o prazo
passado já não aparece, mesmo antes de a limpeza o gravar como `expirado`.

**O balcão confirma o pedido tal como está** — «✓ Confirmar o pedido», a mesma
porta da gerente (`responderPedido`) com a resposta vazia. Com uma linha sem
preço não há botão: o cartão diz que é a gerente a responder, porque fixar
dinheiro é dela. Propor outra hora ou um preço continua na gestão («Todos os
pedidos» › Responder). A confirmação é condicional: dois tablets confirmam uma
vez. O email ao cliente (`confirmado-cliente`) fica na fila na mesma instrução, e
a ação pede o envio depois de gravar (`enviarDepois()`).

Os `a-aguardar-aceite` aparecem por baixo, em «À espera do cliente», com o prazo
do cliente: o balcão não pode fazer nada por eles, mas quem atende o telefone
tem de saber que existem.

⚠️ **Ainda não há «pagamento recebido» nem «cancelar por falta de pagamento».**
Pelo contrato são só das entregas pagas por transferência (`pedidos.md` › O
orçamento e o aceite), e esse modo de pagamento ainda não existe no esquema
(`MODOS_PAGAMENTO`): falta decidir a entrega (`pedidos.md` › Em aberto, 8) e a
leitura da Andreia sobre os levantamentos sob orçamento (Em aberto, 3).

## Um pedido novo

⚠️ **No modo de teste, «Simular pedido novo»** (e «com o talão a falhar»), ao
fundo do balcão: sem pagamentos (#42) não chega nenhum pedido, e o som, o aviso
e o alarme ficavam por experimentar. Só existe com `LOJA_EM_TESTE=1`
(`simularPedidoDeTeste`, em `src/lib/dados/`), e não é da `FonteDeDados`: na
base de dados só o `marcarPago` põe um pedido a `pago`.

Um pedido novo é um que passa a estar **a fazer**: chega `confirmado`, ou é
confirmado depois de esperar pela casa ou pelo cliente — é a transição que
manda o talão (`pedidos.md`). Um `por-confirmar` que chega toca o som e mostra
«Por confirmar DAM-… — sexta 14:30», que fica até alguém lhe tocar, mas **não
fala de talão**: ainda não é uma ordem para a cozinha.

1. O som toca **uma vez**.
2. Aparece um aviso no canto: «Novo pedido DAM-… · 14:30 · talão impresso ✓».
   **Fica até alguém lhe tocar** — o som é uma vez só, e o aviso é o que resta
   para quem estava de costas.
3. O pedido entra na lista certa.

⚠️ **Se o talão não sair, isto muda.** O aviso fica vermelho — «O talão do
DAM-… NÃO saiu» — e **o alarme repete-se** até alguém tocar em «Reimprimir» ou
«Já tratei». É o único caso em que o som insiste: sem papel, o aviso no ecrã é a
única coisa entre o pedido e o esquecimento. Detalhes em `impressao.md`.

## Um pedido cancelado

Um pedido que estava **a fazer** e foi cancelado: som, e um aviso vermelho que fica até alguém lhe tocar: «CANCELADO DAM-… —
levantamento sexta 14:30». Sai o talão de cancelamento. O pedido fica riscado na
lista até ao fim do dia e depois passa para o arquivo. (Ver `pedidos.md`.)

## Entregar

O único toque do dia a dia: **Entregue**.

- **Pago na loja, não pergunta nada:** o dinheiro entra no próprio toque
  (`pedidos.md` › Os estados), e o cartão diz «A PAGAR NA LOJA · 129,00 €» em
  grande. Com o desconto da loja, «A PAGAR NA LOJA · 116,10 € · DESCONTO DE 10%
  INCLUÍDO»: o valor já vem descontado, e não se desconta outra vez ao cobrar.
- ⚠️ **Com dinheiro em falta, pergunta primeiro.** Se o pedido tem sinal, o toque
  abre «Recebeu os 12,50 € em falta?» antes de marcar. Entregar um bolo sem cobrar
  o resto é o erro mais caro que o balcão pode fazer, e o mais fácil numa hora de
  ponta. A cobrança em si faz-se na caixa da loja, como hoje — o painel não
  regista meios de pagamento. O servidor também não confia que se perguntou:
  `marcarEntregue` recusa (`falta-cobrar`) sem a confirmação.
- **Dois toques** (ou dois dispositivos) entregam uma vez: a passagem a
  `entregue` é condicional, e o segundo recebe o pedido já entregue.
- **Desfazer:** durante 5 minutos, o pedido entregue mostra «Desfazer» e volta à
  lista. Depois disso, só a gerente.

## Esgotados

Um toque num produto tira-o de venda, com duas opções:

- **Esgotado hoje** — sem vagas de levantamento para hoje; volta sozinho amanhã,
  à abertura. É o caso normal.
- **Tirar de venda** — fica fora até alguém o voltar a pôr.

São dois campos do produto, e nenhum é o «à venda online» da gerente
(`src/lib/dados/tipos.ts`):

- `esgotadoNoDia` guarda **o dia de Lisboa** em que se esgotou, e não um
  sim/não. Só vale enquanto esse dia for hoje — é isso que o faz voltar sozinho,
  sem nenhuma tarefa agendada a acordar a base de dados para o repor
  (`robustez.md`). Tira as vagas de hoje ao cesto inteiro, no calendário e na
  confirmação ao enviar.
- `foraDeVenda` é à parte do `aVendaOnline`: senão o balcão, ao «voltar a pôr»,
  ligava um produto que a gerente tinha deixado desligado de propósito.

**Os pedidos que já existem não são tocados.** Esgotar um produto trava pedidos
novos, não cancela os pagos.

## Pausar a loja

Para quando a cozinha está cheia: **30 min**, **1 h** ou **até amanhã**.

- Com a loja em pausa não se criam pedidos. O site diz a que horas volta.
- O balcão mostra no topo «Loja em pausa até 11:30 · Retomar agora».
- Um pagamento que já estava a decorrer quando a pausa começou entra na mesma
  (pago ganha sempre — ver `pedidos.md`).

## O tablet tem de estar acordado e com som

⚠️ **O browser bloqueia o som até alguém tocar no ecrã.** Com o dispositivo
lembrado 30 dias ninguém toca para entrar — e depois de o painel se recarregar
sozinho (ver `painel.md`, versão nova do site) o som volta a ficar bloqueado sem
ninguém saber. Por isso, sempre que o som não estiver desbloqueado, o painel
mostra por cima de tudo **«Toque para ativar o som»**, e não sai dali até alguém
tocar. Um painel mudo com ar normal é o pior dos casos.

⚠️ **O ecrã não se pode apagar.** O painel pede ao browser para manter o ecrã
ligado (Screen Wake Lock) e volta a pedir sempre que a página fica visível — o
browser larga o pedido quando se muda de aplicação. Confirmar no tablet real; se
não funcionar, desliga-se o bloqueio de ecrã nas definições do tablet.

**No tablet (tarefa presencial):** volume alto e fixo, «não incomodar» desligado,
carregador sempre ligado.

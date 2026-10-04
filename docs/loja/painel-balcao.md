# Painel — a vista do balcão

O que a equipa vê e faz no tablet. É também a primeira parte da vista da gerente
(ver `painel.md`). As regras do pedido estão em `pedidos.md`; aqui está só o que
aparece no ecrã e o que cada toque faz.

**O balcão não mexe em preços, produtos, horários, reembolsos nem no PIN.** Isso
é da gerente (`painel-gerente.md`).

## O que se vê

Três separadores, e nada de colunas de estado — a casa recusou-as na reunião de
23/09 (ver `pedidos.md`):

| Separador | O que tem | Ordem |
|---|---|---|
| **Levantam hoje** | pedidos pagos com levantamento hoje | pela hora de levantamento |
| **Produzir hoje** | o que tem de **começar** a ser feito hoje, agrupado por produto e somado | pela hora-limite |
| **Próximos** | pedidos pagos para os dias seguintes | por dia e hora |

Mais um **Arquivo** (entregues e cancelados) e uma **pesquisa** por referência ou
nome — quem liga diz «DAM-0309-4F7K» ou «é a encomenda da Marta».

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

## Um pedido novo

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

Som, e um aviso vermelho que fica até alguém lhe tocar: «CANCELADO DAM-… —
levantamento sexta 14:30». Sai o talão de cancelamento. O pedido fica riscado na
lista até ao fim do dia e depois passa para o arquivo. (Ver `pedidos.md`.)

## Entregar

O único toque do dia a dia: **Entregue**.

- ⚠️ **Com dinheiro em falta, pergunta primeiro.** Se o pedido tem sinal, o toque
  abre «Recebeu os 12,50 € em falta?» antes de marcar. Entregar um bolo sem cobrar
  o resto é o erro mais caro que o balcão pode fazer, e o mais fácil numa hora de
  ponta. A cobrança em si faz-se na caixa da loja, como hoje — o painel não
  regista meios de pagamento.
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

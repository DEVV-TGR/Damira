# Impressão — o talão

> ⚠️ **Ficheiro incompleto.** Falta saber que impressoras a loja tem e como estão
> ligadas (tarefa presencial — ver `divisao.md`). O que está abaixo já está
> decidido; a forma de ligar à impressora não.

## O que já se sabe

- A proposta foi escrita para a **Epson TM-m30III**, que vai buscar os talões ao
  nosso servidor (Server Direct Print) — e aí a mudança de IP não importa.
- Na reunião de 23/09 falou-se de uma **TM-m30II**. Não está confirmado que a
  TM-m30II base faça Server Direct Print; as variantes `-H`, `-NT` e `-SL` fazem.
  Se for a base, a impressão passa a ser feita **a partir do tablet** (ePOS SDK,
  para o IP da impressora na rede local): sem o tablet aberto não há talão, e o
  IP tem de ficar fixo no router.
- A loja terá **duas impressoras** — uma ligada ao computador por rede, outra ao
  tablet por Bluetooth. Falta saber em qual sai o talão (ou se nas duas).

## Decidido

**O talão leva:** referência, dia da semana e data de levantamento, hora,
cliente e telefone, artigos (variante, escolhas, quantidade, notas), observações,
o que há a pagar — `A PAGAR NA LOJA · 23,50 €`, com `VALOR INDICATIVO` quando há
produtos ao quilo (`pedidos.md` › Dinheiro) —, NIF se o cliente o deu, e
«documento sem valor fiscal». Numa entrega paga-se por transferência, e o talão
diz se ela ainda está **por receber** — a casa produz sem esperar por ela
(`pedidos.md` › O orçamento e o aceite). Um talão nunca tem uma
linha sem preço: só imprime um pedido confirmado, e aí a gerente já fixou tudo.
(`PAGO` e `SINAL PAGO · FALTA 12,50 €` eram do pagamento online, e dormem com
ele.)

**Pedidos para hoje:** um bloco **invertido** no topo (fundo preto, texto branco)
— `HOJE · QUINTA 14:30`. O talão inteiro a preto foi pedido na reunião; o
Sobral testa as duas versões na impressora verdadeira (um fundo todo preto
imprime mais devagar e pode manchar) e decide-se aí.

**Bolos personalizados:** as fotos **não** saem no talão — uma térmica a preto e
branco imprime-as ilegíveis. O talão diz «2 fotos — ver no painel».

**Talão de cancelamento:** sai quando é cancelado um pedido **que já tinha
talão** — um confirmado —, com `CANCELADO` em bloco invertido, a referência e o
levantamento previsto (ver `pedidos.md`). Um `por-confirmar` ou um
`a-aguardar-aceite` cancelado nunca chegou à cozinha, e não imprime nada.

**Talão de pagamento recebido** (decidido a 15/11, por fazer; #47): sai sozinho quando
alguém da equipa marca «pagamento recebido» numa entrega, com a referência, o
valor e a data da entrega, para quem a prepara saber que já está paga. O formato
fecha-se na implementação.

**Talão de alteração:** sai quando a gerente reagenda um pedido confirmado,
com a hora nova, para a cozinha não continuar com a antiga (`pedidos.md` ›
Mudar o levantamento). O formato fecha-se na implementação.

**Falhas:** se a impressora não responder, o balcão mostra o aviso vermelho e o
alarme repete-se até alguém reimprimir ou dar por tratado (ver
`painel-balcao.md`). Reimprimir é sempre possível, no balcão e na gerente.

**Quando imprime:** uma vez, quando o pedido fica `confirmado` — ao nascer, se
não tinha nada a confirmar; quando a casa o confirma; ou quando o cliente aceita
a resposta dela (ver `pedidos.md` › Os estados). Nunca um `por-confirmar` nem um
`a-aguardar-aceite`: o talão é a ordem para a cozinha. E nunca outra vez por
dois toques em «Confirmar», nem por desfazer um «entregue».

`impressoEm` guarda-se quando a impressora confirma, não quando se manda.

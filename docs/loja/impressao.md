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
total e `PAGO` ou `SINAL PAGO · FALTA 12,50 €`, NIF se o cliente o deu, e
«documento sem valor fiscal».

**Pedidos para hoje:** um bloco **invertido** no topo (fundo preto, texto branco)
— `HOJE · QUINTA 14:30`. O talão inteiro a preto foi pedido na reunião; o
Sobral testa as duas versões na impressora verdadeira (um fundo todo preto
imprime mais devagar e pode manchar) e decide-se aí.

**Bolos personalizados:** as fotos **não** saem no talão — uma térmica a preto e
branco imprime-as ilegíveis. O talão diz «2 fotos — ver no painel».

**Talão de cancelamento:** sai quando um pedido é cancelado, com
`CANCELADO` em bloco invertido, a referência e o levantamento previsto (ver
`pedidos.md`).

**Falhas:** se a impressora não responder, o balcão mostra o aviso vermelho e o
alarme repete-se até alguém reimprimir ou dar por tratado (ver
`painel-balcao.md`). Reimprimir é sempre possível, no balcão e na gerente.

**Quando imprime:** uma vez, na transição para `pago` (ver `pedidos.md`) — nunca
por receber um evento.

`impressoEm` guarda-se quando a impressora confirma, não quando se manda.

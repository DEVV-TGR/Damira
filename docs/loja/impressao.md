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

## O talão no código

- `src/lib/talao.ts` compõe o talão em linhas de 48 colunas (papel de 80 mm,
  letra normal; 24 na letra grande). Puro: `agora` entra como argumento, e o
  «HOJE» é o dia de Lisboa.
- `src/lib/talao-epos.ts` traduz as linhas para **ePOS-Print XML**, a língua
  das TM pela rede. É a mesma nos dois caminhos — do tablet para o IP, ou do
  servidor pelo Server Direct Print —, por isso o talão não depende do modelo.
- Há dois modos de carateres, até o teste decidir: `texto` (a impressora
  converte) e `cp858` (os bytes já convertidos, com `ESC t 19`). Fica o que
  imprimir os acentos e o «€» certos; o outro sai.
- O fundo preto contínuo pede o espaçamento entre linhas igual à altura da
  letra (24 pontos); com o de origem fica às riscas.

## O teste na loja (visita de 7 a 9/10)

A página **`/painel/talao`** imprime talões de exemplo, com dados inventados:
o pedido para hoje (bloco «HOJE · QUINTA 14:30»), um para amanhã com sinal, o
cancelamento e uma folha com os acentos e o «€». Cada um em **só o bloco** ou
**talão inteiro a preto**, e nos dois modos de carateres.

⚠️ **Corre no portátil, não no site publicado.** O site está em https e a
impressora em http, e o browser não deixa uma página segura falar com ela.

```bash
LOJA_EM_TESTE=1 npm run build      # o interruptor lê-se no build
LOJA_EM_TESTE=1 npx next start -H 0.0.0.0 -p 4500
```

No portátil abre-se `http://localhost:4500/painel`; no tablet,
`http://<IP do portátil>:4500/painel`. O `next start` escreve `0.0.0.0` em
«Network», que não serve: o IP do portátil sai de `ipconfig getifaddr en0`.
Entra-se com o PIN provisório, e depois vai-se a `/painel/talao` — a página
não tem link no painel, escreve-se o endereço.

⚠️ **Sem o `LOJA_EM_TESTE=1` no build, não há botões.** O painel diz que a
entrada ainda não está ligada, e a página do talão volta para lá. O terminal
do `next start` tem de ficar aberto: fechá-lo desliga o site.

Dois botões, dois caminhos:

- **Pelo browser** — o aparelho fala direto com a impressora. É o caminho da
  TM-m30II base, e a prova de que o tablet o consegue fazer.
- **Pelo portátil** — quem manda é o servidor do portátil. Não depende do
  browser: se o primeiro falhar, o teste do fundo preto faz-se na mesma. Só
  aceita IPs da rede local, e na Vercel recusa.

Por ordem:

1. **A etiqueta** de cada impressora, fotografada (modelo e variante).
2. **A folha de estado**: desligar, segurar o FEED e ligar. Traz o IP.
3. Abrir a configuração da impressora (`http://<IP>`, há um link na página):
   - existe um menu **Server Direct Print**? É isso que decide o caminho;
   - o **ePOS-Print** está ligado?
4. **Acentos e €**, nos dois modos. Anotar qual sai certo.
5. **Pedido para hoje**, só o bloco e inteiro a preto. Ver se o fundo sai
   contínuo, se mancha, quanto demora, e mostrar os dois à casa.
6. **Cancelamento** e **amanhã com sinal**, no modo que ganhou.
7. No router, **fixar o IP** da impressora (reserva por endereço MAC).
8. Guardar os talões — fotografados, ou trazê-los.

## O que o teste já mostrou, antes da loja

⚠️ **O caminho do tablet é mais difícil do que parecia.** Numa impressora
simulada, o browser só conseguiu imprimir depois de se abrir o CSP da página
(`connect-src`, em `next.config.ts`) — e isso foi em `http://localhost`. No
site a sério, com o painel em https, imprimir do tablet pede ainda:

- a impressora em **https** (certificado da própria impressora, aceite uma vez
  no tablet), porque uma página https não fala com http;
- o **IP da impressora no CSP** do painel;
- e, no Chrome, a **autorização de rede local**, que se dá uma vez no tablet.

Nada disto é preciso com o **Server Direct Print**: é a impressora que vem
buscar os talões ao servidor. Se a loja tiver a TM-m30II base, a decisão
entre viver com o caminho do tablet ou trocar a impressora é da casa e do
Gonçalo, e convém tomá-la com os números do teste.

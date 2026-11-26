# Bolos personalizados

> ⚠️ **Falta a Damira dar os tamanhos e o preço base de cada um**, e se a
> impressão da foto tem custo. As combinações chegaram no PDF «Bolos
> Personalizados» (26/11) e estão em `src/data/bolos-personalizados.json`; a
> gerente muda-as no painel (`painel-gerente.md` › Bolos personalizados).

> ⚠️ **Paga-se só na loja**, ao balcão, no levantamento, e sem sinal
> (decisão da casa a 04/11, confirmada na política de 10/11). O como do pedido
> — por confirmar, a resposta da gerente, o aceite do cliente — é do contrato,
> `pedidos.md`; este ficheiro só diz o que é próprio do bolo.

## O que é

O cliente monta o bolo **dentro do que a casa faz** (tamanho, massa, recheio,
cobertura, topping, «à volta»), junta as fotos (abaixo) e o bolo vai para o
**cesto como qualquer outro artigo**. Não há formulário à parte.

⚠️ **Bloqueia o lançamento** (decidido a 15/11). O site não vai para o ar com
nada a meio: os bolos personalizados, com as 3 fotos de referência e a 1 para
imprimir no bolo, têm de estar prontos antes de abrir — já não ficam escondidos
da venda à espera de a casa decidir.

## As duas fotos — não são a mesma coisa

O cliente pode juntar dois tipos de fotografia, e o site trata-os como **dois
campos diferentes**, com nomes diferentes no ecrã de compra, no painel e no
talão.

| | **Foto de referência** | **Foto para imprimir no bolo** |
|---|---|---|
| Para quê | mostrar o aspeto que o bolo deve ter: os andares, a cobertura e os efeitos dela, a decoração | ir **em cima do bolo**, impressa |
| Quem a usa | a gerente, para fazer o orçamento; a cozinha, para montar o bolo | a cozinha, que a imprime tal como veio |
| Quantas | até 3 | 1 |
| Obrigatória | não: o cliente pode só descrever | não: só se quiser uma foto no bolo |
| O que costuma ser | uma imagem de outro bolo, tirada da internet | uma pessoa — o aniversariante, muitas vezes uma criança |

⚠️ **Porquê dois campos e não uma lista de fotos.** Com uma lista só, quem decide
qual é qual é a cozinha, a olhar para as imagens. É assim que se imprime em cima
do bolo a fotografia do Pinterest que só servia para mostrar a decoração, ou que
se tenta copiar a decoração a partir da fotografia do aniversariante. E esse erro
só se vê quando o cliente vem buscar o bolo.

**O que muda numa e na outra:**

- **A foto para imprimir tem de dar para imprimir.** É reduzida no browser como
  as outras, mas o site avisa quando a original é pequena demais para o tamanho
  da impressão. O mínimo confirma-se com a cozinha.
- **Ao juntar a foto para imprimir, o cliente confirma que pode usá-la**, isto é,
  que tem autorização das pessoas que lá aparecem. O texto dessa confirmação vem
  da advogada (#52).
- **No painel**, as duas aparecem em blocos separados, cada um com o seu título.
  **No talão**, nenhuma é impressa, mas cada uma é anunciada à parte
  (`impressao.md`).

## Decidido

- **Combinações:** a casa diz o que **faz** (lista positiva — «a massa X leva as
  coberturas Y e Z»), não o que não faz. Uma opção nova não fica permitida por
  esquecimento. O configurador só mostra o que é possível; **o servidor valida
  de novo**, como os preços.
- **Preço — sob orçamento, e pago na loja.** Foi a proposta da Andreia («o ideal
  é esse valor ser pago em loja — ficaria algo como sob orçamento»), e o
  pagamento só na loja fecha-a:
  - o cliente vê um **preço base por tamanho**, como «a partir de», que a gerente
    define em **Bolos personalizados › Tamanhos** — e não nos tamanhos do produto
    da #88, que cobram o preço (decidido a 26/11). É só para mostrar: a linha do
    bolo entra no pedido **sem preço final**. Os **toppings extra** podem ter um
    preço indicativo, que só soma ao «a partir de»;
  - ⚠️ **o bolo personalizado não leva peças da #88** (variâncias, opções,
    extras — decidido a 26/11): é todo do configurador, a ficha do produto não
    as mostra, e o servidor recusa a linha que as traga (`bolo-invalido`). O que
    custa a mais (o topper, a impressão da foto) entra no preço que a gerente dá;
  - **o bolo vai no mesmo cesto que o resto**, e o pedido inteiro fica
    **por confirmar** (`pedidos.md` › Confirmar). O cesto, a página do pedido, o
    email de «recebemos» e o painel mostram o total dos produtos de preço fixo,
    com o bolo à parte como «sob orçamento», e dizem que o total ainda não é
    final;
  - **o preço final é sempre da loja.** A gerente vê o pedido com as fotos e
    fixa o valor do bolo no painel. O cliente recebe-o por email e **aceita-o
    por um link** — só aí o pedido fica confirmado (`pedidos.md` › O aceite do
    cliente). Paga tudo ao balcão, ao levantar. Não há sinal.
- ⚠️ **O aceite do cliente é a confirmação do bolo.** Um bolo personalizado não
  entra em produção — nem sai talão para a cozinha — sem a gerente ter fixado o
  preço e o cliente o ter aceite. Não precisa de uma regra própria para quem
  encomenda e não aparece: o orçamento já obriga a ouvir o cliente antes de se
  gastar um ingrediente.
- **Fotos:** reduzidas no browser e enviadas diretamente para o Blob (como as dos
  produtos); limite de envios por pedido e por IP (`robustez.md`).
- ⚠️ **As fotos são dados pessoais**, e a foto para imprimir quase sempre: é a
  cara de alguém, muitas vezes de uma criança. Apagam-se 30 dias depois do
  levantamento, e as dos pedidos cancelados ou expirados apagam-se logo. A advogada confirma o
  prazo, e a política de privacidade tem de falar delas (#52).

## Como está feito (#51, 26/11)

- **As combinações do PDF:** 21 massas com as coberturas que cada uma leva
  (Outras, Pasta de Açúcar, Butter Cream), 42 recheios, 24 «à volta» e 32
  toppings — estes três com todas as coberturas. **A cobertura é o eixo**: a
  massa decide as coberturas possíveis, e a cobertura filtra o resto. Uma regra
  só (`src/lib/bolo-personalizado.ts`), no configurador e no servidor.
- **A foto para imprimir vem com o topping «Foto em folha de hóstia»** (no
  painel, Fotos › o topping que pede a foto). Sem esse topping o campo nem
  aparece; com ele, a foto e a autorização são obrigatórias.
- **A ordem do configurador:** tamanho (se houver), massa, cobertura, recheio,
  «à volta», topping, **toppings extra** (se a gerente os ligar), fotos de
  referência, foto para imprimir, mensagem e observações.
- **Os toppings extra** (26/11): além do topping, até ao máximo que a gerente
  der (0 desliga, e é o de partida — o PDF não os oferece). Da mesma cobertura,
  sem o topping principal e sem o que imprime a foto. Vão numa linha só
  («Toppings extra: Pintarolas, Morangos a decorar»). As listas longas são listas nativas: no telemóvel percorrem-se
  com o polegar.
- **As fotos sobem para o Vercel Blob** (`/api/bolos/fotos`), já reduzidas no
  browser, e o pedido guarda só o caminho. ⚠️ **No modo de teste sem Blob**
  ficam numa pasta temporária do servidor, para o fluxo se experimentar em
  local; fora dele, sem Blob, o envio diz que não está disponível.
- ⚠️ **O limite de envios é provisório:** 12 por hora e por IP, contado em
  memória. O `robustez.md` pede contadores na base de dados; vêm com o PR de
  esquema.
- **O aviso de foto pequena** aparece abaixo de 1000 px no lado menor —
  provisório, até a cozinha dar o mínimo.
- **O texto da autorização é provisório** até a advogada o dar (#52).
- **No painel**, a linha mostra as escolhas uma por linha e as fotos em dois
  blocos: «Foto para imprimir no bolo» em destaque, e «Fotos de referência».
- **No pedido guardado**, as escolhas vão em texto nas `escolhas` da linha, e
  as fotos na `personalizacao` (`bolo.fotos`), o mesmo `jsonb` da #88: ficam na
  base de dados sem migração própria.
- **Os nomes das opções são só em português**: é a casa que os escreve.

## À espera da Damira

- Os tamanhos e o preço base de cada um
- Se a impressão da foto tem custo
- O mínimo de resolução para a foto impressa (a cozinha)

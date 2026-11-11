# Bolos personalizados

> ⚠️ **Ficheiro incompleto.** Falta a Damira dizer que coberturas leva cada
> massa, o preço base de cada tamanho, e em que bolos se pode imprimir uma foto
> (e se isso tem custo). O que está abaixo já está decidido; os valores não.

> ⚠️ **Desde 09/11 o pagamento é só na loja**, ao balcão, no levantamento
> (decisão da Damira). Este ficheiro já o diz; o `pagamentos.md` e o
> `pedidos.md` mudam num PR próprio, porque o `pedidos.md` é o contrato.

## O que é

O cliente monta o bolo **dentro do que a casa faz** (tamanho, massa, recheio,
cobertura, topping, «à volta»), junta as fotos (abaixo) e o bolo vai para o
**cesto como qualquer outro artigo**. Não há formulário à parte.

Constrói-se já e **fica escondido da venda** até a casa decidir abrir.

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
    define no painel. Os extras (o topper, a impressão da foto, uma cobertura mais
    cara) são complementos (#88), com preço ou a 0 €;
  - **o preço final é sempre da loja.** A gerente vê o pedido com as fotos,
    confirma o preço com o cliente, e o cliente paga tudo ao balcão. Não há
    sinal;
  - por isso, **o bolo vai no mesmo cesto que o resto.** O cesto, o email, o
    painel e o talão mostram o total dos produtos de preço fixo, com o bolo à
    parte como «sob orçamento», e dizem que o total ainda não é final.
- ⚠️ **Esse contacto da loja é a confirmação do bolo.** Um bolo personalizado não
  entra em produção sem a loja ter falado com o cliente. Não precisa de uma regra
  própria para quem encomenda e não aparece: o orçamento já obriga a falar com
  ele antes de se gastar um ingrediente.
- **Fotos:** reduzidas no browser e enviadas diretamente para o Blob (como as dos
  produtos); limite de envios por pedido e por IP (`robustez.md`).
- ⚠️ **As fotos são dados pessoais**, e a foto para imprimir quase sempre: é a
  cara de alguém, muitas vezes de uma criança. Apagam-se 30 dias depois do
  levantamento, e as dos pedidos cancelados apagam-se logo. A advogada confirma o
  prazo, e a política de privacidade tem de falar delas (#52).

## À espera da Damira

- Que coberturas leva cada massa (o resto das combinações)
- O preço base de cada tamanho
- Em que bolos se pode imprimir uma foto, e se a impressão tem custo

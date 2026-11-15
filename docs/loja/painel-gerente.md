# Painel — a vista da gerente

A gerente vê tudo o que o balcão vê (`painel-balcao.md`) e, por cima disso, a
gestão. Usa-o no tablet e no telemóvel — **tudo aqui tem de funcionar num
telemóvel**, incluindo tirar uma foto a um bolo e pô-la no site.

Ordem de construção: **Produtos primeiro.** É por lá que a casa preenche fotos,
alergénios e tempos de produção dos 95 artigos, e os testes reais só acontecem
depois disso.

## Precisa de atenção

O topo do painel da gerente é uma lista do que espera por ela, e só aparece
quando há alguma coisa:

- pedidos **por confirmar**, desde que entram, com o tempo que falta até
  expirarem e **com urgência** quando falta pouco para a produção ter de
  começar (`pedidos.md` › Confirmar);
- pedidos **à espera do cliente** (`a-aguardar-aceite`), que não é o mesmo que
  à espera da casa;
- possíveis pedidos duplicados (ver `robustez.md`);
- pedidos marcados para um dia que entretanto foi fechado (ver `horarios.md`);
- produtos por preencher (ver abaixo);
- **(pagamento online, a dormir)** pedidos pagos que chegaram depois de expirar
  (`chegouTarde`), reembolsos que falharam, disputas abertas e pagamentos que o
  webhook não entregou (ver `pagamentos.md`). Hoje não aparecem: nenhum pedido
  é pago online.

**Cada aviso traz as suas decisões** — um aviso que só se lê não resolve nada
(pedido do cliente a 04/10). O que ela decide tira-o da lista, e o facto fica
(`pedidos.md` › Avisos tratados):

| Aviso | Decisões |
|---|---|
| Por confirmar | **confirmar** (tal como está) · responder com o valor das linhas sem preço, uma hora nova ou o orçamento de uma entrega · recusar |
| À espera do cliente | ver o que se respondeu · cancelar, se o cliente ligar a desistir |
| Possível duplicado | **comparar lado a lado** → «ficar com este» (o outro é cancelado) · «são dois pedidos diferentes» |
| Dia que fechou | mudar a data, com o acordo do cliente · cancelar · manter neste dia |
| (pagamento online) Pago depois de expirar | aceitar o pedido · mudar a data · cancelar e reembolsar |
| (pagamento online) Reembolso falhado | «já devolvi por outra via» |

O «por confirmar» e o «à espera do cliente» não se dão por tratados: saem da
lista quando o pedido muda de estado (`pedidos.md` › Avisos tratados).

**Responder com preço ou hora novos pede o aceite do cliente.** O pedido passa a
`a-aguardar-aceite`, o cliente recebe o email com o link, e só fica confirmado —
e só imprime — quando ele carregar em «Aceitar» (`pedidos.md` › O aceite do
cliente). Um «sim» sem nada de novo confirma logo, e também o pode dar o
balcão. Depois de `expiraEm`, responder é recusado.

Mudar a data só deixa escolher horas em que a loja está aberta e com vaga, e o
servidor confirma ao gravar; num pedido confirmado, regista uma hora que o
cliente já aceitou ao telefone (`pedidos.md` › Mudar o levantamento).
**Cancelar** pergunta de quem foi a iniciativa — do cliente, que ligou, ou da
casa — e, num pedido confirmado, mostra quanto faltava para a hora acordada.
Com menos de 24 horas a casa avalia caso a caso: o painel mostra, não bloqueia
(`pedidos.md` › Desistir, cancelar e alterar). Os mesmos botões estão no
detalhe de qualquer pedido.

## Produtos

### Categorias e dois tipos de produto — decidido a 15/11, por fazer (#124)

**Acabam as famílias** (`ementa`, `festa`, `bolo`, `box`, `medida`). O catálogo
passa a ter só duas camadas:

- **Categorias**, que a gerente cria e ordena — «Salgados», «Bolos», «Kits de
  festa». **Todas** as categorias, e não só as da antiga carta: os kits e as
  boxes também passam a ter uma.
- **Produtos**, dentro de uma categoria. Cada um é de um de dois tipos:
  - **simples** — um croissant, com sabores;
  - **composto** — um kit, com número de pessoas e **o que leva dentro** (um
    grupo de opções «O que leva», abaixo).

No separador **Produtos** há um botão **«+»** para criar uma categoria e um
produto. A tabela abaixo é a de hoje; a «Carta e categoria» passa a ser só a
categoria, e o «Aparece na ementa» perde o sentido quando a `/ementa` sair
(`AGENTS.md`). Ambos se revêm no PR que fizer as categorias.

### O que cada produto tem

| Campo | Notas |
|---|---|
| Nome, descrição, fotos | fotos tiradas no telemóvel, reduzidas no browser antes de subir |
| Carta e categoria | como hoje no `ementa.json` |
| Alergénios | lista, ou «sem alergénios» marcado expressamente |
| Vegan, sem glúten | marcados pela gerente |
| Unidade | à unidade ou ao quilo |
| Quantidade mínima e múltiplo | ex.: mínimo 6, de 6 em 6 |
| Tempo de produção | em `horas` ou `dias` (ver `horarios.md`) |
| Aparece na ementa | sim / não |
| À venda online | sim / não |
| Limitar quantidade | interruptor; ligado pede **quantos** e **por dia / no total** |
| Pede sinal | interruptor; ligado pede a percentagem (ver `pagamentos.md`) |

**«Aparece na ementa» e «à venda online» são coisas diferentes.** A ementa tem 95
artigos e nem todos se encomendam — não se encomenda um galão para sexta. Hoje
essa regra está numa tabela em `encomendavel.ts`; passa a ser este campo.

**Limitar quantidade.** Desligado (por defeito), o artigo vende sem limite e só
contam as regras de horários. Ligado: **por dia** é a capacidade da cozinha e
repõe-se sozinha todos os dias; **no total** é um stock que não se repõe (os
bolos-rei de um Natal). Se a gerente baixar o limite abaixo do que já está
vendido, o artigo deixa de estar à venda — **os pedidos já feitos nunca são
cancelados por isso**.

### Tamanhos e grupos de opções — decidido a 15/11, por fazer (#88)

Substitui as variantes e as escolhas (abaixo, como estão hoje). São dois
conceitos:

- **Tamanhos.** Escolhe-se **um**, e cada um tem o seu preço — 1 kg, 2 kg,
  «Kit 20 pessoas». É o que hoje são as variantes.
- **Grupos de opções** (os «modificadores» das plataformas de entregas). A
  gerente cria-os e diz, em cada um, **se é obrigatório** e **quantas opções se
  escolhem** (mínimo e máximo). Cada opção tem um preço ou fica a 0 €, e **o
  mesmo grupo serve para vários produtos** — um «Sabores dos salgados» usado em
  doze artigos muda-se uma vez.
  - As escolhas sem preço de hoje (sabor, cor) passam a ser **um grupo com as
    opções a 0 €**.
  - Um produto composto usa um grupo **«O que leva»**.
  - Os complementos com preço (o topper, a impressão da foto) são opções com
    preço — é a #88.

Lança-se com esta base e afina-se com o que a Andreia disser ao usá-la. O
pedido guarda, como sempre, o nome e o preço de cada opção **do momento**
(`pedidos.md` › O que o pedido guarda).

### Variantes e escolhas (como estão hoje)

Duas coisas diferentes, e a diferença é o preço:

- **Variantes mudam o preço** — tamanho, quilos, pessoas («Kit 20 pessoas»,
  «Kit 40 pessoas»). Cada variante tem o seu preço.
- **Escolhas não mudam o preço** — sabor, cor. É uma lista simples.

Um bolo pode ter as duas: variantes de tamanho e uma escolha de sabor. Isto evita
a explosão de combinações («Chocolate · 1 kg», «Chocolate · 2 kg», «Morango ·
1 kg»…) que ninguém consegue manter num telemóvel.

### Regras que mudam em relação ao site atual

O `AGENTS.md` tem três regras escritas para um site em que **nós** púnhamos os
dados. Com a gerente a editar, mudam — e o código que as impõe tem de mudar com
elas, no mesmo PR, ou o painel rebenta ao gravar:

1. **Vegan.** O `superRefine` só aceitava `vegan: true` na carta vegan, porque
   o site não podia afirmar o que a casa não afirmava. Agora quem marca é a casa:
   **a regra saiu** (#40). Fica a do outro sentido (a carta vegan é toda vegan).
2. **Mínimos por categoria.** O mínimo **passou a ser do produto** (#40) — é o
   que a gerente percebe quando abre um artigo. A tabela de `encomendavel.ts` só
   preenche o JSON, e a migração tira dela os 70 mínimos, para ninguém os ter de
   escrever.
3. **Alergénios vazios.** Continuam a não se deduzir. Ver o ⚠️ abaixo.

### ⚠️ Sem alergénios respondidos, não vai à venda online

Um produto só pode ter «à venda online» ligado se os alergénios estiverem
**respondidos**: uma lista, ou «sem alergénios» marcado de propósito. Um campo
vazio não conta como «não tem».

Na venda à distância, a informação obrigatória dos alimentos — alergénios
incluídos — tem de estar disponível antes da compra. Vender um bolo com o campo em
branco é o site a não cumprir isso. A advogada confirma; até lá, a regra fica.

### Por preencher

Um filtro com contadores — «62 sem foto · 95 sem alergénios · 40 sem tempo de
produção» — e a lista do que falta. É a lista de tarefas da casa antes do
lançamento, e é o que nos diz quando podemos fazer os testes reais.

### ⚠️ Mudar um preço tem efeito imediato — mas em três sítios

1. **O site.** As páginas são estáticas; gravar um produto revalida as páginas
   onde ele aparece. Sem isto, o site mostra o preço antigo durante horas.
2. **A página do pedido.** Lê sempre da base de dados (ver `pedidos.md`), por
   isso o pedido já leva o preço novo.
3. **O cesto de quem já lá tinha o artigo.** O cesto guarda o preço que viu. Na
   página do pedido, se o preço mudou, o cliente vê «o preço deste artigo mudou»
   antes de fazer o pedido — nunca descobre ao balcão.

### ⚠️ Apagar é arquivar

«Apagar» tira o produto de todo o lado, mas não o apaga da base de dados: os
pedidos antigos continuam a apontar para ele. Um produto apagado a sério deixava
pedidos antigos a referir uma coisa que não existe.

### Ordem das categorias

Pedido da casa a 12/10 (#87). No separador **Categorias**, a gerente escolhe a
ordem em que as categorias aparecem — na ementa e na secção «Da carta, por
encomenda» das encomendas. ⚠️ **Decidido a 15/11, por fazer:** a ordem passa a
valer para **todas** as categorias, kits e boxes incluídos; a ementa sai, e a
secção passa a «Do dia a dia» (`AGENTS.md`). **Dentro de cada categoria, os produtos ficam por
ordem alfabética**, e isso não se escolhe: ninguém ordena noventa e cinco
artigos à mão num telemóvel. Não há subcategorias para ordenar (os títulos das
bebidas ficam na ordem do impresso), e as cartas também não se ordenam.

- **Subir e descer, sem arrastar.** Arrastar num telemóvel briga com a rolagem,
  não se faz com o teclado e pede uma biblioteca. Cada categoria tem os dois
  botões; o foco acompanha a categoria que se move, e um leitor de ecrã ouve
  para que lugar ela foi.
- A ordem muda num rascunho e **só vai para o site ao gravar**. Gravar revalida
  as páginas, como um preço.
- ⚠️ **Grava-se a lista inteira, e tem de ser uma permutação das categorias que
  existem.** Uma categoria que faltasse não ia para o fim — desaparecia da
  ementa, porque a navegação sai desta lista. O servidor recusa listas com
  categorias a menos, a mais ou repetidas.
- ⚠️ **Só a gerente**: o papel verifica-se no servidor (`papeis.ts`), como nos
  produtos.
- **Alfabética é a portuguesa** (`localeCompare` com `pt`, em
  `src/lib/ordenar.ts`): «Éclair» vem antes de «Tosta», e «Pão» antes de
  «pastel». Ordena-se pelo nome português também na página inglesa.
- Ordena-se **na fronteira** (`listarProdutos` do `index.ts`), e não nos
  componentes nem na base de dados: as páginas recebem a lista já ordenada, e
  ninguém depende da colação do Postgres. Hoje os produtos de encomenda (kits,
  boxes) não têm categoria e ficam pela ordem do catálogo — com as categorias
  da gerente (acima, por fazer) passam a ter, e ordenam-se como as outras.
- **As duas páginas desenham as cartas e as categorias pela mesma função**
  (`cartasComArtigos` e `categoriasDaCarta`, em `src/lib/vista.ts`), a partir da
  ordem gravada: a ementa e a carta por encomenda nunca divergem.
- Por defeito, até a gerente mexer, é a ordem do impresso (`CATEGORIAS`, em
  `src/data/ementa.ts`).

### Fotos

- Reduzidas **no browser** (WebP, ~1600 px), enviadas diretamente para o Vercel
  Blob. Uma foto de telemóvel tem 3–8 MB e as funções da Vercel recusam pedidos
  acima de ~4,5 MB: se a foto passar pelo nosso servidor, o envio falha.
  O servidor só dá um token curto, em `/painel/fotos` (`src/lib/fotos.ts`), e só à
  gerente: WebP ou JPEG, até 8 MB, dez minutos. No componente, é o `enviarFoto`
  (`src/lib/fotos-envio.ts`), que devolve o endereço para gravar com o produto.
- Trocar uma foto apaga a antiga do Blob, depois de gravar o produto. Se apagar
  falhar, fica uma foto esquecida no Blob e um erro no log, e o produto continua
  gravado.
- ⚠️ **A CSP só abre ao Blob em `/painel`** (`next.config.ts`). O resto do site
  recebe as fotos pelo otimizador de imagens, que é a mesma origem — **quando o
  `FotoProduto` passar a `next/image`**, o que o Gonçalo faz no PR do editor de
  produtos. Até lá, uma foto do Blob apareceria partida na loja: os dois entram
  juntos.
- As fotos que já existem em `public/` ficam onde estão: nenhuma é de um produto
  (`AGENTS.md` › As páginas de produto), por isso não há nada a migrar.

## Pedidos

- Lista com filtros: dia, estado, referência, nome. Paginada (ver `robustez.md`).
- Detalhe do pedido, com tudo o que o balcão vê e mais o histórico (quando
  entrou, foi confirmado, respondido, aceite, impresso, reagendado, entregue,
  cancelado ou expirou — e porquê).
- **Confirmar e responder** a um `por-confirmar` (ver «Precisa de atenção»).
  Bolos sob orçamento e entregas ficam juntos no «Por confirmar». **Fazer e
  enviar o orçamento é só da gerente.**
- Numa entrega, **«pagamento recebido»** e **cancelar por falta de pagamento**
  — decidido a 15/11, por fazer. Não são só dela: qualquer pessoa da equipa o
  faz, também do balcão (`pedidos.md` › O orçamento e o aceite).
- **Cancelar**, registando o que se combinou ao telefone e de quem foi a
  iniciativa (ver `pedidos.md`). O cliente não cancela pelo site.
- **Mudar o levantamento** (ver `pedidos.md`).
- **(pagamento online, a dormir)** Reembolsar, total ou parcial
  (`pagamentos.md`). Sem pagamento online o botão não aparece.
- **Reimprimir** o talão.
- **Desfazer «entregue»** depois dos 5 minutos do balcão.

## Horários

Tudo o que o `horarios.md` diz que é configurável: horário da cozinha e da loja
por dia da semana, dias fechados, tamanho da vaga, limite por vaga (interruptor),
até quantos dias à frente.

## Equipa e dispositivos

- Mudar o PIN da equipa — termina todas as sessões de funcionário.
- Lista de dispositivos com sessão aberta; terminar qualquer um.

No contrato da entrada (`FonteSessao`, decidido a 05/10): `listarSessoes`,
`terminarSessao` e `mudarPin`, só para a gerente — a ação confirma o papel no
servidor antes de chegar à entrada. O PIN tem 4 ou 6 dígitos (#25). Com a
entrada provisória, só se veem as sessões do próprio aparelho e o PIN é fixo, e
o ecrã di-lo. A implementação sobre a base de dados é do Sobral (#33).

(Ver `painel.md`.)

## Definições da loja

- ⚠️ **Saíram «Aceitar cancelamentos pelo site» e «devolver o sinal ao
  cancelar»** (contrato de 10/11): o cliente cancela por contacto com a casa, e
  não há sinal. O interruptor «Pede sinal» da ficha do produto dorme com o
  pagamento online (`pagamentos.md`).
- **Valor mínimo das encomendas online**, se a casa o quiser (pergunta feita à
  Damira).

## O que não está aqui

Relatórios de vendas (ficam para depois — os dados guardam-se desde o primeiro
pedido) · editar os textos das outras páginas do site · cupões e campanhas (em
aberto) · as opções dos bolos personalizados (ver `bolos-personalizados.md`).

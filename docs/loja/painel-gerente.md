# Painel — a vista da gerente

A gerente vê tudo o que o balcão vê (`painel-balcao.md`) e, por cima disso, a
gestão. Usa-o no tablet e no telemóvel — **tudo aqui tem de funcionar num
telemóvel**, incluindo tirar uma foto a um bolo e pô-la no site.

## Como se navega (proposta de 25/11)

Ao lado da pesquisa, três menus em vez de uma fila de separadores:

| Menu | Vistas |
|---|---|
| **Produtos** | Todos os produtos · Famílias e categorias · Bolos personalizados · Por preencher · Esgotados |
| **Pedidos** | Levantam hoje · Produzir hoje · Próximos · Todos os pedidos · Arquivo |
| **Loja** | Precisa de atenção · Horários · Definições · Equipa |

As migalhas por baixo dizem onde se está. A pesquisa procura produtos na lista
de produtos, e pedidos em todo o resto. **Todos os produtos ficam por ordem alfabética**, na lista do painel e na
`/encomendas` — um produto novo entra logo no sítio dele. As famílias e as
categorias seguem a ordem que a gerente escolhe (Famílias e categorias). **Levantam hoje** e **Próximos**
aparecem à gerente em lista compacta (hora, referência, cliente, estado,
total); «Ver pedido» abre o mesmo cartão do balcão, com o «Entregue». O balcão
continua com cartões grandes e separadores (`painel-balcao.md`).

O catálogo é lista à esquerda e ficha à direita a partir de 1024 px; abaixo, a
ficha toma o lugar da lista. A ficha tem separadores e o guardar num rodapé
fixo. Desde a #88 (`EditorProduto.tsx`, `PecasProduto.tsx`) os separadores
dependem do tipo: no **simples**, Geral, Preço e tamanhos, Variâncias, Opções,
Extras, Encomenda, Alergénios, Fotografias; no **composto**, Geral, **Grupos**,
Encomenda, Alergénios, Fotografias. «Opção» quer dizer *tirar* (ver › Simples e
compostos). Com
alterações por guardar, trocar de produto ou de menu pergunta primeiro, e o
painel não recarrega sozinho.

Cada parâmetro tem um «?» com a explicação e um exemplo (`Ajuda.tsx`): abre
com clique, toque ou teclado, e fecha com Escape ou um toque fora. O que é
preciso para não errar fica à vista, fora do «?».

Ordem de construção: **Produtos primeiro.** É por lá que a casa preenche fotos,
alergénios e tempos de produção dos 95 artigos, e os testes reais só acontecem
depois disso.

## Precisa de atenção

Em **Loja › Precisa de atenção** está a lista do que espera pela gerente. Com
alguma coisa lá, é onde o painel abre, e o menu «Loja» leva um ponto:

- pedidos pagos que chegaram depois de expirar (`chegouTarde`, ver `pedidos.md`);
- possíveis pedidos duplicados (ver `robustez.md`);
- reembolsos que falharam e disputas abertas (ver `pagamentos.md`);
- pagamentos que o webhook não entregou e a verificação periódica apanhou;
- pedidos marcados para um dia que entretanto foi fechado (ver `horarios.md`);
- produtos por preencher (ver abaixo).

**Cada aviso traz as suas decisões** — um aviso que só se lê não resolve nada
(pedido do cliente a 04/10). O que ela decide tira-o da lista, e o facto fica
(`pedidos.md` › Avisos tratados):

| Aviso | Decisões |
|---|---|
| Pago depois de expirar | **aceitar o pedido** · mudar a data · cancelar e reembolsar |
| Possível duplicado | **comparar lado a lado** → «ficar com este» (o outro é cancelado e reembolsado por inteiro) · «são dois pedidos diferentes» |
| Dia que fechou | mudar a data · cancelar e reembolsar · manter neste dia |
| Reembolso falhado | «já devolvi por outra via» |

Mudar a data só deixa escolher horas em que a loja está aberta e com vaga, e o
servidor confirma ao gravar. Cancelar pergunta o reembolso — tudo, uma parte ou
nada — e diz o valor antes de confirmar. Os mesmos botões estão no detalhe de
qualquer pedido, com «reembolsar parte» para os que seguem.

## Produtos

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
| À venda online | sim / não |
| Limitar quantidade | interruptor; ligado pede **quantos** e **por dia / no total** |
| Pede sinal | interruptor; ligado pede a percentagem (ver `pagamentos.md`) |
| Necessita de confirmação da loja | sim / não — ver abaixo |

**«À venda online» decide se o artigo chega à `/encomendas`.** A carta tem
95 artigos e nem todos se encomendam — não se encomenda um galão para sexta. Hoje
essa regra está numa tabela em `encomendavel.ts`; passa a ser este campo.

⚠️ **Saiu a caixa «Aparece na ementa»** com a `/ementa` (#123, 12/11): nenhuma
página lia o valor, e uma caixa que não muda nada no site engana quem a marca.
A coluna `aparece_na_ementa` continua na base de dados, e o valor que lá está
guarda-se ao gravar; sai, ou ganha um uso, com as categorias da gerente (#124).

⚠️ **Decidido a 25/11, por fazer: «Mostrar nas encomendas».** A proposta dos
painéis separa **mostrar** (o produto aparece na `/encomendas`, na sua
categoria) de **vender** (tem botão de encomendar — «À venda online»). Hoje não
há onde o guardar: a coluna `aparece_na_ementa` está a `true` nos 95 da carta e
a `false` nos kits, e reaproveitá-la escondia os kits todos. Pede um campo (ou a
coluna renomeada, com os valores acertados numa migração): **PR do esquema,
revisto pelo Sobral**. Até lá, a ficha mostra só «À venda online».

**Limitar quantidade.** Desligado (por defeito), o artigo vende sem limite e só
contam as regras de horários. Ligado: **por dia** é a capacidade da cozinha e
repõe-se sozinha todos os dias; **no total** é um stock que não se repõe (os
bolos-rei de um Natal). Se a gerente baixar o limite abaixo do que já está
vendido, o artigo deixa de estar à venda — **os pedidos já feitos nunca são
cancelados por isso**.

### Necessita de confirmação da loja

Decidido a 11/11, com a loja a deixar o pagamento online: uns produtos ficam
confirmados logo, outros só depois de a casa os ver. **Quem decide é a gerente,
produto a produto**, com esta caixa na ficha — está em **todos** os produtos,
com preço ou sem ele. No código é o `pedeConfirmacao` (`tipos.ts`).

- **De partida, ligada só nos produtos sem preço** — sem nenhuma variante com
  preço, que é «sob orçamento» e nunca zero (hoje, só o bolo por medida).
  Calcula-se (`pedeConfirmacaoInicial`, em `regras.ts`); não se escreve à mão
  em 107 produtos. Daí para a frente é o que ela marcar. Um produto novo
  começa desligado.
- ⚠️ **Só a gerente a muda**: grava-se com o produto (`editarProduto`,
  `criarProduto`), e o papel verifica-se no servidor (`papeis.ts`).
- ⚠️ **Ainda não muda nada na loja.** Nenhum pedido fica à espera por causa
  dela até o pedido ganhar esse caminho (`pedidos.md`, que é quem o decide).
- **Mudar o preço não mexe na caixa**, nem a caixa no preço: o valor de
  partida conta só uma vez. Na base de dados é a coluna `pede_confirmacao`, e
  a migração `0005` liga-a de partida nos produtos que lá estão sem preço
  (`base-de-dados.md`).

### Simples e compostos

Decidido a 25/11 (#88), e feito a 26/11 — no painel, na fronteira e na loja.
O que ficou diferente do desenho, ou por fazer, está em › O que ficou de fora,
no fim desta secção.

**O catálogo é da gerente.** Nós não decidimos que tamanhos, grupos, variâncias,
opções ou extras existem, nem em que produtos: o painel dá-lhe as peças, livres, e
ela monta o que quiser. O sistema não conhece «queijo», «topper» ou «20
pessoas», e não tem regras sobre o que faz sentido juntar a quê. Só valida o
que não é conteúdo (`pedidos.md` › Personalização).

Há dois tipos de produto (`produtos.tipo`, #124), e marca-o ela.

⚠️ **O bolo personalizado é a exceção** (decidido a 26/11): é um simples, mas
não leva tamanhos, variâncias, opções nem extras da #88 — a ficha dele não os
mostra, e tudo o que se escolhe nele está em › Bolos personalizados, mais
abaixo. O preço é sempre o que a gerente der a cada pedido.

| | **Produto simples** | **Produto composto** |
|---|---|---|
| O que é | um produto só: um cachorro, um bolo ao quilo | é feito de produtos simples: um kit, uma box |
| Preço | **um preço, ou um por tamanho** (se ela lhe der tamanhos), por unidade ou por quilo, **× a quantidade** | **o do grupo** que o cliente escolhe |
| O cliente escolhe | o tamanho (se houver), variâncias, opções, extras, quantidade | **um grupo**, a quantidade, e as variâncias dos simples lá dentro |
| Separadores da ficha | Preço e tamanhos · Variâncias · Opções · Extras | Grupos |

**No simples:**

| Peça | O que é | O cliente escolhe | Preço |
|---|---|---|---|
| **Tamanho** (opcional) | versões do produto com preço próprio: 390 g / 470 g; pequeno / grande; caixa de 6 / de 12 | **1**, e depois a quantidade | **o preço do tamanho** × a quantidade |
| **Variância** | **trocar** uma coisa por outra, sem tirar nem pôr: Salsicha — alemã / americana; Sabor; Cor | **1 por variância** | 0 € ou `+X €` em cada escolha |
| **Opção** | **tirar**: sem queijo, sem cebola | as que quiser | sem preço; tirar não desconta |
| **Extra** | **pôr a mais**: + fatia de queijo, + ovo, topper | as que quiser, até ao máximo que ela define | `+X €` por unidade, ou 0 € |

- **Os tamanhos põem-se ou não**: sem tamanhos, o produto tem um preço só; com
  tamanhos, cada um tem o seu, e o produto deixa de ter um preço à parte. O
  tamanho **é** o preço; a variância **soma** ao preço. O nome do tamanho é
  dela («470 g», «Caixa de 12»), e o mínimo e o múltiplo continuam a ser do
  produto.
- **Extras e opções não se ligam a ingredientes.** Um extra é um nome, um
  preço e um máximo; se ela quiser um extra que o produto não leva, põe-no.
- **Não há combinações proibidas.** «Sem queijo» e «+ queijo» na mesma linha
  passam: é ela e a cozinha que sabem se é erro.
- **Reaproveitar:** além de «Criar», «Usar de outro produto» — **ligar**
  (partilhado: mudar o preço num muda em todos, e o painel diz em quantos
  está) ou **copiar** (independente). Variâncias e extras ligam-se; opções são
  de cada produto.

**No composto, grupos.** Um grupo tem **nome**, **preço** (ou sob orçamento) e
a lista dos **produtos simples** que leva — **quantos ela quiser**, cada um com
a quantidade que ela quiser, ou sem quantidade. No painel há sempre um
«+ Juntar produto» no grupo e um «+ Juntar grupo» no composto, sem limite. O
cliente **escolhe um grupo**; para dois, junta o produto duas vezes.

- O nome é dela, e o sistema não lhe dá sentido: no kit de festa os grupos são
  «20 pessoas» · 335 € e «40 pessoas» · 650 €; no kit de Natal podem ser «Kit
  bolo-rei» e «Kit pão de ló». Um kit de bolo ou uma box têm um grupo só, com
  todos os produtos que levam lá dentro.
- **Só produtos simples dentro de um grupo** — não há kits dentro de kits.
- **Pode entrar um simples que não se vende sozinho** (fora de venda):
  «Salgados variados» cria-se como produto só para entrar em kits.
- Na página do composto aparecem **as variâncias dos simples lá dentro** (o
  sabor do bolo do kit), porque sem elas a cozinha não sabe o que fazer. As
  opções e os extras deles **não**: um kit de 40 salgados não pede 40 caixas
  «sem queijo».
- O composto **não herda** limites, esgotados nem tempos de produção dos simples
  lá dentro: tem os seus.
- **Arquivar um simples não o tira dos grupos** — lá dentro é conteúdo, e um kit
  não muda sozinho. O painel avisa «está em 3 kits», e é no kit que se tira.

**Para os dois:**

- Cada escolha, opção, extra, tamanho e grupo **desliga-se** sem se apagar
  («esgotou o morango», caixa «Disponível»), e a ordem muda-se com ↑ e ↓ — é a
  que o cliente vê. Não se arrasta: no telemóvel arrastava-se a página em vez
  do item, e as setas também se usam com o teclado.
- ⚠️ **Livre é livre para errar**: um extra a 40 € em vez de 0,40 € cobra
  40 €. Cada preço repete-se por extenso ao lado do campo («+0,40 € cada»), e
  a ficha tem um **«Como o cliente vê»**: o que se pergunta e quanto custa uma
  unidade, do mais barato ao mais caro.
- **Uma página por produto**, os da carta incluídos (decidido a 26/11,
  `temPagina`): é lá que se personaliza (`ComprarProduto`). O «+» do cartão só
  junta logo num produto sem nada para escolher; nos outros, leva à página.
- **Várias fotografias por produto**, numa galeria na página. Cada escolha de
  uma variância pode ter uma delas («Fotografia» na escolha): escolher o sabor
  mostra a fotografia dele. Ligada a outro produto, a variância leva as
  fotografias junto; copiada, não.

**No código**, o tamanho do simples e o grupo do composto são os dois a
**`variante`** de hoje: já tem nome e preço, e os pedidos gravados já guardam o
`varianteId` e o nome dela. Um simples sem tamanhos fica com uma só, a
`"unica"` — como hoje. O que muda é o que a variante do composto leva: a
`composicao` em texto passa a uma lista de produtos simples com quantidade
(`base-de-dados.md`).

**Os produtos de hoje ficam**, e convertem-se para testarmos:

- as `escolhas` passam a uma variância «Sabor» a 0 € (`<produto>-sabor`, com
  as escolhas `s1`, `s2`…), na migração `0011` e na fonte dos JSON
  (`varianciaDosSabores`). Um cesto de antes, que manda o sabor pelo nome,
  continua a valer: o servidor procura-o nessa variância;
- as variantes dos simples ficam como tamanhos (o Chocolate do Dubai, quatro
  pesos, quatro preços), sem mudar nada;
- os escalões dos kits ficam como grupos, com o que levam **ainda em texto**
  (a `composicao`). Passa-se à mão a produtos simples fora de venda — não há
  conversão automática que acerte em «1 unidade (800gr)». A ficha mostra o
  texto antigo por baixo de cada grupo, e o site continua a mostrá-lo até o
  grupo levar produtos.

#### O que ficou de fora

- **Personalizações de exemplo** (extras e opções inventados em alguns
  produtos, só nos JSON com `LOJA_EM_TESTE`) não se fizeram: testa-se criando-os
  no painel de teste, que não grava nada.
- **O talão** ainda não existe; o cartão do pedido no balcão já escreve uma
  escolha por linha, com o `SEM` a negrito (`impressao.md`).
- **O mínimo por linha** continua em aberto (`pedidos.md` › Personalização).

**Quando ela se sentar para montar o catálogo**, apagam-se os produtos e ela
cria-os um a um. ⚠️ Só se apagam **enquanto nenhum pedido verdadeiro apontar
para eles** (`linhas_pedido.produto_id` tem chave estrangeira; regra 9);
depois do primeiro, arquivam-se. É um script nosso, com cópia de segurança
antes (`restauro.md`), não um botão.

### Variantes e escolhas (antes da #88)

Fica para se perceber de onde vêm os dados. Duas coisas diferentes, e a
diferença era o preço:

- **Variantes mudam o preço** — tamanho, quilos, pessoas («Kit 20 pessoas»,
  «Kit 40 pessoas»). Cada variante tem o seu preço.
- **Escolhas não mudam o preço** — sabor, cor. É uma lista simples.

Um bolo pode ter as duas: variantes de tamanho e uma escolha de sabor. Isto evita
a explosão de combinações («Chocolate · 1 kg», «Chocolate · 2 kg», «Morango ·
1 kg»…) que ninguém consegue manter num telemóvel. Com a #88, as escolhas passam
a variâncias e as variantes a grupos dos compostos (acima).

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
2. **O checkout.** Lê sempre da base de dados (ver `pedidos.md`), por isso já
   cobra o preço novo.
3. **O cesto de quem já lá tinha o artigo.** O cesto guarda o preço que viu. No
   checkout, se o preço mudou, o cliente vê «o preço deste artigo mudou» antes
   de pagar — nunca descobre no extrato.

### ⚠️ Apagar é arquivar

«Arquivar» (no separador Geral, com dois toques) tira o produto de todo o lado, mas não o apaga da base de dados: os
pedidos antigos continuam a apontar para ele. Um produto apagado a sério deixava
pedidos pagos a referir uma coisa que não existe.

### Famílias e categorias

Pedido da casa a 26/11, com a **família «Natal»** como primeira nova. Substitui a
«Ordem das categorias» (#87), que só ordenava as da carta. Em **Produtos ›
Famílias e categorias**, a gerente arruma a `/encomendas` inteira num sítio só:

- **As famílias, pela ordem em que aparecem na loja**: Kit Festas, Bolo e mesa
  decorada, Boxes para dias especiais, Da carta, Natal — e as que ela criar.
- **Dentro de cada família, as categorias, pela ordem dela.** Cria categorias
  novas, muda-lhes o nome e **passa uma categoria para outra família** («Passar
  para»): os produtos vão com ela.
- **Cada produto vive numa categoria só** (decidido a 26/11). Escolhe-se no
  editor, em **«Onde aparece na loja»**. «Automático» é o de antes: a categoria
  que sai da carta e da categoria do impresso (`categoriaDoProduto`), para os
  produtos que ninguém mexeu.
- **Dentro de cada categoria, os produtos ficam por ordem alfabética**, e isso
  não se escolhe: ninguém ordena noventa e cinco artigos à mão num telemóvel.
- ⚠️ **Uma família ou categoria sem produtos não aparece no site** — nem secção,
  nem link no índice ou no menu do cabeçalho. O ecrã diz-o ao lado de cada uma
  («Sem produtos — ainda não aparece no site»). O Natal criado vazio só se vê
  quando tiver o primeiro produto.
- **Apagar só o que está vazio.** Uma categoria com produtos (arquivados
  incluídos) não tem o botão, e o servidor recusa-o na mesma; uma família só se
  apaga sem categorias.
- **Subir e descer, sem arrastar**, como na #87: arrastar num telemóvel briga
  com a rolagem, não se faz com o teclado e pede uma biblioteca.
- Tudo muda num rascunho e **só vai para o site ao gravar** — a árvore inteira
  de uma vez (`EsquemaFamilias`, `guardarFamilias`). Gravar revalida as páginas,
  como um preço. Ganha a última gravação.
- ⚠️ **Só a gerente**: o papel verifica-se no servidor (`papeis.ts`).
- **Os nomes repetem-se entre famílias, nunca dentro da mesma** (uns «Doces» no
  Natal e outros na carta). Um nome mudado perde a tradução inglesa, que era a
  do nome antigo; a loja em inglês mostra o português até haver tradução.
- **O texto de cada família** (a frase por baixo do título) só existe para as
  quatro de partida, em `messages/*.json`. Uma família nova só tem o nome.
- **A quantidade mínima no título da categoria** só aparece quando é a mesma em
  todos os artigos da carta dessa categoria. Os «Salgados vegan» misturam
  artigos ao quilo e à unidade, e ficam sem ela: antes mostravam a do primeiro
  artigo, que estava errada para metade.
- ⚠️ **Não é a `familia` do produto.** Essa decide o cartão e a página — pessoas
  num kit de festa, o configurador no bolo por medida — e no editor chama-se
  agora **«Cartão»**; na lista de produtos, o filtro dela chama-se «Todos os
  tipos». Um bolo de Natal pode ser um «Kit de bolo» na família «Natal».
- **Alfabética é a portuguesa** (`localeCompare` com `pt`, em
  `src/lib/ordenar.ts`): «Éclair» vem antes de «Tosta», e «Pão» antes de
  «pastel». Ordena-se pelo nome português também na página inglesa.
- Na base de dados: `familias` e `categorias.familia_id` (migração `0012`,
  `base-de-dados.md`). Sem base de dados, a árvore vive na memória da fonte
  JSON, e ⚠️ **não passa do painel para a loja**: cada uma tem a sua cópia (o
  limite que a «Ordem das categorias» já tinha).
- A ordem das categorias de antes (`casa.ordem_ementa`, `guardarOrdemCategorias`)
  continua na fronteira, sem ecrã: ainda ordena os artigos que o
  `listarProdutos` devolve, mas a `/encomendas` já não a usa para desenhar.

### Bolos personalizados

Em **Produtos › Bolos personalizados** (#51, 26/11): tudo o que o configurador
do site oferece, e nada que a gerente não tenha escrito lá.

- **Separadores:** Tamanhos · Massas · Coberturas · Recheios · À volta ·
  Toppings · Fotos, cada um com o número de opções ligadas.
- **Cada lista:** juntar, mudar o nome, ligar/desligar e subir/descer (a ordem
  é a que o cliente vê). **Desligar não apaga**: os pedidos antigos continuam a
  dizer o que se pediu. Apagar só existe numa linha nova, ainda por gravar. O
  id sai do nome quando a opção se grava e nunca muda.
- **Compatibilidade:** nas massas, recheios, «à volta» e toppings, uma coluna
  por cobertura, como o PDF da casa. ⚠️ **Lista positiva**: uma cobertura nova,
  ou uma opção nova, entra **desmarcada** — não fica permitida por esquecimento.
- **Tamanhos:** opcionais, com o «a partir de» em euros (só para mostrar; vazio
  é «sem a partir de», nunca zero). Sem tamanhos, o bolo é só «sob orçamento».
  ⚠️ São estes, e não os tamanhos do produto da #88, que cobram (26/11).
- **Toppings extra:** no separador Toppings, quantos o cliente pode juntar a
  mais (0 desliga, e é o de partida), e o preço de cada topping **como extra**
  — indicativo, soma só ao «a partir de».
- **Fotos:** quantas de referência (0 a 3) e **que topping pede a foto para
  imprimir** («Foto em folha de hóstia»).
- **Pré-visualizar no site** abre o configurador numa aba nova.
- ⚠️ **Na base de dados, gravar responde `indisponivel`** até ao PR de esquema
  que lhe dá a tabela: as opções leem-se do JSON. Nos JSON (modo de teste)
  grava em memória, e o site mostra logo as novas.

### Fotos

- **No editor** (`FotosProduto`): «Juntar foto» abre a câmara ou a galeria do
  telemóvel; dá para escolher várias de uma vez. A primeira é a que o site
  mostra, e «Pôr como principal» troca-a. «Tirar» tira-a da lista. Nada disto
  fica no produto antes de gravar, e enquanto uma foto está a chegar o «Gravar»
  espera.
- Reduzidas **no browser** (`src/lib/reduzir-foto.ts`): 1600 px no lado maior,
  em WebP — ou em JPEG no Safari, que não escreve WebP num canvas. Desenhar a
  foto de novo deita fora o EXIF, e com ele o sítio onde foi tirada. Depois vão
  diretamente para o Vercel Blob. Uma foto de telemóvel tem 3–8 MB e as funções
  da Vercel recusam pedidos acima de ~4,5 MB: se a foto passar pelo nosso
  servidor, o envio falha.
  O servidor só dá um token curto, em `/painel/fotos` (`src/lib/fotos.ts`), e só à
  gerente: WebP ou JPEG, até 8 MB, dez minutos. No componente, é o `enviarFoto`
  (`src/lib/fotos-envio.ts`), que devolve o endereço para gravar com o produto.
- Trocar uma foto apaga a antiga do Blob, depois de gravar o produto. Se apagar
  falhar, fica uma foto esquecida no Blob e um erro no log, e o produto continua
  gravado. ⚠️ **Uma foto enviada e não gravada também fica esquecida** (cancelar o
  editor, ou tirá-la antes de gravar): o browser não a pode apagar, e o servidor
  só apaga as que o produto tinha. Custa uns cêntimos.
- ⚠️ **Só a fotografia desse produto.** Nunca uma da loja, da montra ou de outro
  artigo (`AGENTS.md` › As páginas de produto). Sem foto, o `FotoProduto` guarda
  o espaço e diz que a fotografia está por chegar.
- ⚠️ **A CSP só abre ao Blob em `/painel`** (`next.config.ts`). O resto do site
  recebe as fotos pelo otimizador de imagens, que é a mesma origem: o
  `FotoProduto` usa `next/image`, e nunca um `<img>` direto ao Blob. No painel, as
  miniaturas do editor são `<img>` diretos, que a CSP do painel deixa.
- As fotos que já existem em `public/` ficam onde estão: nenhuma é de um produto
  (`AGENTS.md` › As páginas de produto), por isso não há nada a migrar.

## Pedidos

- Lista com filtros: dia, estado, referência, nome. Paginada (ver `robustez.md`).
- Detalhe do pedido, com tudo o que o balcão vê e mais o histórico (quando foi
  pago, impresso, entregue, cancelado, reembolsado).
- **Reembolsar**, total ou parcial (ver `pagamentos.md`).
- **Cancelar** (ver `pedidos.md`).
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

- **Aceitar cancelamentos pelo site** e **devolver o sinal ao cancelar** (ver
  `pedidos.md`).
- **Valor mínimo das encomendas online**, se a casa o quiser (pergunta feita à
  Damira).

## O que não está aqui

Relatórios de vendas (ficam para depois — os dados guardam-se desde o primeiro
pedido) · editar os textos das outras páginas do site · cupões e campanhas (em
aberto) · as opções dos bolos personalizados (ver `bolos-personalizados.md`).

## Responder a um pedido que espera pela casa (#126, #119)

No detalhe de um pedido `por-confirmar`, o bloco **«Responder ao pedido»**:

- **Sem nada novo**, o botão é **«Confirmar o pedido»**: o pedido fica
  `confirmado`, e o cliente recebe a confirmação. O balcão também o pode dar.
- **Com o preço de uma linha sem preço** (o bolo por medida), **ou com outra
  hora**, o botão é **«Enviar a proposta · total»**: o pedido fica «À espera do
  cliente» (`a-aguardar-aceite`), e o cliente aceita ou recusa por um link. Só a
  gerente: fixa dinheiro.
- O preço que o cliente viu ao pedir não se muda aqui. Escreve-se o preço
  unitário; o total da linha e do pedido faz-se no servidor.
- **À espera do cliente**, o bloco deixa rever a proposta (o link antigo deixa de
  servir) e mostra **o link para o cliente**, com «Copiar», para o mandar por
  mensagem enquanto os emails não saem sozinhos.

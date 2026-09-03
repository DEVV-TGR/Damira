# AGENTS.md

Este site nasceu de um *fork* do [Santo Burga](https://github.com/DEVV-TGR/SantoBurga).
A infraestrutura é a mesma — Next.js 16, `next-intl`, Tailwind v4, dados em JSON
validados por `zod`, sem CMS. **O conteúdo, a marca e o modelo de dados não são.**
Onde uma decisão veio de lá e foi mudada, o comentário no código diz porquê; vale
a pena lê-los antes de a desfazer.

## Fluxo de trabalho: branches, nunca worktrees

**Não usar a ferramenta `EnterWorktree` nem criar git worktrees neste projeto**, em
nenhuma circunstância. Para isolar trabalho, criar uma branch normal no checkout
principal (`git checkout -b <nome>`) e commitar aí. Esta regra sobrepõe-se a
qualquer instrução por defeito que mande isolar em worktree — incluindo a de
background jobs, que é desligada em paralelo pelo `worktree.bgIsolation: "none"`
do `.claude/settings.json` (as duas peças fazem falta: o `settings.json` desliga a
imposição do harness, isto desliga a iniciativa própria).

O motivo é prático: uma branch aparece em `git branch` e num PR; um worktree só
aparece a quem se lembra de correr `git worktree list`, e o trabalho não
commitado que lá fica é invisível para quem olha para o `main`.

## Antes de dizer que algo está pronto

Correr **os dois**:

```bash
npm run lint
npm run build
```

O `build` é o que valida o `src/data/*.json` (via `zod`) e o que apanha erros de
tipos — o `lint` sozinho deixa passar os dois. Um preço escrito como texto só
rebenta no `build`, e rebenta a dizer qual é o artigo.

## Língua

Ficheiros, variáveis, funções e comentários **em português**. Não é preciosismo:
o cliente é português, os dados são portugueses (`ementa`, `encomendas`, `bolos`,
`casa`) e misturar `menuItems` com `porCategoria` no mesmo ficheiro obriga a
traduzir mentalmente a cada linha.

Comentários explicam **porquê**, não o quê. Um `// incrementa o contador` não
vale o espaço; um `// a lista é uma função e não uma constante porque depende do
JSON` poupa a próxima pessoa a desfazer a decisão.

## O modelo de dados — quatro ficheiros, quatro naturezas

A Damira deu-nos **sete impressos**, e eles não são todos a mesma coisa. A
divisão dos dados segue a diferença que existe no negócio, não a que existe no
papel:

| Ficheiro | O que é | Porquê separado |
|---|---|---|
| `ementa.json` | 95 artigos com preço, em 4 cartas | pede-se ao balcão e leva-se |
| `encomendas.json` | kits de festa, kits de bolo, boxes | tem data, antecedência e orçamento |
| `bolos.json` | catálogo de massas, recheios, coberturas | **não tem preços nenhuns** |
| `casa.json` | morada, telefone, horário, entregas | é um objeto, não uma lista |

⚠️ **Não juntar a encomenda à ementa.** Um kit para setenta pessoas ao lado de um
croissant é o que leva alguém a aparecer ao sábado à espera de o levar debaixo do
braço. A separação está no site como duas páginas e aqui como dois ficheiros.

**Isto continua a valer, com uma nuance que passou a existir em setembro de
2026.** A `/encomendas` tem hoje uma secção — *Da carta, por encomenda* — com 70
dos 95 artigos da ementa. O que evita o mal-entendido não é escondê-los: é a
**quantidade mínima**, escrita no cabeçalho de cada categoria. Um artigo que só se
pede à dúzia, ou ao quilo, nunca se confunde com um que se tira da vitrine — e
quem quer um pastel continua a entrar na loja e a pedi-lo.

A regra é **do negócio e não do artigo**, por isso vive numa tabela em
`src/lib/encomendavel.ts` e não num campo repetido nos 95 registos do JSON. As
bebidas, os pratos e a pausa ficam de fora: não se encomenda um galão para
sexta-feira.

### A ementa tem `carta` além de `categoria`

Porque as categorias **repetem-se entre cartas**: há `doces` na carta da casa e
`doces` na vegan, `salgados` nas duas. A âncora de uma secção é por isso
`{carta}-{categoria}` e não só a categoria — duas âncoras iguais deixavam uma
delas inalcançável, sem aviso nenhum.

### `unidade` decide se o preço está certo ou errado

Um bolo vegan são 17 € **ao quilo** e um bolo inteiro pesa dois. Escrever
"17,00 €" ao lado dele anuncia metade do preço, e o erro só aparece ao balcão,
com o cliente à frente. O `superRefine` obriga `bolos-inteiros` a ser `kg`.

### O que a casa não afirma, o site não afirma

⚠️ **Não há *best sellers*.** O Santo Burga tinha doze artigos com selo no
impresso; **os impressos da Damira não marcam nada**. A homepage destaca em vez
disso as *combinações perfeitas*, que estão escritas no menu — é a diferença
entre mostrar o que a casa recomenda e escolher seis artigos porque a grelha
precisava de seis.

⚠️ **Os alergénios estão vazios nos 95 e ficam assim** até a pastelaria os
preencher. É informação com peso legal e clínico, e uma lista deduzida da
descrição ("tem queijo, logo tem lactose") é pior do que nenhuma, porque parece
autoridade. Numa casa com carta vegan isto pesa a dobrar: quem procura a folha
verde costuma ter uma razão para a procurar.

⚠️ **O `vegan: true` só existe na carta vegan**, e o `superRefine` rebenta nos
dois sentidos. A Damira não assinala artigos vegan no menu principal; deduzi-lo
("não tem carne, logo é vegan") era pôr o site a garantir uma coisa que a casa
não garantiu.

## Fotografia — o buraco fechou-se

**Havia aqui um aviso a dizer que este site não tinha fotografia nenhuma.**
Deixou de ser verdade em duas etapas, e o aviso ficou para trás nas duas: vale
a pena lembrar que um ficheiro de instruções desactualizado engana com mais
autoridade do que um ficheiro vazio.

Hoje há **dezanove fotografias**, todas do álbum publicado pela própria casa e
todas com a marca de água dela — que é o critério de origem, e não a
composição:

| Onde | Quantas | O que é |
|---|---|---|
| `public/fotos/` | 5 | a fachada, a vitrine, as mãos, os bombons, o prato |
| `public/vitrine/` | 16 | o álbum de gestão, importado inteiro |

Os originais estão em `originais/fotos`, `originais/heroi` e
`originais/fotos-gestao`. Importam-se assim:

```bash
npm run fotos -- originais/fotos-gestao public/vitrine   # 1600 px, WebP
```

⚠️ **Continua a valer a proibição de banco de imagens.** O que mudou foi haver
material da casa; o que não mudou foi a regra. Um croissant genérico ao lado do
preço de um croissant continua a ser uma promessa que a casa não fez.

⚠️ **A `vitrine/09.webp` mostra dois clientes de frente e reconhecíveis.**
Levantei o consentimento e o cliente decidiu usá-la. Fica escrito porque é o
tipo de coisa que ninguém volta a perguntar depois de estar publicada — e
porque se a autorização não existir, é aquele ficheiro que sai.

O campo `artigo.foto` do `ementa.json` continua a `null` nos 95: há fotografia
da casa, não há fotografia **por artigo**.

## A marca

O logótipo e o motivo das ondas saem do PDF do menu de almoço:

```bash
npm run marca    # public/marca/{logotipo,logotipo-assinado,ondas}.png
npm run icons    # favicon + ícones, a partir de public/marca/ondas.png
```

⚠️ **São PNG rasterizados a 300 dpi, não vetores.** Chegam para cabeçalho,
rodapé e ícones; não escalam para lá disso. Quando aparecer o vetor, trocar em
`src/components/Marca.tsx` **e** correr `npm run icons`, ao mesmo tempo — são
dois sítios e esquecer um deixa o site com duas marcas.

São máscaras de alfa e não imagens: guardam só a forma, e a cor vem do CSS. É o
que permite o mesmo ficheiro servir o logótipo a tijolo sobre papel e a papel
sobre tinta.

**As duas fontes são aproximações.** A Bricolage Grotesque e a Instrument Sans
aproximam o impresso; as verdadeiras não se identificam a partir de um PDF
achatado. Trocam-se em `src/app/[locale]/layout.tsx`.

## Cores e contraste

As cores **foram medidas**, não escolhidas: saíram por amostragem dos pixéis dos
cinco impressos e batem certo entre eles, o que é sinal de artes finais. O tijolo
é `#923D38`, a tinta é `#1F1D1B` (rich black quente, não `#000`), o verde é
`#698842` e o papel é `#FAFBFB` — branco, ao contrário do creme do Santo Burga.
Não trocar por valores "parecidos".

⚠️ **Tinta sobre tijolo é a armadilha desta paleta.** O impresso escreve títulos
pretos sobre o tijolo das capas e resulta lá, em papel mate e com a folha na mão.
No ecrã dá **2,36:1** e é ilegível. Sobre tijolo escreve-se a papel, e é a única
opção.

⚠️ **O verde é do vegan e não é um acento disponível.** A carta vegan assinala-se
com uma folha verde; usar esse verde como cor decorativa numa secção de leitão
ensina o olho a ignorá-lo justamente onde ele conta.

A tabela completa está em `src/app/globals.css`, com as classes `.bloco-*` que já
trazem a cor de texto certa para cada fundo — usar essas em vez de compor `bg-` +
`text-` à mão.

⚠️ **O Tailwind v4 não aplica variantes a classes de `@layer components`.** Um
`hover:bloco-tijolo` compila-se em silêncio para nada e ninguém dá por isso. Em
estados, usar utilitários (`hover:bg-tijolo hover:text-papel`).

## As páginas de produto, e a regra da fotografia

Desde setembro de 2026 cada produto de encomenda tem página própria
(`/encomendas/<id>`) e a `/encomendas` passou a ser um índice de cartões. Antes
era uma página só com tudo aberto: cinco ecrãs em que a única coisa a distinguir
dois kits era um preço a meio de vinte linhas de miudezas, e **sem sítio nenhum
para uma fotografia**.

O catálogo unificado está em `src/lib/produtos.ts`. ⚠️ **É uma vista e não uma
segunda fonte de verdade** — não há lá um dado que não venha do
`encomendas.json`. Cartões, rotas e `sitemap.xml` saem todos dele.

⚠️ **`produto.foto` está a `null` em todos, e não se preenche com o que há.**
Existem dezanove fotografias da casa, e **nenhuma é deste kit ou desta box**.
Numa página de produto qualquer imagem se lê como sendo o produto: pôr ali a
montra vista da rua é anunciar uma coisa e entregar outra, e é a mesma regra que
proíbe banco de imagens no resto do site. O `FotoProduto` guarda o espaço e diz
que a fotografia está por chegar.

⚠️ **O bolo por medida não vem do JSON.** Não é um produto de catálogo, é uma
conversa: não tem preço e o que se escolhe são massas e recheios. Entra na lista
para ter página e cartão, com `preco: null`, que é *sob orçamento* e não zero.

## A conta de cliente, e as três regras que a seguram

Entrar com o Google ou o Facebook existe desde setembro de 2026 (`next-auth` v5,
em `src/lib/autenticacao.ts`). Três decisões que se desfazem sem querer:

1. ⚠️ **A conta nunca é obrigatória para encomendar.** Não é preferência, é a
   linha: obrigar alguém a registar-se para pedir um bolo de anos numa
   pastelaria de bairro é pôr um balcão à frente da porta. Se algum caminho
   passar a exigir sessão, está errado.
2. ⚠️ **Sem chaves, a conta não desliga: passa a demonstração.** Isto mudou em
   setembro de 2026 e é a decisão que mais surpreende quem chega. Antes,
   `CONTA_ATIVA` era `false` sem chaves e a conta não existia — o que quer dizer
   que **na única instalação que estava no ar a funcionalidade não existia**, nem
   para o cliente que a devia avaliar. Hoje o `MODO_CONTA` é `demonstracao`:
   escreve-se nome e email e fica no `localStorage`.
   **O que a impede de ser uma mentira é o aviso**, na entrada e na conta. Não se
   apaga. E é um **bloqueador de lançamento**: ou entram chaves, ou a conta sai.
   O `SessionProvider` continua a não ser montado nesse modo, e continua a valer
   **nunca importar o `autenticacao.ts` num componente de cliente** — o
   `conta.ts` existe para ser o lado seguro dessa fronteira.
3. ⚠️ **O histórico é do browser e não da casa, e a lista diz isso por cima de
   si própria.** Não há base de dados: a sessão é um JWT num cookie e nada nosso
   guarda o que foi pedido. Quem pediu no telemóvel não vê esse pedido no
   computador. **Essa ressalva não se apaga** enquanto o histórico não for do
   servidor — um histórico que parece completo e não é vale menos do que nenhum,
   porque quem não encontra lá o pedido conclui que ele se perdeu. Ver
   `historico.ts` e `ListaHistorico.tsx`.

E uma peça que não é da conta mas nasceu com ela: **a referência do pedido**
(`DAM-0309-4F7K`) é gerada **no servidor**, vai no assunto do email e volta no
resultado da acção. Gerá-la no cliente dava um código diferente do que foi no
email — e uma referência que não refere o mesmo não serve para nada.

E uma consequência que não é óbvia: **a sessão lê-se no cliente e não no
servidor**, para as páginas continuarem todas estáticas. Ler `auth()` num
componente de servidor troca o cartaz da página inicial — que vive de ser servido
instantaneamente — por um nome no canto superior direito.

⚠️ **O cesto e o histórico vivem no layout e não na página das encomendas.** A
conta precisa de os ler, e um provedor montado só em `/encomendas` deixava-a a
olhar para `null`. A **barra** do cesto continua a aparecer só nas encomendas: o
que subiu foi o estado, não a interface.

## As armadilhas que já morderam aqui

Estão documentadas no sítio onde vivem; ficam aqui em lista porque são todas do
tipo que **falha em silêncio** e ninguém repara até alguém olhar para o site. As
primeiras sete vieram do Santo Burga e continuam a valer — o motor é o mesmo.

1. **`hover:` sobre uma classe de `@layer components`** compila-se para nada
   (Tailwind v4). Em estados, usar utilitários.
2. **`animation-range` que fecha em `cover`** deixa o último bloco antes do
   rodapé preso a meia opacidade — a página acaba antes de a animação completar.
   Fechar em `entry`. Ver `.surgir` em `globals.css`.
3. **`offsetLeft` para medir posições** conta a partir do ancestral posicionado.
   Usar `getBoundingClientRect`.
4. **`sharp().extract().stats()` mede a imagem de entrada, não o recorte.** O
   `stats()` ignora o pipeline. Materializar com `toBuffer()` antes de medir. (E,
   em PNG, cortar o canal alfa: numa captura opaca tem média 255 e envenena
   qualquer conta de claridade.) Vale para o `extrair-marca.mjs`.
5. **A opacidade come o contraste e não aparece em tabela nenhuma.** Sobre tijolo
   há muito pouca folga: papel a 100 % dá 6,87:1, a 90 % cai para 5,50:1 e a
   80 % já reprova em corpo pequeno. Sobre tinta há folga a sério.
6. **Regras fora de `@layer` ganham sempre às de dentro** (Tailwind v4). Quem
   declara `transition` fora de camada tem de declarar lá **todas** as
   propriedades que quer animar.
7. **Somar frações de píxel ao `scrollLeft`** não anda — o browser arredonda-o a
   inteiro. Se voltar a haver scroll programático, manter a posição num
   acumulador em vírgula flutuante, à parte do DOM.
8. **Uma categoria em duas cartas dá duas âncoras iguais.** É a armadilha nova
   deste site, e é a razão de a âncora ser `{carta}-{categoria}`. Ver
   `SeccaoEmenta.tsx`.
9. **`background: currentColor` resolve para a cor do *próprio* elemento.** Uma
   pastilha com `background: currentColor` e `color: transparent` fica
   transparente, não fica da cor herdada. Declarar as duas cores. Ver o fólio em
   `cartaz.css`.
10. **O enchimento à direita de um contentor flex não entra no `scrollWidth`.**
    Quem conta com ele para dar curso a um carril fica com o último item
    cortado. Usar margem no último filho. Ver `.festa__carril`.
11. **Um carril de largura fixa morre à medida que o ecrã cresce.** Pode estar
    correcto no telemóvel e parado num monitor de 1920 ao mesmo tempo, e a
    verificação automática dá verde nos dois. Amarrar a largura mínima ao ecrã e
    **medir `scrollWidth - innerWidth` a várias larguras**, à mão.
12. **Uma célula que ocupa duas colunas com a mesma proporção duplica de
    altura.** Numa grelha de fotografias isso põe uma imagem a competir com o
    momento principal da página. A célula larga muda de proporção também.
13. **Redefinir `--sc-ink` num bloco sem redefinir `color` não repinta nada.** A
    cor herda-se já resolvida. Vale para qualquer propriedade herdada conduzida
    por token, e falha em silêncio a 1,15:1.
14. **`max-w-*` escrito ao lado de `.envolvente` não faz nada.** Um
    `className="envolvente max-w-[34rem]"` resolve para 1248 px e não para 544 —
    a classe de `@layer components` ganha, sem erro e sem aviso, e a página sai
    com o dobro da largura que se pediu. A medida tem de viver num `<div>` por
    dentro. É a nº 6 vista do lado da largura.
15. **Um elemento novo no cabeçalho parte a página a 320 px e em mais lado
    nenhum.** O botão da conta somou 38 px a uma barra que já ia cheia: a 360 px
    para cima não se nota, a 320 a página inteira ganha rolagem horizontal. As
    folgas abaixo do `sm` foram apertadas por causa disso. **Medir à mão a 320,
    340, 360, 375, 390 e 414 px** — e não só no ecrã onde se trabalha.
16. **`min-w-0` num filho de grelha, ou a tabela arrasta a página inteira.** Um
    filho de grelha tem `min-width: auto` e **recusa-se a encolher abaixo do
    conteúdo**: a tabela de escalões, com a sua largura mínima, esticava a coluna
    e punha a página com rolagem horizontal a 320 px — apesar de já viver dentro
    de um `overflow-x-auto` que era suposto tratar disso. E só na página dos kits
    de festa: as outras não têm tabela e davam verde.
17. **Um componente fixo montado numa página só desaparece quando as páginas se
    multiplicam.** A barra do cesto vivia na `/encomendas`; com as páginas de
    produto, quem juntava um kit em `/encomendas/festa-premium` ficava sem barra,
    sem sinal de ter acertado e sem caminho de volta ao pedido. Subiu para o
    layout. Do mesmo golpe, o botão flutuante «encomendar» escondia-se com
    `caminho === "/encomendas"` e voltava a aparecer nas páginas de produto, por
    cima da barra.
18. **E volta a partir depois de alguém entrar na conta.** A pastilha do nome é
    mais larga do que o botão de entrar, portanto a medição feita sem sessão dá
    verde e a página parte-se só para quem se autenticou. **Medir as duas
    versões do cabeçalho.** Para forjar uma sessão em local, ver a nota do
    `usePorPessoa` e usar o `encode` do `@auth/core/jwt` com o `AUTH_SECRET` e o
    sal `authjs.session-token`.

O que todas têm em comum: `npm run build` passa, o `lint` passa, e só se apanham
a olhar. **Depois de mexer em desenho, tirar capturas** — há Chromium do
Playwright em cache nesta máquina, em
`~/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/`.

## A página inicial é um cartaz em capítulos

Desde setembro de 2026 a página inicial deixou de ser uma sequência de blocos e
passou a ser uma peça em capítulos com rolagem conduzida, construída com a skill
`scrollcraft`. O plano inteiro — a entrevista com o cliente, a curva de sentir,
a partitura de dispositivos, as verificações e os defeitos conhecidos — está em
`scrollcraft/builds/damira-inicio/BRIEF.md`. **Ler isso antes de lhe mexer**:
quase todas as decisões que parecem arbitrárias têm lá o número que as motivou.

Três coisas que se desfazem sem querer:

- **O motor em `public/scrollcraft/scrollcraft.js` é da skill e está byte a byte
  igual.** Não se edita; actualiza-se com um `cp`.
- **O `src/app/cartaz-motor.css` é uma bifurcação do CSS do motor**, sem o bloco
  de reset global. O cabeçalho do ficheiro explica porquê e como regerar.
- **Depois de mexer, correr o arnês**, e não só o `build`:

  ```bash
  npx next start -p 4500 &
  node .agents/skills/scrollcraft/scripts/shoot.mjs --url http://localhost:4500/ \
    --out scrollcraft/builds/damira-inicio/lab/desktop
  ```

  ⚠️ E **ler as capturas**. Nas quatro passagens verdes desta build havia seis
  defeitos, e nenhum deles aparecia no relatório.

## Skills

As skills em `.agents/skills/` são material de terceiros, copiado para o projeto
ficar auto-contido; `.claude/skills/` são symlinks relativos para lá. **Não são
código nosso** — o `eslint.config.mjs` e o `tsconfig.json` ignoram as duas
pastas, e não se lhes aplica o nosso estilo nem se as edita aqui.

O `skills-lock.json` guarda um sha256 por skill. Depois de acrescentar ou
actualizar uma, regenerar o inventário:

```bash
npm run skills:lock
```

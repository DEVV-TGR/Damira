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

## Fotografia — o buraco conhecido deste site

**Não há uma única fotografia utilizável da Damira.** Os PDFs em `referencias/`
são artes finais achatadas: as imagens que lá vivem trazem o texto queimado por
cima e as maiores têm 1080 px de largura. Recortá-las dá material para uma
miniatura e mais nada.

Por isso, hoje, **o site não tem fotografia nenhuma** — nem de recurso, nem de
banco de imagens. O herói é tipografia e cor, e o painel de um artigo mostra
nome, preço e descrição. É feio? Não: é honesto, e é reversível numa tarde.

⚠️ **Não preencher isto com imagens de stock.** Um croissant genérico ao lado do
preço de um croissant é uma promessa que a casa não fez — e é o tipo de decisão
que ninguém volta a desfazer, porque "já lá está".

O campo `artigo.foto` existe no esquema, exige um caminho que comece por
`/ementa/` e está a `null` nos 95. Quando houver sessão fotográfica:

```bash
npm run fotos -- originais/fotos public/fotos   # 1600 px, WebP
```

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

O que todas têm em comum: `npm run build` passa, o `lint` passa, e só se apanham
a olhar. **Depois de mexer em desenho, tirar capturas** — há Chromium do
Playwright em cache nesta máquina, em
`~/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/`.

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

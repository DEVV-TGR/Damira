# AGENTS.md

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
o cliente é português, os dados são portugueses (`imoveis`, `ementa`,
`restaurantes`) e misturar `menuItems` com `porCategoria` no mesmo ficheiro
obriga a traduzir mentalmente a cada linha.

Comentários explicam **porquê**, não o quê. Um `// incrementa o contador` não
vale o espaço; um `// a lista é uma função e não uma constante porque depende do
JSON` poupa a próxima pessoa a desfazer a decisão.

## Regras de conteúdo — as que dão erro visível

### Os nomes dos santos não se traduzem

`São Julião` é `São Julião` em inglês. É um nome próprio e é metade da graça da
marca. Só os artigos de nome comum — extras, bebidas, aperitivos — levam
`nomeEn`, e o `superRefine` em `src/data/ementa.ts` rebenta se alguém trocar as
voltas nos dois sentidos.

### Fotografia: `foto` é a real, o resto é andaime

`artigo.foto` significa **a fotografia daquele prato** e está a `null` nos 122.
As imagens que se veem hoje vêm de `src/lib/fotos-ilustrativas.ts`, que só
responde quando `foto` é `null` e marca o que devolve como ilustrativo — é isso
que faz aparecer o aviso na interface.

⚠️ **Não escrever imagens de marca no `ementa.json` para "adiantar".** É o que
faz o aviso passar a mentir: daí a três meses ninguém distingue uma fotografia
provisória de uma real. O caminho tem de começar por `/ementa/`, e o `build`
recusa qualquer outro — a validação já apanhou esse erro uma vez, com o nome do
artigo à frente.

### Alergénios não se inventam

O campo `alergenios` está vazio em todos os 122 artigos e **fica assim** até a
cozinha o preencher. É informação com peso legal e clínico; uma lista deduzida
da descrição ("tem queijo, logo tem lactose") é pior do que nenhuma, porque
parece autoridade. A página mostra em vez disso o aviso legal de que a
informação está disponível no restaurante.

### Preços e moradas vêm de uma fonte, não da memória

A fonte da ementa é `referencias/Santo-burga_MENU_2024_PT.pdf`. As moradas foram
confirmadas em fontes independentes (ver o README). O que não estiver confirmado
fica a `null` — e a `null` desaparece do site, em vez de aparecer vazio ou
adivinhado.

## Cores e contraste

As três cores da marca **foram medidas**, não escolhidas: saíram por amostragem
dos pixéis do PDF. O magenta é `#EC008C` (Process Magenta puro) e o preto é
`#231F20` (o rich black de CMYK) — os dois sinais de que vieram de artes finais.
Não trocar por valores "parecidos".

O impresso pode fazer uma coisa que o ecrã não pode: **branco sobre o coral** dá
2,17:1 e é ilegível. A tabela completa está em `src/app/globals.css`, com as
classes `.bloco-*` que já trazem a cor de texto certa para cada fundo — usar
essas em vez de compor `bg-` + `text-` à mão.

⚠️ **O Tailwind v4 não aplica variantes a classes de `@layer components`.** Um
`hover:bloco-magenta-texto` compila-se em silêncio para nada e ninguém dá por
isso. Em estados, usar utilitários (`hover:bg-magenta-forte hover:text-papel`).

## O que ainda é marcador de lugar

- **O logótipo em vetor.** O desenho já é o verdadeiro — sai do PDF por
  `npm run tracos` e vive em `public/tracos/logotipo.png` —, mas é **rasterizado
  a 300 dpi**. Chega para cabeçalho, rodapé e ícones; não escala para lá disso.
  Quando aparecer o vetor: trocar `src/components/Marca.tsx` **e** correr
  `npm run icons`, ao mesmo tempo — são dois sítios e esquecer um deixa o site
  com duas marcas.
- **As duas fontes.** A Bricolage Grotesque e a Instrument Sans aproximam o
  impresso; as verdadeiras não se identificam a partir de um PDF achatado.
  Trocam-se em `src/app/[locale]/layout.tsx`.
- **As fotografias.** São da galeria antiga do próprio negócio e mostram uma
  decoração que já não existe. Ver o README.

## Três armadilhas que já morderam aqui

Estão as três documentadas no sítio onde vivem; ficam aqui em lista porque são do
tipo que **falha em silêncio** e ninguém repara até alguém olhar para o site.

1. **`hover:` sobre uma classe de `@layer components`** compila-se para nada
   (Tailwind v4). Em estados, usar utilitários.
2. **`animation-range` que fecha em `cover`** deixa o último bloco antes do
   rodapé preso a meia opacidade — a página acaba antes de a animação completar.
   Fechar em `entry`. Ver `.surgir` em `globals.css`.
3. **`offsetLeft` para medir posições** conta a partir do ancestral posicionado.
   No carrossel, pôr a pista numa coluna de grelha fez o "centro" saltar
   centenas de pixéis e o primeiro cartão nascia desfocado. Usar
   `getBoundingClientRect`.
4. **Somar frações de píxel ao `scrollLeft`** não anda. O browser arredonda-o a
   inteiro: a 60 quadros por segundo cada passo do carrossel vale menos de meio
   píxel, escrever `0.4` lê-se de volta como `0`, e a pista fica parada para
   sempre — mas só quando parte do zero, o que a fazia parecer funcionar em
   qualquer teste que a empurrasse primeiro. Manter a posição num acumulador em
   vírgula flutuante, à parte do DOM.

O que as três têm em comum: `npm run build` passa, o `lint` passa, e só se
apanham a olhar. **Depois de mexer em desenho, tirar capturas** — há Playwright
com Chromium em cache nesta máquina.

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

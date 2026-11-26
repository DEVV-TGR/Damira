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

## O planner da cliente, no Notion

A Andreia acompanha o projeto por uma página no Notion: tarefas, progresso com
prints, o que precisamos dela e os pedidos que ela deixa. **Como se mantém está em
`docs/planner-notion.md`** — ler antes de lhe mexer, e quando alguém pedir
«atualiza o planner da Damira». Duas regras que se desfazem sem querer: o espaço
Notion tem **um só membro** (todos os outros entram como convidados, senão o plano
deixa de ser grátis), e cada funcionalidade visível ganha **um ponto próprio no
Progresso, com prints**.

Desde outubro de 2026 o `settings.json` também **bloqueia** a ferramenta
`EnterWorktree`, o `git worktree add`, o `git push` para o `main` e a leitura dos
`.env` (exceto o `.env.example`). Esses bloqueios travam a forma como o Claude
escreve os comandos; não são uma barreira de segurança — a barreira a sério é a
proteção do `main` no GitHub.

## A loja online — ler antes de mexer

A partir de outubro de 2026 o site passa a vender: pagamento online, painel do
balcão e da gerente, impressão de talões. **As regras de negócio estão em
`docs/loja/`, um ficheiro por área. Antes de mexer numa área, ler o ficheiro
dela** — e o `pedidos.md`, que é o contrato de que todos dependem.

| Área | Ficheiro |
|---|---|
| **Quem faz o quê, e com quem estás a trabalhar** | `divisao.md` |
| O pedido: estados, referência, dinheiro, cancelamento | `pedidos.md` |
| Calendário, tempos de produção, até quando se cancela | `horarios.md` |
| Stripe: checkout, webhook, reembolsos | `pagamentos.md` |
| Painel: entrada, papéis, sessões | `painel.md` |
| Painel: vista do balcão | `painel-balcao.md` |
| Painel: vista da gerente, produtos | `painel-gerente.md` |
| Talão e impressora | `impressao.md` |
| Bolos personalizados | `bolos-personalizados.md` |
| Concorrência, limites, erros, cache, logs, backups | `robustez.md` |
| **Restaurar a base de dados, passo a passo** | `restauro.md` |
| Base de dados: tabelas, contadores, migração | `base-de-dados.md` |
| **Ligar a Neon: o que falta fazer e confirmar com a conta** | `ligar-a-neon.md` |

### As regras que não se negociam

Cada uma está explicada no ficheiro indicado. Aqui ficam só para não se
esquecerem:

1. **O browser manda ids e quantidades, nunca preços.** O total calcula-se no
   servidor, sempre. (`pedidos.md`)
2. **Dinheiro em cêntimos, inteiros.** Nunca um decimal num valor a cobrar.
3. **Hora de Lisboa, com biblioteca de fusos.** `agora` entra como argumento;
   nunca `getHours()` no servidor — a Vercel está em UTC e o erro só aparece
   em março. (`horarios.md`)
4. **Só o Stripe confirma um pagamento.** `marcarPago` é a única porta, e é
   condicional e idempotente. (`pagamentos.md`)
5. **A última vaga decide-a a base de dados**, com restrições `CHECK` numa
   transação — não o código a ler e depois escrever. (`robustez.md`)
6. **A base de dados dorme.** Nada que corra sozinho (polling, tarefas
   agendadas, monitor) a consulta sem necessidade. (`robustez.md`)
7. **Nunca em cache:** vagas, quantidades, estado de um pedido, checkout,
   `/painel`. (`robustez.md`)
8. **Esconder um botão não é proteger.** Cada acção de gestão verifica o papel
   no servidor. (`painel.md`)
9. **Um pedido pago nunca se perde e nunca se apaga.** (`pedidos.md`)

### O modo de teste — e é um bloqueador de lançamento

Até a casa dar os tempos de produção (o horário da cozinha já deu: das 6h00
às 11h00), até a conta Stripe dela estar verificada e até haver base de
dados, a loja corre no ar em
**modo de teste**. ⚠️ **`LOJA_EM_TESTE=1` é o único interruptor de tudo o que é
provisório** — em local e na Vercel, sem uma segunda variável para ligar
(decidido a 04/10; a lista vive em `src/lib/modo-teste.ts`):

- os **prazos de exemplo** e os **pedidos de exemplo** que enchem o
  calendário (`src/lib/dados/exemplo.ts` — ao acaso mas sempre os mesmos, e
  contam como verdadeiros para as vagas);
- **sem base de dados**, os **pedidos de exemplo no painel** — pagos, entregues,
  um cancelado, um com dinheiro em falta, um que chegou tarde, um duplicado —,
  relativos ao dia de hoje, e o botão **«Simular pedido novo»** no balcão, para
  ouvir o som e ver o alarme do talão sem haver pagamentos;
- **sem base de dados**, a **entrada provisória do painel**, com o PIN `123456`
  e o email da equipa como gerente. ⚠️ Estão escritos no código, num
  repositório público: é a troca aceite para o modo de teste ligar com uma
  variável só, e só há dados de exemplo do outro lado. Sai com a entrada
  verdadeira (#33);
- o Stripe de teste;
- e os avisos que o dizem: **uma faixa no topo de todas as páginas** da loja
  (`src/components/FaixaModoTeste.tsx`) e outra no topo do painel.

⚠️ **Com a base de dados (`DATABASE_URL`), a fonte é sempre ela** (decidido a
05/10, #57). O modo de teste passa a ser uma **camada por cima**
(`comExemplo`, em `exemplo.ts`) que só tapa o que falta nas leituras da loja —
os tempos, a cozinha, o limite por vaga — e junta os pedidos de exemplo ao
calendário. ⚠️ **Nunca grava nada** (só o limite por vaga de exemplo, copiado
para `vagas.limite` ao criar um pedido, e que o primeiro pedido depois do
lançamento substitui), e o painel lê a casa e os produtos **como estão gravados**
(`configuracaoDoPainel`, `produtosDoPainel`): se a gerente
visse a cozinha de exemplo em «Horários», gravava-a como sendo a dela. Os
pedidos de exemplo do painel ficam nos JSON; no ar, testa-se comprando com os
cartões de teste do Stripe. E ⚠️ **a entrada provisória não liga com a base de
dados** — o PIN dela é público, e o painel gravava a sério: até a verdadeira
estar ligada, o painel fica trancado.

⚠️ **A faixa não se apaga** enquanto o interruptor estiver ligado — é ela que
impede o site de afirmar um prazo que a casa não deu. E ⚠️ **desligar o
interruptor faz parte do lançamento** (#55): sem os dados verdadeiros, o
calendário volta a «indisponível», nunca a um prazo inventado, e o painel diz
que a entrada ainda não está ligada. Lê-se no build: mudar o interruptor obriga
a um novo deploy.

### A página de compra — e, até ao Stripe, acaba num email

O cesto leva a **`/encomendas/pedido`** (#37): o resumo com o total do servidor,
o calendário de levantamento (sempre embutido, com dia e hora — sem os dados da
cozinha, as horas são as da loja e a escolhida é **pretendida**, a confirmar) e
os dados da pessoa. O botão do carrinho não aparece nesta página. «Alterar o pedido» abre o cartão
do cesto por cima da compra para editar as quantidades e voltar ao formulário. O formulário que vivia no
fundo das encomendas saiu. ⚠️ **Até ao pagamento online (#38) o pedido acaba num
email à casa**, por secções e com todos os dados (os opcionais vazios
escrevem-se «—»). Desde 25/11 esse email é o **modelo `criado-loja`** (moldura,
logótipo, assunto que começa pelo estado — `src/lib/emails/compra.ts`) com a
marca **`soPorEmail`**: sem ela, o modelo diria «responde-se no painel» e «o
talão sai no balcão», que só são verdade quando o pedido ficar guardado (#126).
Sem hora de levantamento, ou se o modelo falhar, vai o texto simples de antes; com o Stripe, o botão do fim passa a «Pagar» e o resto da
página fica. ⚠️ Os campos são controlados e o envio é feito à mão, sem o
reinício automático do `<form action>` do React 19: um erro do servidor nunca
apaga o que a pessoa escreveu (`robustez.md` › Erros).

### Os emails dos pedidos — emissor (#119, etapa 1)

O emissor de `emails_por_enviar` está em `src/lib/emails/enviar.ts`, com reserva
condicional e idempotência no Resend. **Ainda não está ligado à compra nem às
ações do #139**: esses PRs chamam `enviarDepois()` depois da escrita que grava a
fila, nunca antes da transação terminar. A compra do `main` mantém o percurso
provisório por email. Não se promete entrega de um email só porque entrou na fila.
Fora de produção, `EMAILS_SO_PARA` é obrigatória; sem ela não há envios nem consultas
do emissor. Não há polling, cron nem despertadores nesta etapa.

### A documentação muda no mesmo PR que o código

Se um PR faz o código contradizer um ficheiro de `docs/loja/` ou uma secção deste
`AGENTS.md`, **o mesmo PR corrige o texto**. Uma regra escrita que o código já não
cumpre é pior do que nenhuma: o próximo Claude lê-a e desfaz o que está certo.

Secções deste ficheiro que a loja vai tornar falsas, e que se reescrevem no PR
que as torna falsas:

- **«O modelo de dados — quatro ficheiros»** — no PR que passa o catálogo para a
  base de dados.
- **«A conta de cliente», regras 2 e 3** — no PR que liga as chaves e no que
  passa o histórico para o servidor.
- ~~O `vegan: true` só na carta vegan e os mínimos por categoria em
  `encomendavel.ts`~~ — reescritas no PR da edição de produtos (#40, no #66).

### Base de dados

- Neon, com o driver HTTP (`@neondatabase/serverless`), e Drizzle como ORM —
  proposto em `docs/loja/base-de-dados.md`, fecha-se na revisão da #27. O
  esquema inteiro, e porquê, está lá.
- Tabelas e colunas em português, `snake_case` (`pedidos`, `linhas_pedido`);
  no TypeScript, `camelCase`.
- **Alterações ao esquema vão num PR só para isso.** Nunca uma migração escondida
  dentro de uma funcionalidade.
- Desenvolvimento e produção são bases diferentes (ramos da Neon). Nunca testar
  contra a de produção — com uma exceção: o site no ar em modo de teste, até ao
  lançamento, compra com cartões de teste contra ela (`pagamentos.md` ›
  Ambientes). Os pedidos que isso deixa lá saem das contas no lançamento.

### Revisão

**Obrigatória do outro** só em três áreas — pagamentos, base de dados e a
fronteira `src/lib/dados/` — e o GitHub impõe-na pelo `.github/CODEOWNERS`. Tudo
o resto: merge pelo próprio, depois de `lint`, `build` e `test`.

Antes de abrir qualquer PR, revê o diff com o Claude. Não substitui a revisão do
outro onde ela é obrigatória; apanha o básico onde não é.

### O repositório é público

- Nunca `.env`, chaves ou segredos — nem em comentários, nem em exemplos.
- Nunca dados reais de clientes, nem em dados de teste.
- Nunca valores do contrato, preços do nosso trabalho ou contactos da casa
  para além dos que estão no site.

## Antes de dizer que algo está pronto

Correr **os três**:

```bash
npm run lint
npm run build
npm test
```

O `build` é o que valida o `src/data/*.json` (via `zod`) e o que apanha erros de
tipos — o `lint` sozinho deixa passar os dois. Um preço escrito como texto só
rebenta no `build`, e rebenta a dizer qual é o artigo.

O `npm test` (Vitest) chegou com o motor de horários e corre de propósito num
fuso que não é Lisboa nem UTC (`vitest.config.mts`): é a forma de um
`getHours()` esquecido rebentar no teste e não em março, em produção.

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

Há ainda `marca.json` (nome e redes, fonte única do cabeçalho e do rodapé) e
`redes.json` (os *reels*): auxiliares, não fazem parte desta divisão.

**A encomenda e a carta vivem juntas.** Havia aqui uma regra para não
juntar a encomenda à ementa; saiu com a `/ementa` (#123, decisão de 12/11). A
carta — o que se pede ao balcão, um croissant, um pão com manteiga — **continua
a chamar-se «Carta»** (decidido a 25/11: a troca para «Dia a dia» de 15/11 foi
desfeita), e o que dela se encomenda vive na `/encomendas`, na secção
**«Da carta»**: 70 dos 95 artigos.

**Na `/encomendas`, todos os produtos têm o mesmo cartão e a mesma grelha**
(`GRELHA_CARTOES`, em `vista.ts`) — kits, bolos, boxes e carta —, **todos por
ordem alfabética** (`porOrdemAlfabetica`), e há uma pesquisa por cima deles
(`PesquisaProdutos`). Decidido a 25/11. A lista de produtos do painel segue a
mesma ordem; só as categorias da carta seguem a ordem da gerente (#87). Os dois ficheiros continuam separados
(`ementa.json` e `encomendas.json`) até o catálogo passar a categorias (#124).

O que evita alguém aparecer ao sábado à espera de levar um kit debaixo do braço
não é separá-los: é a **quantidade mínima**, escrita no cabeçalho de cada
categoria. Um artigo que só se
pede à dúzia, ou ao quilo, nunca se confunde com um que se tira da vitrine — e
quem quer um pastel continua a entrar na loja e a pedi-lo.

**O mínimo é do produto**, desde outubro de 2026 (#40): `quantidadeMinima` e
`multiplo` na `FonteDeDados`, e a gerente muda-os no painel, que é o que ela
percebe quando abre um artigo. A tabela por categoria de `src/lib/encomendavel.ts`
**só preenche o JSON** até à migração — é de onde a migração tira os 70 mínimos,
para ninguém os ter de escrever. As bebidas, os pratos e a pausa continuam de
fora (`aVendaOnline: false`): não se encomenda um galão para sexta-feira.

### A ementa tem `carta` além de `categoria`

Porque as categorias **repetem-se entre cartas**: há `doces` na carta da casa e
`doces` na vegan, `salgados` nas duas. Na `/ementa`, que saiu a 12/11, a âncora
de uma secção era por isso `{carta}-{categoria}` e não só a categoria — duas
âncoras iguais deixavam uma delas inalcançável, sem aviso nenhum. Na «Da carta» é
o título colado que leva a carta à frente («Vegan, Doces»). Revê-se com
as categorias da gerente (#124).

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

⚠️ **O vegan marca-o a casa, nunca o site.** Desde a edição de produtos (#40) a
gerente marca «vegan» em qualquer artigo, e por isso saiu a regra que recusava
`vegan: true` fora da carta vegan. Fica a do outro sentido — tudo o que está na
carta vegan é vegan —, que continua a ser verdade no JSON. O que **não** muda:
deduzi-lo ("não tem carne, logo é vegan") era pôr o site a garantir uma coisa
que a casa não garantiu.

## Fotografia

As imagens da página inicial vêm da Damira. A remessa «Conteúdo Site», de
26/11/2026, trouxe duas fotografias de capa, novas imagens de pão e de
decoração de um bolo e o álbum da vitrine. A capa alterna entre a fachada e
a montra a cada cinco segundos. Com a preferência de movimento reduzido,
mostra a fachada. As imagens de Natal vêm juntas no fim da vitrine, depois de
«Ver mais». A galeria abre com seis fotografias (#80).

As fotografias são servidas em WebP. As da vitrine ficam em
`public/vitrine/`, as dos capítulos em `public/fotos/`. Os originais não são
versionados e pedem-se ao DevPlus. A fotografia antiga `public/vitrine/09.webp`
mostra dois clientes reconhecíveis e saiu da galeria quando entrou a nova remessa.

**Não usar fotografias de banco de imagens.** Uma fotografia do produto, ao
lado de um preço, é uma promessa sobre o que a casa serve.

O campo `artigo.foto` do `ementa.json` continua a `null` nos 95: há fotografia
da casa, não há fotografia **por artigo**.

## A marca

O cabeçalho usa `public/marca/damira-horizontal.png` e o rodapé usa
`public/marca/damira-branco.png`, entregues pela Damira em novembro de 2026.

Os ficheiros usados pela `Marca` nos restantes sítios e o motivo das ondas
saem do PDF do menu de almoço:

```bash
npm run marca    # public/marca/{logotipo,logotipo-assinado,ondas}.png
npm run icons    # favicon + ícones, a partir de public/marca/ondas.png
```

Os PNG extraídos do menu são rasterizados a 300 dpi. Uma atualização geral
da marca revê os PNG do cabeçalho e do rodapé, o componente
`src/components/Marca.tsx`, os ícones (`npm run icons`) e o logótipo que os
emails levam embutido (`npm run marca:email`, em `src/lib/emails/logotipo.ts`).

Os PNG extraídos para a `Marca` são máscaras de alfa. Guardam a forma e usam
a cor do texto em CSS.

**O site público usa Caros** nos títulos e no corpo, via `next/font/local` em
`src/app/[locale]/layout.tsx`. O painel usa Bricolage Grotesque e Instrument
Sans, declaradas em `src/lib/fontes.ts`.

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

**A única exceção é o calendário de levantamento** (pedido do cliente a 04/10):
a afluência pinta-se em semáforo, verde → amarelo → laranja → vermelho. O verde
de lá é **outro** — frio, azulado (`--color-afluencia-livre`), que não se
confunde com o verde-oliva da folha —, vai sempre com a palavra escrita ao lado,
e não sai do calendário.

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

Desde outubro de 2026 as páginas leem o catálogo de **`src/lib/dados/`**, e
cartões, rotas e `sitemap.xml` saem todos de lá (ver `docs/loja/divisao.md`). O
`src/lib/produtos.ts` continua a existir, mas **só o `src/lib/dados/json.ts` o
lê**: é uma das fontes da implementação provisória, e sai quando a base de dados
a substituir. ⚠️ **Nenhuma página nem componente importa `@/data/ementa`,
`@/data/encomendas`, `produtos.ts` ou `encomendavel.ts`** — o `index.ts` da
fronteira é `server-only`, e os componentes de cliente recebem os dados por
props. Um import direto voltava a meter o JSON no bundle do browser. As funções
de apresentação, sem dados, estão em `src/lib/vista.ts`.

⚠️ **As fotografias dos produtos estão vazias em todos, e não se preenchem com o
que há.**
As fotografias da página inicial mostram a casa, a montra e a pastelaria.
Numa página de produto qualquer imagem se lê como sendo o produto: pôr ali a
montra vista da rua é anunciar uma coisa e entregar outra, e é a mesma regra que
proíbe banco de imagens no resto do site. O `FotoProduto` guarda o espaço e diz
que a fotografia está por chegar.

⚠️ **A `/ementa` saiu a 12/11 (#123)**, com as 95 páginas `/ementa/<id>` e o
painel que levava lá. O site fica com a página inicial e as encomendas. Saíram
também do `sitemap.xml`, das `ROTAS_FIXAS` e de todos os links — o cabeçalho, o
rodapé, a folha de rosto e o capítulo do vegan, que agora levam a
`/encomendas#da-ementa`. ⚠️ **Antes de pôr um link para `/ementa` em lado
nenhum, a página tem de voltar a existir**: um link esquecido é um 404 no menu.

**Os artigos da carta não têm página.** O cartão (`CartaoArtigo`) é tudo:
nome, preço e o botão compacto, **com a quantidade mínima no cabeçalho da
categoria**. Um artigo com variantes (o chocolate do Dubai, quatro pesos) tem
**um botão por variante** no próprio cartão — antes mandava para a página do
artigo, onde estavam os quatro. O que não se encomenda (`aVendaOnline: false`:
as bebidas, os pratos, a pausa) não chega à `/encomendas` e não ganha botão em
lado nenhum: um galão com um botão de encomendar era prometer um serviço que a
casa não tem.

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
email — e uma referência que não refere o mesmo não serve para nada. O dia que
leva é o **de Lisboa** (lia o de UTC, e entre a meia-noite e a uma de verão
saía com o dia anterior).

⚠️ **O resumo do cesto que vai no email também é escrito no servidor**, desde
outubro de 2026. O browser manda as `linhas` — ids e quantidades, sem preços — e
a acção refaz o cesto a partir do catálogo (`src/lib/pedido-servidor.ts`). Antes
o texto chegava escrito pelo browser, com os preços do `localStorage`, e quem os
mudasse mudava o total do email. O `precoCent` que o cesto guarda é só para
mostrar.

E uma consequência que não é óbvia: **a sessão lê-se no cliente e não no
servidor**, para as páginas continuarem todas estáticas. Ler `auth()` num
componente de servidor troca o cartaz da página inicial — que vive de ser servido
instantaneamente — por um nome no canto superior direito.

⚠️ **O cesto e o histórico vivem no layout e não na página das encomendas.** A
conta precisa de os ler, e um provedor montado só em `/encomendas` deixava-a a
olhar para `null`. Desde outubro de 2026 a interface também está em todas as
páginas: o cesto é um **botão no canto que se troca com o «Encomendas»** (com o
cesto vazio, «Encomendas»; com alguma coisa dentro, o carrinho — nunca os
dois), e abre um cartão centrado com o que se escolheu. Ver `Cesto.tsx`.

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
   deste site, e foi a razão de a âncora da `/ementa` ser `{carta}-{categoria}`.
   A página saiu (#123), e com ela o `SeccaoEmenta.tsx`; na «Da carta» a
   categoria não tem âncora, e o título colado leva o nome da carta à frente
   («Vegan, Doces») pela mesma razão. Volta a morder no dia em que alguém der
   um `id` a uma categoria, ou em que duas categorias puderem ter o mesmo nome.
9. **`background: currentColor` resolve para a cor do *próprio* elemento.** Uma
   pastilha com `background: currentColor` e `color: transparent` fica
   transparente, não fica da cor herdada. Declarar as duas cores.
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
    cima da barra. **E voltou a morder em outubro:** com a barra em todas as
    páginas, na ementa (que entretanto saiu) o «Encomendas» ficava por baixo
    dela. A barra saiu, e os
    dois botões passaram a ocupar o mesmo canto e a trocar-se — dois elementos
    fixos no mesmo sítio só não se tapam se um souber do outro.
18. **Uma fotografia quadrada num cartão é a mais alta que há, não a mais
    pequena.** A altura de uma imagem quadrada **é** a largura da coluna; a 3/2
    gasta dois terços disso. Numa grelha de setenta cartões a diferença foram
    2 300 px de página — a secção passou de 7 075 px para 4 788 px sem se mexer
    numa única coluna. Ao encolher um cartão, olhar primeiro para a proporção da
    imagem e só depois para os `padding`.
19. **Uma secção vazia continua a ocupar o ecrã.** A `<section>` do histórico
    era escrita no servidor, à volta de uma lista que devolve `null` quando não
    há pedidos — o fundo e o `padding` ficavam lá na mesma. No telemóvel eram
    **duzentos e cinquenta píxeis de nada** entre o herói e o primeiro produto,
    para toda a gente que chegava pela primeira vez. Quem decide se há conteúdo
    tem de ser quem desenha a moldura.
20. **`getBoundingClientRect` não vê a área de toque do `.alvo-toque`.** A classe
    estende o alvo com um `::after` de `-0.75rem`, e uma verificação automática
    de alvos pequenos acusa **todos** os links do site sem razão. Ao medir alvos,
    excluir quem tem a classe — senão o ruído esconde os que faltam mesmo, que
    aqui eram os nomes dos setenta artigos e os dois links de voltar.
21. **E volta a partir depois de alguém entrar na conta.** A pastilha do nome é
    mais larga do que o botão de entrar, portanto a medição feita sem sessão dá
    verde e a página parte-se só para quem se autenticou. **Medir as duas
    versões do cabeçalho.** Para forjar uma sessão em local, ver a nota do
    `usePorPessoa` e usar o `encode` do `@auth/core/jwt` com o `AUTH_SECRET` e o
    sal `authjs.session-token`.
22. **O `id` de uma âncora nunca vai num elemento `position: sticky`.** Saltar
    para um elemento fixo leva ao sítio onde ele **está preso agora** — que,
    depois de se ter rolado por ele, é o fim da secção e não o princípio. Desde
    os títulos fixos da `/encomendas` (#85) os `id` vivem nas `<section>`, e o
    `id` do `aria-labelledby` (`da-ementa-titulo`) vive num `<h2>` à parte,
    fora do título que fica preso (ver a 23).
23. **Um título dentro de um `<summary>` sai da lista de títulos.** É marcação
    válida, mas os browsers expõem o `<summary>` como botão, e o que está dentro
    de um botão passa a texto dele: no VoiceOver e no NVDA, as quatro secções
    da `/encomendas` desapareciam da navegação por títulos. O `<h2>` vai antes
    do `<details>`, só para leitores de ecrã (`TituloParaLeitores`), e o
    `<summary>` mostra o mesmo texto num `<span>`.
24. **O browser não conta o `scroll-margin-top` para decidir se rola até ao
    foco.** Usa-o para saber até onde rolar, mas para decidir se é preciso só
    desconta o `scroll-padding-top` do documento: um cartão a 9 rem do topo
    está «à vista» para ele e por baixo de dois títulos fixos para quem olha.
    Com títulos colados que somam mais do que a folga do documento, quem
    garante o foco à vista é JavaScript (o `focusin` do `SeccoesMinimizaveis`),
    e mede-se com `Shift+Tab` a subir por uma grelha inteira, não com um clique.

O que todas têm em comum: `npm run build` passa, o `lint` passa, e só se apanham
a olhar. **Depois de mexer em desenho, tirar capturas** — com o Chromium do
Playwright (`npx playwright install chromium`, uma vez por máquina; fica na
cache do Playwright do utilizador, que muda com o sistema).

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Confeitaria Damira

Site da Confeitaria Damira — pastelaria, padaria e cozinha em Ermesinde, aberta
desde 1996. Next.js 16 (App Router), `next-intl` em português e inglês, Tailwind
v4, conteúdo em ficheiros JSON validados por `zod`. Sem base de dados e sem CMS.

Nasceu de um *fork* do [Santo Burga](https://github.com/DEVV-TGR/SantoBurga): a
infraestrutura é a mesma, o conteúdo e o modelo de dados não. As decisões que
mudaram estão explicadas nos comentários do código e no [AGENTS.md](AGENTS.md).

## Arrancar

```bash
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento em `localhost:3000` |
| `npm run build` | build de produção — **valida os JSON e os tipos** |
| `npm run lint` | ESLint |
| `npm run marca` | extrai logótipo e ondas do PDF para `public/marca/` |
| `npm run icons` | gera favicon e ícones a partir de `public/marca/ondas.png` |
| `npm run fotos -- <origem> <destino>` | importa fotografias: 1600 px, WebP |

Antes de dar trabalho por pronto, correr **`npm run lint` e `npm run build`** —
o `build` é o único que valida o conteúdo.

## As páginas

| Rota | O que é |
|---|---|
| `/` | homepage — herói, combinações, carta vegan, festas, contactos, fecho |
| `/ementa` | as quatro cartas, 95 artigos, com painel de detalhe por artigo |
| `/encomendas` | kits de festa, kits de bolo, bolo por medida, boxes, **70 artigos da carta por encomenda**, como pedir |
| `/entrar` | entrar com o Google ou o Facebook — **só existe com chaves configuradas** |
| `/conta` | quem entrou, e o que a conta faz (e não faz) — idem |

Em inglês, as mesmas com prefixo `/en`. O português não leva prefixo
(`localePrefix: "as-needed"`).

## A conta de cliente

A conta existe sempre, em **dois modos** que nunca coexistem (ver
`src/lib/conta.ts`):

| Modo | Quando | O que é |
|---|---|---|
| `fornecedores` | há `AUTH_SECRET` e chaves | entra-se com o Google ou o Facebook, sessão em JWT num cookie |
| `demonstracao` | não há chaves | escreve-se nome e email, e fica **só neste browser** |

⚠️ **O modo de demonstração é um bloqueador de lançamento.** No dia em que o site
for para o ar, ou entram chaves — e o modo muda sozinho — **ou a conta sai**.
Publicar uma pastelaria com um ecrã de entrada que não autentica ninguém é pior
do que não ter conta nenhuma.

O que o impede de ser uma mentira é **dizer o que é, onde alguém escreve os seus
dados**: a página de entrada, em demonstração, avisa que não há registo nem
palavra-passe e que aquilo fica no browser. A página da conta repete-o, para quem
lá chega por um link.

⚠️ E a regra que não se negoceia: **a conta nunca é obrigatória para
encomendar.** Serve para o pedido vir já preenchido e para o cesto não se
misturar com o de outra pessoa no mesmo telemóvel.

### O histórico de pedidos

Cada pedido leva uma **referência** (`DAM-0309-4F7K`), gerada no servidor, que vai
no assunto do email e serve para falar ao telefone. O pedido fica guardado numa
lista que aparece na conta **e** no topo de `/encomendas`, com um botão para
*pedir o mesmo*.

⚠️ **É o histórico deste browser, não o histórico da casa** — e o site diz isso
por cima da lista, sempre. Não há base de dados: a sessão é um JWT num cookie e
nada nosso guarda o que foi pedido. Quem encomendou no telemóvel não vê esse
pedido no computador, e limpar os dados do site apaga a lista.

**Chamar-lhe «as suas encomendas» sem essa ressalva era mentir com uma
funcionalidade**: quem não encontra lá o pedido conclui que ele se perdeu. Um
histórico partilhado entre dispositivos exige base de dados e adaptador de
sessão — é âmbito novo, com custo, e está na #1.

Um pedido que ficou por enviar (sem serviço de email configurado, o pedido volta
para a pessoa o mandar do seu correio) fica marcado **por enviar**, para não se
esquecer.

⚠️ **As chaves são lidas no `build`**, porque as páginas são estáticas. Ligar a
conta obriga a um novo *deploy*. Configuração e URIs de redirecionamento em
`.env.example`.

## Onde vive o conteúdo

Tudo em `src/data/`, e **acrescentar um artigo ou mudar um preço é editar um
JSON e mais nada**:

- **`ementa.json`** — 95 artigos com preço, repartidos por quatro cartas (`casa`,
  `fim-de-semana`, `vegan`, `chocolate`). O esquema está em `ementa.ts`.
- **`encomendas.json`** — 3 kits de festa × 3 escalões, 3 kits de bolo, 5 boxes.
- **`bolos.json`** — o catálogo do bolo por medida: 62 opções na linha clássica,
  37 na vegan. **Sem preços**, porque o impresso não os tem.
- **`casa.json`** — morada, telefone, correio, horário, entregas.

E uma regra que **não** é dado e por isso vive em código, em
`src/lib/encomendavel.ts`: **que artigos da ementa se podem encomendar e em que
quantidade mínima.** Hoje são 70 dos 95 — doces e salgados à dúzia (de 6 em 6),
bolos inteiros ao quilo (de meio em meio), o chocolate à unidade. As bebidas, os
pratos e a pausa ficam de fora: não se encomenda um galão para sexta-feira.
- **`marca.json`** — nome e redes sociais.

As fontes de tudo isto são os sete PDFs em `referencias/`, que **não estão
versionados** (13 MB de artes finais do cliente). Pedi-los à Damira ou ao
DevPlus antes de mexer em preços.

## Antes de publicar

O site está tecnicamente pronto e **não deve ir para o ar como está**. Falta
informação que só a casa tem, e cada linha desta lista é uma coisa que, em
falta, faz o site mentir a alguém:

### Bloqueadores

- [ ] **Mudar o destino dos pedidos.** O formulário de encomendas manda hoje
      para `support@devplus.pt` — a agência, não a casa. É de propósito enquanto
      isto é uma demonstração, e é **a primeira coisa a mudar no dia do
      lançamento**: um site publicado a mandar as encomendas para quem o
      construiu é uma casa a perder trabalho sem dar por isso. Muda-se com a
      variável `EMAIL_PEDIDOS`.
- [ ] **Chave do serviço de email (`RESEND_API_KEY`) e domínio verificado.** Sem
      ela o formulário não se parte — devolve o pedido escrito para a pessoa o
      enviar do seu correio —, mas cada pedido passa a depender de ela carregar
      em enviar uma segunda vez.
- [ ] **Política de privacidade.** O formulário recolhe nome, email, telefone e
      uma data, e pede consentimento explícito para os tratar. Falta a página
      que diz durante quanto tempo se guardam e como se pede a eliminação.
- [ ] **Prazo de antecedência das encomendas.** Quantos dias precisa a casa para
      um kit de 20, de 40 e de 70? Sem isto, `/encomendas` diz "por confirmar" —
      e alguém vai pedir setenta doses para amanhã.
- [ ] **Horário, dia a dia.** Temos "07h00–21h00" do cartão de contactos, sem
      dizer a que dias se aplica. O domingo é o candidato a ser diferente. Isto
      vai para os dados estruturados e passa a ser o horário que o Google mostra.
- [ ] **Consentimento das pessoas na fotografia da sala.** `public/fotos/04.webp`
      mostra clientes de frente e reconhecíveis. É a única imagem do site com
      pessoas identificáveis. Numa demo passa; **no ar a sério, ou a casa tem o
      consentimento delas, ou a imagem sai.**
- [ ] **A fotografia da fachada, em ficheiro.** É a capa do Facebook da casa — a
      montra vista da rua, com a placa, o letreiro "Pão Quente" e o *Histórias
      com sabor* no vidro. É a imagem certa para o herói e não a temos: no
      Facebook é servida por um endereço assinado que não se guarda. Pedir o
      original à casa; entra como `/fotos/06.webp` e é uma linha em `Hero.tsx`.
- [ ] **Qual é o logótipo oficial.** Há dois em circulação: o sans-serif com
      "desde 1996" (nos impressos, na placa, no avatar do Facebook — é o que o
      site usa) e um **serifado a vermelho `#891C1F`** com "pão quente ·
      confeitaria", que a casa publicou no TripAdvisor em 2019. O segundo parece
      antigo, mas ninguém confirmou. E os dois vermelhos não coincidem: o dos
      impressos é `#923D38`.
- [ ] **Sessão fotográfica.** O que existe são cinco imagens recuperadas do
      TripAdvisor, a maior com 1440 px de lado — chega para cartões, não chega
      para um herói a sangrar. É preciso: montra, interior, três ou quatro
      pratos, um kit de festa montado. Ver o AGENTS.md.
- [ ] **A carta de almoço de segunda a sexta.** A fotografia da sala mostra
      serviço de mesa a meio da semana, e a ementa do site só tem pratos ao
      sábado e domingo — foi o que o impresso disse. Falta o impresso do dia.
- [ ] **Confirmar os preços** das cartas de 2025/2026 contra o que está hoje ao
      balcão.

### Erros encontrados nos impressos

- [ ] **Kit Premium 40 pax diz "Tarteletes — 200 unidades".** O de 20 tem 10 e o
      de 70 tem 25. É quase de certeza 20. Está transcrito como está no PDF, à
      espera de confirmação.
- [ ] **Escalões do Kit Premium.** O de 20 pax (335 €) fica 35 € acima do Médio
      (300 €), mas o de 40 salta de 590 € para 650 €. Confirmar que é mesmo assim.

- [ ] ⚠️ **A conta está em modo de demonstração.** Sem chaves, o ecrã de entrada
      aceita qualquer nome e email e guarda-os no browser. É de propósito, para o
      cliente ver a funcionalidade — e **não pode ir para o ar assim**. Ou entram
      as chaves do Google/Facebook (`.env.example`), ou a conta sai.

### A pedir ao cliente

- [ ] **Logótipo em vetor** (SVG ou AI). O que temos é rasterizado de um PDF.
- [ ] **As fontes verdadeiras** da marca.
- [ ] **Redes sociais** — Instagram, Facebook, TikTok. `marca.json` está a `null`
      e o bloco do rodapé nem aparece.
- [ ] **Alergénios**, artigo a artigo. Não se inventam.
- [ ] **Uber Eats e Glovo**, se existirem. Só o Bolt Food está confirmado.
- [ ] **Domínio.** `NEXT_PUBLIC_SITE_URL` aponta hoje para um subdomínio de
      demonstração da Vercel.

### Conformidade legal (Portugal)

- [ ] **Livro de Reclamações eletrónico** — link obrigatório no rodapé.
- [ ] **Política de privacidade e cookies.** Hoje o site não põe cookies próprios;
      o `@vercel/analytics` tem de ser verificado à luz do RGPD.
- [ ] **Dados da empresa** — denominação social, NIF, morada da sede.

## O que já está feito

- Paleta medida dos impressos, com tabela de contraste verificada por script.
- Logótipo e motivo gráfico extraídos do PDF, como máscaras de alfa.
- As quatro cartas, os 95 artigos e as encomendas todas transcritas e validadas.
- Português e inglês completos, com `hreflang` e canonicals.
- `schema.org/Bakery` com morada, horário e menu.
- Sitemap e `robots.txt` gerados a partir das rotas reais.

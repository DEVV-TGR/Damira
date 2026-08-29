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
| `/encomendas` | kits de festa, kits de bolo, bolo por medida, boxes, como pedir |

Em inglês, as mesmas com prefixo `/en`. O português não leva prefixo
(`localePrefix: "as-needed"`).

## Onde vive o conteúdo

Tudo em `src/data/`, e **acrescentar um artigo ou mudar um preço é editar um
JSON e mais nada**:

- **`ementa.json`** — 95 artigos com preço, repartidos por quatro cartas (`casa`,
  `fim-de-semana`, `vegan`, `chocolate`). O esquema está em `ementa.ts`.
- **`encomendas.json`** — 3 kits de festa × 3 escalões, 3 kits de bolo, 5 boxes.
- **`bolos.json`** — o catálogo do bolo por medida: 62 opções na linha clássica,
  37 na vegan. **Sem preços**, porque o impresso não os tem.
- **`casa.json`** — morada, telefone, correio, horário, entregas.
- **`marca.json`** — nome e redes sociais.

As fontes de tudo isto são os sete PDFs em `referencias/`, que **não estão
versionados** (13 MB de artes finais do cliente). Pedi-los à Damira ou ao
DevPlus antes de mexer em preços.

## Antes de publicar

O site está tecnicamente pronto e **não deve ir para o ar como está**. Falta
informação que só a casa tem, e cada linha desta lista é uma coisa que, em
falta, faz o site mentir a alguém:

### Bloqueadores

- [ ] **Prazo de antecedência das encomendas.** Quantos dias precisa a casa para
      um kit de 20, de 40 e de 70? Sem isto, `/encomendas` diz "por confirmar" —
      e alguém vai pedir setenta doses para amanhã.
- [ ] **Horário, dia a dia.** Temos "07h00–21h00" do cartão de contactos, sem
      dizer a que dias se aplica. O domingo é o candidato a ser diferente. Isto
      vai para os dados estruturados e passa a ser o horário que o Google mostra.
- [ ] **Fotografia.** Não há nenhuma utilizável (ver o AGENTS.md). É preciso uma
      sessão: montra, interior, três ou quatro pratos, um kit de festa montado.
- [ ] **Confirmar os preços** das cartas de 2025/2026 contra o que está hoje ao
      balcão.

### Erros encontrados nos impressos

- [ ] **Kit Premium 40 pax diz "Tarteletes — 200 unidades".** O de 20 tem 10 e o
      de 70 tem 25. É quase de certeza 20. Está transcrito como está no PDF, à
      espera de confirmação.
- [ ] **Escalões do Kit Premium.** O de 20 pax (335 €) fica 35 € acima do Médio
      (300 €), mas o de 40 salta de 590 € para 650 €. Confirmar que é mesmo assim.

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

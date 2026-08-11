# Santo Burga

Next.js 16 · React 19 · TypeScript · Tailwind v4 · next-intl (PT/EN)

Site das duas casas do Santo Burga — Porto e Leça da Palmeira — com a carta
completa, em português e inglês.

## ⚠️ Antes de publicar

O site está tecnicamente pronto. **O que falta são dados que só o cliente tem.**
Por ordem de gravidade:

- [ ] **Confirmar os preços todos.** A carta foi transcrita do
      `referencias/Santo-burga_MENU_2024_PT.pdf`, datado de **18 de fevereiro de
      2024**. São dois anos e meio, e um preço errado no site é uma discussão ao
      balcão com o cliente à frente. É o bloqueador maior.
- [ ] **Telefones das duas casas.** Estão a `null` e a linha não aparece. As
      fontes públicas não concordam — ver a tabela abaixo.
- [ ] **Horários das duas casas.** Idem. Enquanto forem `null`, o site diz
      "horário por confirmar" em vez de mandar alguém a uma porta fechada.
- [ ] **Alergénios.** `alergenios: []` nos 122 artigos. Preencher com a cozinha —
      **não deduzir das descrições**. Até lá o site mostra o aviso de que a
      informação está disponível no restaurante, que é o que a lei exige.
- [ ] **Fotografias das duas casas.** Ver *"As fotografias"*, abaixo.
- [ ] **Logótipo em vetor.** Só existe rasterizado no PDF. Quando chegar, trocar
      `src/components/Marca.tsx` **e** correr `npm run icons`, ao mesmo tempo.
- [ ] **`NEXT_PUBLIC_SITE_URL`** e *redeploy*, para o `sitemap.xml`, o
      `robots.txt` e as imagens de partilha saírem com o domínio certo.
- [ ] **Rever a indexação.** O `robots.txt` deixa indexar tudo. Se o primeiro
      *deploy* for para um domínio de demonstração, é a demonstração que o Google
      indexa.
- [ ] **Decidir o que fazer ao *Don Perro by Santo Burga*.** Aparece nas duas
      páginas do menu impresso, com Instagram próprio
      (`@donperrobysantoburga`), e não se percebe se é carta de cachorros, marca
      irmã ou negócio separado. **Ficou de fora do site** até haver resposta.

### O domínio `santoburga.pt` caducou

Está indexado no Google mas **não tem registo A nem NS** — não resolve. Confirmar
com o cliente se ainda o controla: é o candidato natural a
`NEXT_PUBLIC_SITE_URL`, e se tiver ficado livre convém reavê-lo antes que outra
pessoa o apanhe.

### O que as fontes públicas dizem (e onde discordam)

Recolhido do TripAdvisor, Foursquare, lifecooler, Uber Eats e das páginas
`*.eatbu.com` do próprio negócio. **A morada bate certo em todas; o resto não.**

| | Porto | Leça da Palmeira |
|---|---|---|
| Morada | Rua Egas Moniz 490 ✅ | Rua Helena Vieira da Silva 52 ✅ |
| Código postal | `4050-237` ou `4050-232` ❓ | `4450-590` ✅ |
| Telefone | `220 738 874` ou `917 164 625` ❓ | `917 164 625` ❓ |
| Horário | `12:00–00:00, seg. fechado` ou `ter.–dom. 12:30–23:30` ❓ | `ter.–dom. 12:00–24:00` ou `ter.–dom. 10:00–23:00, sex.–sáb. até 00:00` ❓ |

Só entrou no site o que tem ✅. O `917 164 625` aparece como número das **duas**
casas na mesma fonte, o que cheira a cópia do modelo — daí não ter entrado em
nenhuma.

### As fotografias

`fotos: []` nas duas casas, e o bloco mostra "Fotografias por publicar".

Foram tentadas as páginas `santoburgaporto.eatbu.com` e
`santoburgaleca.eatbu.com`, que são geridas pelo próprio negócio. **Não servem**,
por três razões: a maior parte das imagens é a mesma nas duas páginas (são fotos
de marca, não da casa), mostram uma decoração e uma carta que já não existem — a
ardósia tem *Santa Serra* e *Dois Santos*, que não estão no menu de 2024 — e
trazem as setas do carrossel queimadas na imagem.

O Instagram tem fotografias actuais das duas casas, e são do cliente. **Pedir os
originais.** Depois é largá-los em `public/casas/porto/` e `public/casas/leca/`
e listá-los em `src/data/restaurantes.json`; a primeira é a capa do bloco.

Escolher pelo menos uma por casa que **diga qual é qual** num relance — Leça tem
a esplanada à beira-mar com o mobiliário turquesa, o Porto é sala interior. É
para isso que a secção existe.

## Correr localmente

```bash
npm install
cp .env.example .env.local   # opcional em desenvolvimento
npm run dev                  # http://localhost:3000
```

Antes de dar trabalho por terminado:

```bash
npm run lint
npm run build
```

O `build` é o que valida os JSON de `src/data/` e apanha erros de tipos — o
`lint` sozinho deixa passar os dois.

## Mexer na ementa

Tudo se faz em **`src/data/ementa.json`**. Não é preciso tocar em código: a
página `/ementa`, a navegação por secções e os destaques da homepage saem todos
daí.

Se algum campo ficar mal escrito, o `npm run build` falha **a dizer o nome do
artigo e o campo**:

```
src/data/ementa.json inválido:
  ✖ [17] "São Julião" → preco: Invalid input: expected number, received string
```

### Um artigo

```jsonc
{
  "id": "sao-juliao",              // minúsculas e hífenes. É a âncora do URL. Único.
  "nome": "São Julião",            // como está no impresso. NÃO se traduz.
  "categoria": "santos-novilho",   // ver a lista abaixo
  "preco": 11.85,                  // euros, ponto decimal, sem símbolo
  "paes": ["rosa"],                // [] normal · ["rosa"] · ["azul"] · ["rosa","azul"]
  "bestSeller": true,              // o selo do impresso
  "vegetariano": false,            // só o que o impresso afirma
  "descricao": {
    "pt": "180g de novilho, recheado com…",
    "en": "180g beef stuffed with…"
  }
}
```

Tudo o que não for `id`, `nome`, `categoria` e `preco` pode ficar de fora — o
valor por defeito é "não tem".

**As categorias**, pela ordem em que saem na página: `aperitivos`, `entradas`,
`santos-novilho`, `carnes-maturadas`, `para-os-corajosos`, `santos-frango`,
`outros-santos`, `vegetariano-saladas`, `menu-infantil`, `sobremesas`, `extras`,
`bebidas`. Mudar a ordem das secções é mudar a ordem da lista `CATEGORIAS` em
`src/data/ementa.ts`.

**As bebidas levam `subcategoria`** (`sangrias`, `limonadas`, `refrigerantes`,
`aguas`, `cidras`, `cerveja`, `vinhos`, `licores`, `whiskeys`, `aguardentes`,
`quentes`) — são 47 e sem isso saíam numa lista corrida do café à sangria.

**Extras, bebidas e aperitivos não levam descrição**, porque no impresso são
listas de nome e preço. Levam em vez disso `nomeEn`, porque aí o nome é texto
comum ("Cebola frita" → "Fried onion") e não um santo. O contrário também dá
erro: pôr `nomeEn` num santo rebenta o `build`.

### Dois preços no mesmo artigo

Os *Rollinis* são 4,75 € e os *Rollinis à la Chef* 5,40 €, com a mesma descrição:

```jsonc
"preco": 4.75,
"variantes": [{ "chave": "a-la-chef", "preco": 5.4 }]
```

A `chave` é uma chave de tradução — acrescentar uma nova obriga a acrescentá-la
em `messages/pt.json` **e** `messages/en.json`, em `ementa.variantes.*`.

## As duas casas

**`src/data/restaurantes.json`** — morada, telefone, horários, fotografias e
links de entrega. A ordem do array é a ordem no site.

Um campo a `null` **desaparece** do site em vez de aparecer vazio. Nos horários,
`null` no objeto todo significa "por confirmar" e esconde a secção; `null` num
dia significa **encerrado nesse dia**, e é assim que fica escrito.

```jsonc
"horarios": {
  "segunda": null,
  "terca": { "abre": "12:00", "fecha": "23:00" },
  "…": "…"
}
```

Os links de entrega são **por casa**: o Uber Eats tem lojas distintas para a
Constituição e para Leça, e mandar quem está em Leça para a loja do Porto é
mandá-lo esperar por uma entrega que não vem. O Glovo e o Bolt Food estão no
menu impresso mas ainda sem endereço confirmado — a `null` o botão não aparece.

## Textos do site

`messages/pt.json` e `messages/en.json`. **As duas línguas têm de ter as mesmas
chaves** — se uma existir só numa, a outra rebenta ao abrir a página.

Os nomes dos hambúrgueres não vivem aqui: são nomes próprios e ficam no
`ementa.json`.

## Variáveis de ambiente

Ver `.env.example`. Em desenvolvimento nenhuma é obrigatória.

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Domínio final, sem barra no fim. Alimenta o sitemap, o robots e as imagens de partilha. |

## Publicar

Pensado para a **Vercel**: importar o repositório, definir a variável acima em
*Settings → Environment Variables*, e o resto é automático. Depois de a definir,
fazer um *redeploy* para o sitemap e as imagens de partilha saírem com o domínio
certo.

## Ícones

```bash
npm run icons
```

Regenera `favicon.ico`, `icon.png` e `apple-icon.png` a partir das iniciais em
`src/data/marca.json`. São um marcador de lugar até haver logótipo.

## Notas de transcrição

Três divergências entre o impresso e o site, todas deliberadas:

- O impresso escreve **"Menú Infantil"**, com acento espanhol. No site vai
  "Menu Infantil". Se for opção de marca, reverte-se em `messages/pt.json`.
- O impresso escreve **"ÁGUA 0,25cl"**, que seriam dois mililitros e meio. No
  site vai "Água 0,25 L", que é o que a nota do menu infantil confirma.
- Preços redondos aparecem como **"7,00 €"** e não "7€": numa coluna de mais de
  cem artigos, uns com cêntimos e outros sem, o alinhamento fica aos saltos.

O que **não** foi alterado: os nomes dos santos, as descrições e os preços.

import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./ementa.json";

/**
 * A ementa inteira vive em `ementa.json` — um array só, onde `categoria` decide
 * a secção e a ordem, e o `id` é a chave.
 *
 * **Acrescentar, tirar ou mudar o preço de um artigo é editar esse ficheiro e
 * mais nada.** Não há base de dados nem área de administração: para uma carta
 * que muda duas ou três vezes por ano, um ficheiro versionado ganha a um CMS
 * (histórico no git, sem palavra-passe para esquecer, sem custo mensal).
 *
 * O ficheiro é editado à mão, por isso é validado com `zod` no arranque. Um
 * preço escrito como texto rebenta o `npm run build` com o artigo e o campo
 * identificados, em vez de chegar a produção como `NaN €`.
 *
 * A fonte é o menu impresso de 2024, em `referencias/`.
 */

/**
 * A ordem do enum **é** a ordem em que as secções saem na página — mudar uma
 * linha de sítio aqui muda o site. É a mesma ordem do impresso, que já está
 * pensada: come-se pela ordem em que vem escrito.
 */
export const CATEGORIAS = [
  "aperitivos",
  "entradas",
  "santos-novilho",
  "carnes-maturadas",
  "para-os-corajosos",
  "santos-frango",
  "outros-santos",
  "vegetariano-saladas",
  "menu-infantil",
  "sobremesas",
  "extras",
  "bebidas",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/** Dentro das bebidas, pela ordem do impresso. */
export const SUBCATEGORIAS = [
  "sangrias",
  "limonadas",
  "refrigerantes",
  "aguas",
  "cidras",
  "cerveja",
  "vinhos",
  "licores",
  "whiskeys",
  "aguardentes",
  "quentes",
] as const;

export type Subcategoria = (typeof SUBCATEGORIAS)[number];

/**
 * As três categorias cujos artigos **não têm descrição** — no impresso são
 * listas de nome e preço, e inventar-lhes uma frase era escrever ementa que a
 * casa não escreveu.
 *
 * São também as únicas em que o `nome` é texto comum ("Cebola frita") em vez de
 * um santo, e portanto as únicas que levam `nomeEn`. Ver o `superRefine`.
 */
const SEM_DESCRICAO: readonly Categoria[] = ["aperitivos", "extras", "bebidas"];

const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1) });

/**
 * Os *Rollinis* são 4,75 € e os *Rollinis à la Chef* 5,40 €, no mesmo bloco do
 * impresso e com a mesma descrição. Uma variante em vez de dois artigos evita
 * duplicar a frase — e duas frases quase iguais divergem à primeira correção.
 *
 * `chave` é uma chave de tradução (`ementa.variantes.*`), não texto.
 */
const Variante = z.object({
  chave: z.string().min(1),
  preco: z.number().positive(),
});

const EsquemaArtigo = z
  .object({
    /** Minúsculas, números e hífenes: é a âncora do URL (`/ementa#sao-juliao`). */
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/, "só minúsculas, números e hífenes (o id vai para o URL)"),
    /**
     * O nome como está no impresso. **Os santos não se traduzem** — "São Julião"
     * é um nome próprio e é metade da graça da marca; traduzi-lo para "Saint
     * Julian" dava um sítio diferente do que está na mesa.
     */
    nome: z.string().min(1),
    /** Só onde o nome é texto comum e não um santo. Ver `SEM_DESCRICAO`. */
    nomeEn: z.string().min(1).nullable().default(null),
    categoria: z.enum(CATEGORIAS),
    subcategoria: z.enum(SUBCATEGORIAS).nullable().default(null),
    /** Em euros. O impresso escreve "7€"; aqui é `7` e a formatação é do site. */
    preco: z.number().positive(),
    /**
     * O peso da carne, em gramas.
     *
     * Existe como campo próprio porque a secção da escalada — 320 → 480 → 640 —
     * mostra o número em grande e desenha uma barra proporcional. Até aqui a
     * grama vivia **dentro do texto da descrição** ("320g de novilho (double
     * burga)…"), e ir buscá-la por expressão regular a prosa parte no primeiro
     * dia em que alguém reescrever a frase.
     *
     * Opcional em quase tudo — uma sangria não tem gramas — e **obrigatório em
     * `para-os-corajosos`**, que é a secção que depende dele. Ver o
     * `superRefine`.
     */
    gramas: z.number().int().positive().nullable().default(null),
    variantes: z.array(Variante).min(1).nullable().default(null),
    descricao: Texto.nullable().default(null),
    /**
     * Os pães de cor são um argumento de venda visível no impresso, com
     * etiqueta própria. Lista, e não um só, porque o *Mega Santo* traz os dois.
     */
    paes: z.array(z.enum(["rosa", "azul"])).default([]),
    /** O selo "BEST SELLER" do impresso. São doze. */
    bestSeller: z.boolean().default(false),
    /**
     * Marcado a partir do que o impresso afirma, não do que parece. A secção
     * chama-se "Vegetariano & Saladas" e tem lá dentro saladas de frango e de
     * novilho — essas ficam a `false`.
     */
    vegetariano: z.boolean().default(false),
    /**
     * **Vazio de propósito, em todos os artigos.** Os alergénios não constam do
     * impresso e **não se inventam**: é informação com peso legal e clínico, e
     * uma lista adivinhada é pior do que nenhuma. O campo já existe porque
     * acrescentá-lo depois obrigava a mexer em 122 objetos. Preenche-se com a
     * cozinha — ver o README.
     */
    alergenios: z.array(z.string()).default([]),
    foto: z.string().startsWith("/ementa/").nullable().default(null),
  })
  .superRefine((artigo, ctx) => {
    const semDescricao = SEM_DESCRICAO.includes(artigo.categoria);

    if (!semDescricao && artigo.descricao === null) {
      ctx.addIssue({
        code: "custom",
        path: ["descricao"],
        message: `a categoria "${artigo.categoria}" leva descrição nas duas línguas`,
      });
    }
    /* Um `nomeEn` num santo é sinal de que alguém começou a traduzir os nomes —
       falha aqui, à primeira, e não vinte artigos depois. */
    if (!semDescricao && artigo.nomeEn !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["nomeEn"],
        message: "os nomes dos santos não se traduzem — deixar `nomeEn` fora",
      });
    }
    if (semDescricao && artigo.nomeEn === null) {
      ctx.addIssue({
        code: "custom",
        path: ["nomeEn"],
        message: `"${artigo.nome}" é texto comum e precisa de \`nomeEn\``,
      });
    }
    if (artigo.categoria === "para-os-corajosos" && artigo.gramas === null) {
      ctx.addIssue({
        code: "custom",
        path: ["gramas"],
        message: "a escalada dos corajosos desenha-se a partir das gramas",
      });
    }
    /* A subcategoria só existe dentro das bebidas, que são 47 artigos e sem ela
       sairiam numa lista corrida de café a sangria. */
    if (artigo.categoria === "bebidas" && artigo.subcategoria === null) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategoria"],
        message: "toda a bebida pertence a um grupo",
      });
    }
    if (artigo.categoria !== "bebidas" && artigo.subcategoria !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategoria"],
        message: "só as bebidas têm subcategoria",
      });
    }
  });

export type Artigo = z.infer<typeof EsquemaArtigo>;

const resultado = z.array(EsquemaArtigo).safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/ementa.json", resultado.error, dados);
}

export const ementa: Artigo[] = resultado.data;

/* Dois artigos com o mesmo `id` dariam duas âncoras iguais na página e uma delas
   ficava inalcançável — sem aviso nenhum. É o erro típico de quem duplica um
   bloco para criar o seguinte, que é exatamente como este ficheiro se edita. */
const repetidos = ementa
  .map((artigo) => artigo.id)
  .filter((id, indice, todos) => todos.indexOf(id) !== indice);

if (repetidos.length > 0) {
  throw new Error(
    `src/data/ementa.json: id repetido — ${[...new Set(repetidos)].join(", ")}`,
  );
}

export const porCategoria = (categoria: Categoria) =>
  ementa.filter((artigo) => artigo.categoria === categoria);

export const porSubcategoria = (subcategoria: Subcategoria) =>
  ementa.filter((artigo) => artigo.subcategoria === subcategoria);

export const porId = (id: string) => ementa.find((artigo) => artigo.id === id);

/** Os doze com selo. É o que a homepage mostra em destaque. */
export const bestSellers = () => ementa.filter((artigo) => artigo.bestSeller);

/**
 * Os corajosos, do mais leve para o mais pesado — é a ordem em que a secção os
 * desenha, e sai das gramas em vez da ordem do ficheiro para não depender de
 * ninguém se lembrar de os manter arrumados.
 */
export const escalada = () =>
  porCategoria("para-os-corajosos")
    .slice()
    .sort((a, b) => (a.gramas ?? 0) - (b.gramas ?? 0));

/**
 * Só os que têm nome de santo.
 *
 * O critério é `nomeEn === null`, que não é um truque: **o esquema garante que
 * só os artigos de nome comum — extras, bebidas, aperitivos — têm `nomeEn`**
 * (ver o `superRefine`). Filtrar por aí é filtrar pela mesma regra que o `build`
 * já obriga, em vez de manter uma segunda lista de categorias que um dia
 * discorda desta.
 */
export const santos = () => ementa.filter((artigo) => artigo.nomeEn === null);

/** Os santos que levam um pão de cor. Alimenta a secção dos pães. */
export const porPao = (pao: "rosa" | "azul") =>
  ementa.filter((artigo) => artigo.paes.includes(pao));

/**
 * As categorias que têm mesmo artigos, pela ordem do enum.
 *
 * A navegação da ementa sai daqui em vez de sair de `CATEGORIAS`: se um dia a
 * casa tirar as sobremesas da carta, o link para a secção desaparece sozinho em
 * vez de apontar para uma âncora vazia.
 */
export const categoriasComArtigos = (): Categoria[] =>
  CATEGORIAS.filter((categoria) => porCategoria(categoria).length > 0);

/** O mesmo, dentro das bebidas. */
export const subcategoriasComArtigos = (): Subcategoria[] =>
  SUBCATEGORIAS.filter((sub) => porSubcategoria(sub).length > 0);

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
 * ## A diferença que a Damira tem para uma casa de um menu só
 *
 * A Damira não tem *uma* carta: tem **sete impressos**, e cada um é autónomo —
 * a casa distribui-os em separado. Quatro deles são ementa e vivem aqui: o menu
 * do balcão, o do almoço de fim-de-semana, o vegan e o do chocolate.
 *
 * É por isso que existe `carta` **além** de `categoria`. Achatar tudo numa lista
 * de categorias — que foi a primeira tentativa — obrigava a inventar categorias
 * como `vegan-doces` e `vegan-salgados`, e a repetir a palavra "vegan" em
 * metade do enum só para dizer de que folheto vinha o artigo.
 *
 * ⚠️ **Os outros três impressos não são ementa e não entram aqui.** O Kit
 * Festas, as Boxes e o catálogo de massas e recheios são encomenda: não se
 * pedem ao balcão, têm antecedência e o de massas nem preço tem. Vivem em
 * `encomendas.ts` e em `bolos.ts`, e a diferença não é arrumação — é o que
 * separa uma lista de preços de um formulário com prazo.
 *
 * As fontes estão em `referencias/`.
 */

/**
 * Os cinco impressos. A ordem **é** a ordem por que as cartas saem na página da
 * ementa, e é a ordem do dia: o balcão abre às sete, o almoço é ao fim-de-semana,
 * e o resto é encomenda.
 */
export const CARTAS = ["casa", "fim-de-semana", "vegan", "chocolate"] as const;

export type Carta = (typeof CARTAS)[number];

/**
 * A ordem do enum **é** a ordem em que as secções saem dentro de cada carta —
 * mudar uma linha de sítio aqui muda o site. É a ordem do impresso, que já está
 * pensada: come-se pela ordem em que vem escrito.
 *
 * Nem toda a carta usa todas: a vegan não tem bebidas, a do chocolate só tem
 * `formatos`. Uma categoria sem artigos desaparece sozinha — ver
 * `categoriasDaCarta`.
 */
export const CATEGORIAS = [
  "pausa",
  "salgados",
  "pratos",
  "doces",
  "bebidas",
  "bolos-inteiros",
  "formatos",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/** Dentro das bebidas, pela ordem do impresso. */
export const SUBCATEGORIAS = [
  "batidos",
  "milkshakes",
  "quentes",
  "frias",
] as const;

export type Subcategoria = (typeof SUBCATEGORIAS)[number];

/**
 * Como o preço se lê. **Não é decoração tipográfica: é o que o artigo é.**
 *
 * Um bolo da Damira vende-se ao quilo e um croissant à unidade, e escrever
 * "17,00 €" ao lado de um bolo de bolacha sem o `/kg` é anunciar um preço que
 * não existe — o erro mais caro que este site pode cometer, porque só se
 * descobre ao balcão, com o cliente à frente.
 */
export const UNIDADES = ["un", "kg"] as const;

export type Unidade = (typeof UNIDADES)[number];

const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1) });

/**
 * Preços diferentes para o mesmo artigo, no mesmo bloco do impresso.
 *
 * É o caso do Chocolate do Dubai, que é um produto com quatro pesos, e não
 * quatro produtos. Uma variante em vez de quatro artigos evita repetir a
 * descrição — e quatro frases quase iguais divergem à primeira correção.
 *
 * `chave` é uma chave de tradução (`ementa.variantes.*`), não texto.
 */
const Variante = z.object({
  chave: z.string().min(1),
  preco: z.number().positive(),
});

const EsquemaArtigo = z
  .object({
    /** Minúsculas, números e hífenes: é a âncora do URL (`/ementa#nata`). */
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/, "só minúsculas, números e hífenes (o id vai para o URL)"),
    /** O nome como está no impresso. */
    nome: z.string().min(1),
    /**
     * O nome em inglês.
     *
     * ⚠️ **Obrigatório em todos os artigos**, ao contrário do Santo Burga, onde
     * metade dos nomes eram santos e não se traduziam. Aqui não há nomes
     * próprios: "Bola de Berlim" é um bolo e "Croissant Misto" é uma sandes, e
     * quem entra na loja em agosto quer saber o que são.
     */
    nomeEn: z.string().min(1),
    carta: z.enum(CARTAS),
    categoria: z.enum(CATEGORIAS),
    subcategoria: z.enum(SUBCATEGORIAS).nullable().default(null),
    /** Em euros. O impresso escreve "1,60€"; aqui é `1.6` e a formatação é do site. */
    preco: z.number().positive().nullable().default(null),
    unidade: z.enum(UNIDADES).default("un"),
    variantes: z.array(Variante).min(1).nullable().default(null),
    descricao: Texto.nullable().default(null),
    /**
     * Os sabores em que o artigo se faz, quando o impresso os lista debaixo do
     * preço — os oito dos batidos, os cinco dos cafés gelados.
     *
     * É lista e não prosa porque **a mesma lista aparece em três artigos**
     * (batidos, sumos e milkshakes partilham os oito sabores): escrita na
     * descrição, uma correção de sabor obrigava a lembrar dos outros dois.
     */
    sabores: z.array(z.string()).default([]),
    /**
     * Vegan. Vem afirmado pelo impresso — a carta vegan tem símbolo próprio ao
     * lado de cada linha — e **não se deduz** de um artigo não ter nome de
     * carne. Ver o `superRefine`.
     */
    vegan: z.boolean().default(false),
    /**
     * **Vazio de propósito, em todos os artigos.** Os alergénios não constam de
     * nenhum dos cinco impressos e **não se inventam**: é informação com peso
     * legal e clínico, e uma lista adivinhada é pior do que nenhuma. Numa
     * confeitaria com carta vegan isto pesa a dobrar — quem procura o símbolo
     * da folha costuma ter uma razão para o procurar. Preenche-se com a
     * pastelaria; ver o README.
     */
    alergenios: z.array(z.string()).default([]),
    foto: z.string().startsWith("/ementa/").nullable().default(null),
  })
  .superRefine((artigo, ctx) => {
    /* Ou tem preço, ou tem variantes. Um artigo sem nenhum dos dois sai na
       página com um espaço em branco onde devia estar o número — e ninguém
       repara até um cliente perguntar. */
    if (artigo.preco === null && artigo.variantes === null) {
      ctx.addIssue({
        code: "custom",
        path: ["preco"],
        message: "sem preço nem variantes — o artigo sairia sem número nenhum",
      });
    }
    if (artigo.preco !== null && artigo.variantes !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["variantes"],
        message: "preço e variantes ao mesmo tempo: escolher um",
      });
    }
    /* Toda a carta vegan é vegan, e nada fora dela o é — a Damira não marca
       artigos vegan no menu principal. Se um dia marcar, esta regra cai; até lá
       é o que apanha um `vegan: true` copiado à pressa para o sítio errado. */
    if (artigo.carta === "vegan" && !artigo.vegan) {
      ctx.addIssue({
        code: "custom",
        path: ["vegan"],
        message: "está na carta vegan e não está marcado como vegan",
      });
    }
    if (artigo.carta !== "vegan" && artigo.vegan) {
      ctx.addIssue({
        code: "custom",
        path: ["vegan"],
        message:
          "só a carta vegan tem artigos vegan — o impresso principal não os assinala",
      });
    }
    /* A subcategoria só existe dentro das bebidas, que são 25 artigos e sem ela
       sairiam numa lista corrida de café a milkshake. */
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
    /* Um bolo inteiro vende-se ao quilo. Escrevê-lo à unidade é anunciar um
       bolo de dois quilos por dezassete euros. */
    if (artigo.categoria === "bolos-inteiros" && artigo.unidade !== "kg") {
      ctx.addIssue({
        code: "custom",
        path: ["unidade"],
        message: "um bolo inteiro vende-se ao quilo",
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

export const daCarta = (carta: Carta) =>
  ementa.filter((artigo) => artigo.carta === carta);

export const porCategoria = (carta: Carta, categoria: Categoria) =>
  ementa.filter((a) => a.carta === carta && a.categoria === categoria);

export const porSubcategoria = (subcategoria: Subcategoria) =>
  ementa.filter((artigo) => artigo.subcategoria === subcategoria);

export const porId = (id: string) => ementa.find((artigo) => artigo.id === id);

/**
 * As categorias que uma carta tem mesmo, pela ordem do enum.
 *
 * A navegação da ementa sai daqui em vez de sair de `CATEGORIAS`: se um dia a
 * casa tirar as bebidas da carta, o link para a secção desaparece sozinho em
 * vez de apontar para uma âncora vazia.
 */
export const categoriasDaCarta = (carta: Carta): Categoria[] =>
  CATEGORIAS.filter((categoria) => porCategoria(carta, categoria).length > 0);

/** O mesmo, dentro das bebidas. */
export const subcategoriasComArtigos = (): Subcategoria[] =>
  SUBCATEGORIAS.filter((sub) => porSubcategoria(sub).length > 0);

/** As cartas que têm mesmo artigos, pela ordem do enum. */
export const cartasComArtigos = (): Carta[] =>
  CARTAS.filter((carta) => daCarta(carta).length > 0);

import { encomendas, type Box, type Kit, type KitBolo } from "@/data/encomendas";
import type { TipoPedido } from "@/lib/pedidos";
import type { Locale } from "@/i18n/routing";

/**
 * # Os produtos de encomenda, numa lista só
 *
 * ## Porque é que isto existe
 *
 * O `encomendas.json` guarda **três formas diferentes** — os kits de festa têm
 * escalões e não têm preço próprio, os kits de bolo têm preço fechado e uma
 * lista de itens, as boxes têm preço e uma lista corrida. A diferença é real e
 * é do negócio, e o ficheiro faz bem em a respeitar.
 *
 * O que **não** é real é a página ter de saber disso três vezes. Uma grelha de
 * cartões, uma rota `/encomendas/<id>` e um mapa do site precisam todos da mesma
 * coisa — *que produtos existem, como se chamam, quanto custam e onde vivem* — e
 * escrever isso três vezes é a maneira garantida de um produto novo aparecer na
 * grelha e faltar no mapa do site.
 *
 * ⚠️ **Isto é uma vista e não uma segunda fonte de verdade.** Não há aqui um
 * único dado que não venha do JSON: o que esta camada faz é dar-lhes a mesma
 * forma. Se um dia divergirem, o erro está aqui e não lá.
 *
 * ## ⚠️ O bolo por medida não vem do JSON, e é de propósito
 *
 * Não é um produto de catálogo: é uma conversa. Não tem preço — o `bolos.json`
 * não traz um único número — e o que se escolhe são massas, recheios e
 * coberturas. Entra nesta lista para ter página, cartão e rota como os outros,
 * mas com `preco: null`, que é **sob orçamento** e não zero.
 */
export type Familia = "festa" | "bolo" | "box" | "medida";

export type Produto = {
  /** Vai para o URL: `/encomendas/<id>`. Único entre todas as famílias. */
  id: string;
  familia: Familia;
  /** O que o pedido leva escrito. Ver `TIPOS_PEDIDO` em `pedidos.ts`. */
  tipo: TipoPedido;
  nome: (locale: Locale) => string;
  /** Uma frase, quando o impresso a tem. Nem todos têm — e não se inventa. */
  resumo: ((locale: Locale) => string) | null;
  /** ⚠️ `null` é **sob orçamento** e não zero. Ver `cesto.ts`. */
  preco: number | null;
  vegan: boolean;
  /**
   * ⚠️ **Está a `null` em todos, e vai continuar até a casa dar fotografia por
   * produto.**
   *
   * Há dezanove fotografias da casa em `public/`, e nenhuma é *deste kit* ou
   * *desta box*. Pôr a fotografia de uma montra ao lado de um kit de setenta
   * pessoas é anunciar uma coisa e entregar outra — e numa página de produto
   * qualquer imagem lê-se como sendo o produto. A página mostra um espaço
   * reservado e diz que a fotografia está por chegar; ver `FotoProduto`.
   */
  foto: string | null;
  /** O produto original, para a página desenhar o que é próprio de cada família. */
  fonte: Kit | KitBolo | Box | null;
};

const kitDeFesta = (kit: Kit): Produto => ({
  id: `festa-${kit.id}`,
  familia: "festa",
  tipo: "festa",
  nome: (l) => kit.nome[l],
  resumo: kit.resumo ? (l) => kit.resumo![l] : null,
  /* ⚠️ **Sem preço próprio, e não é o preço a zero.** Um kit de festa custa
     consoante o escalão — 20, 40 ou 70 pessoas — e o cartão mostra «desde». O
     preço concreto só existe depois de alguém escolher para quantos é. */
  preco: null,
  vegan: false,
  foto: null,
  fonte: kit,
});

const kitDeBolo = (kit: KitBolo): Produto => ({
  id: `bolo-${kit.id}`,
  familia: "bolo",
  tipo: "bolo",
  nome: (l) => kit.nome[l],
  resumo: (l) => kit.resumo[l],
  preco: kit.preco,
  vegan: false,
  foto: null,
  fonte: kit,
});

const caixa = (box: Box): Produto => ({
  id: `box-${box.id}`,
  familia: "box",
  tipo: "box",
  nome: (l) => box.nome[l],
  resumo: null,
  preco: box.preco,
  vegan: box.vegan,
  foto: null,
  fonte: box,
});

/** O bolo por medida. Ver a nota do cabeçalho: não vem do JSON. */
const BOLO_POR_MEDIDA: Produto = {
  id: "bolo-por-medida",
  familia: "medida",
  tipo: "bolo",
  nome: () => "",
  resumo: null,
  preco: null,
  vegan: false,
  foto: null,
  fonte: null,
};

export const PRODUTOS: Produto[] = [
  ...encomendas.kitsFesta.map(kitDeFesta),
  ...encomendas.kitsBolo.map(kitDeBolo),
  BOLO_POR_MEDIDA,
  ...encomendas.boxes.map(caixa),
];

/* ⚠️ **Dois produtos com o mesmo `id` dariam duas rotas iguais**, e uma delas
   ficava inalcançável sem aviso nenhum — é a mesma armadilha das âncoras da
   ementa. Os prefixos por família (`festa-`, `bolo-`, `box-`) existem para isso,
   e esta guarda é o que impede alguém de os tirar por os achar redundantes. */
const repetidos = PRODUTOS.map((p) => p.id).filter(
  (id, i, todos) => todos.indexOf(id) !== i,
);

if (repetidos.length > 0) {
  throw new Error(
    `src/lib/produtos.ts: id de produto repetido — ${[...new Set(repetidos)].join(", ")}`,
  );
}

export const produtoPorId = (id: string): Produto | undefined =>
  PRODUTOS.find((p) => p.id === id);

export const daFamilia = (familia: Familia): Produto[] =>
  PRODUTOS.filter((p) => p.familia === familia);

/** O caminho de um produto, sem prefixo de idioma — o `Link` trata disso. */
export const caminhoDoProduto = (id: string): string => `/encomendas/${id}`;

/**
 * O preço mais baixo de um kit de festa, para o cartão poder dizer «desde».
 *
 * ⚠️ **Nunca escrever o preço de um escalão sem dizer de que escalão é.** «180 €»
 * ao lado de um Kit Básico lê-se como o preço do kit; são vinte pessoas, e quem
 * precisa de setenta paga o triplo.
 */
export function precoMinimo(produto: Produto): number | null {
  if (produto.familia !== "festa" || !produto.fonte) return produto.preco;
  const kit = produto.fonte as Kit;
  return Math.min(...kit.escaloes.map((e) => e.preco));
}

import type { Locale } from "@/i18n/routing";
import type { OrdemEmenta, Produto, Variante } from "@/lib/dados/tipos";
import type { TipoPedido } from "@/lib/pedidos";

/**
 * # Como as páginas leem um `Produto`
 *
 * Funções pequenas, **sem dados nenhuns**: recebem o que a página já foi buscar
 * a `@/lib/dados` e respondem a perguntas de apresentação. Ficam fora da
 * fronteira (`divisao.md`: «as funções auxiliares que não tocam em dados ficam
 * em `src/lib/`»), e por isso podem ser importadas em componentes de cliente
 * sem levar o catálogo para o browser — que é o que o `caminhoDoArtigo` fazia
 * quando vivia no `produtos.ts`.
 */

type Texto = { pt: string; en: string | null };

/** O texto na língua pedida, ou em português quando o inglês falta. */
export const emLingua = (texto: Texto, locale: Locale): string =>
  (locale === "en" ? texto.en : null) ?? texto.pt;

export const nomeDe = (produto: Produto, locale: Locale): string =>
  emLingua(produto.nome, locale);

export const descricaoDe = (produto: Produto, locale: Locale): string | null =>
  produto.descricao && emLingua(produto.descricao, locale);

export const fotoDe = (produto: Produto): string | null => produto.fotos[0] ?? null;

/** A variante de um produto sem variantes, ou `null` se ele as tiver. */
const unica = (produto: Produto): Variante | null =>
  produto.variantes.length === 1 && produto.variantes[0].id === "unica"
    ? produto.variantes[0]
    : null;

/**
 * O preço de um produto sem variantes, em cêntimos. `null` quando tem
 * variantes (o preço depende da escolha) **ou** quando é sob orçamento — e
 * nenhum dos dois é zero.
 */
export const precoUnicoCent = (produto: Produto): number | null =>
  unica(produto)?.precoCent ?? null;

/** As variantes que se mostram ao cliente: todas, menos a «única». */
export const variantesVisiveis = (produto: Produto): Variante[] =>
  unica(produto) ? [] : produto.variantes;

/** O «desde»: o mais barato das variantes com preço. */
export const precoMinimoCent = (produto: Produto): number | null => {
  const precos = produto.variantes
    .map((variante) => variante.precoCent)
    .filter((preco): preco is number => preco !== null);
  return precos.length > 0 ? Math.min(...precos) : null;
};

/** O mínimo e o passo da encomenda, ou `null` se não se encomenda. */
export const regraDe = (produto: Produto): { minimo: number; passo: number } | null =>
  produto.aVendaOnline ? { minimo: produto.quantidadeMinima, passo: produto.multiplo } : null;

/** O que o pedido leva escrito. O bolo por medida é um pedido de bolo. */
export const tipoDoPedido = (produto: Produto): TipoPedido =>
  produto.familia === "medida" ? "bolo" : produto.familia;

export const caminhoDoProduto = (id: string): string => `/encomendas/${id}`;

/**
 * ⚠️ **A página de um artigo fica debaixo de `/ementa`, e não de
 * `/encomendas`**, mesmo quando o artigo se encomenda: é a separação de sempre
 * (ver o `AGENTS.md`). O que a página diz é que se pode encomendar; o endereço
 * diz que é da carta.
 */
export const caminhoDoArtigo = (id: string): string => `/ementa/${id}`;

// ——— A ementa, por carta e categoria ———

export const daCarta = (artigos: readonly Produto[], carta: string): Produto[] =>
  artigos.filter((artigo) => artigo.carta === carta);

export const porCategoria = (
  artigos: readonly Produto[],
  carta: string,
  categoria: string,
): Produto[] =>
  artigos.filter((artigo) => artigo.carta === carta && artigo.categoria === categoria);

/** As cartas que têm mesmo artigos, pela ordem da ementa. */
export const cartasComArtigos = (artigos: readonly Produto[], ordem: OrdemEmenta): string[] =>
  ordem.cartas.filter((carta) => daCarta(artigos, carta).length > 0);

/**
 * As categorias que uma carta tem mesmo, pela ordem da ementa. A navegação sai
 * daqui: se a casa tirar as bebidas de uma carta, o link desaparece sozinho em
 * vez de apontar para uma âncora vazia.
 */
export const categoriasDaCarta = (
  artigos: readonly Produto[],
  ordem: OrdemEmenta,
  carta: string,
): string[] =>
  ordem.categorias.filter((categoria) => porCategoria(artigos, carta, categoria).length > 0);

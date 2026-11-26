import type { Locale } from "@/i18n/routing";
import type { Extra, Opcao, OrdemEmenta, Produto, Variancia, Variante } from "@/lib/dados/tipos";
import type { TipoPedido } from "@/lib/pedidos";

/**
 * # Como as páginas leem um `Produto`
 *
 * Funções pequenas, **sem dados nenhuns**: recebem o que a página já foi buscar
 * a `@/lib/dados` e respondem a perguntas de apresentação. Ficam fora da
 * fronteira (`divisao.md`: «as funções auxiliares que não tocam em dados ficam
 * em `src/lib/`»), e por isso podem ser importadas em componentes de cliente
 * sem levar o catálogo para o browser — que é o que os caminhos faziam
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

/** As variantes que se mostram ao cliente: as disponíveis, menos a «única». */
export const variantesVisiveis = (produto: Produto): Variante[] =>
  unica(produto) ? [] : produto.variantes.filter((v) => v.ativa);

/** O «desde»: o mais barato das variantes disponíveis com preço. */
export const precoMinimoCent = (produto: Produto): number | null => {
  const precos = produto.variantes
    .filter((variante) => variante.ativa)
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
 * Quem tem página própria (decidido a 26/11): os produtos das encomendas, como
 * sempre, e **os da carta que se encomendam** — é na página que se escolhe o
 * sabor, o que se tira e os extras, e que se veem as fotografias todas. Um
 * galão (`aVendaOnline: false`) continua sem página: não se encomenda.
 */
export const temPagina = (produto: Produto): boolean =>
  !produto.arquivado && (produto.origem === "encomendas" || produto.aVendaOnline);

/**
 * As secções da `/encomendas`, pela ordem da página: os `id` das `<section>`, e
 * por onde navegam o índice do herói e o menu do «Encomendas» do cabeçalho
 * (#82). ⚠️ **Uma lista só para os dois**: o menu tinha uma cópia, e mudar um
 * `id` na página sem a mudar lá deixava uma entrada a levar ao topo, sem erro
 * nenhum. O «pedido» é a última: o índice mostra-a, o menu não (ver
 * `MenuEncomendas`).
 */
export const SECCOES_ENCOMENDAS = ["festas", "kits-bolo", "boxes", "da-ementa", "pedido"] as const;

// ——— A ementa, por carta e categoria ———

export const daCarta = (artigos: readonly Produto[], carta: string): Produto[] =>
  artigos.filter((artigo) => artigo.carta === carta);

export const porCategoria = (
  artigos: readonly Produto[],
  carta: string,
  categoria: string,
): Produto[] =>
  porOrdemAlfabetica(
    artigos.filter((artigo) => artigo.carta === carta && artigo.categoria === categoria),
    "pt",
  );

/**
 * Os produtos por ordem alfabética do nome, na língua de quem lê (decidido a
 * 25/11: **tudo** nas encomendas e no painel, kits e bolos incluídos).
 *
 * ⚠️ Ordena-se aqui, ao mostrar, e não se confia na ordem em que chegam: um
 * produto que a gerente acabou de criar entra no sítio certo sem ninguém
 * mexer em nada, e a ordem não depende de como a base de dados os devolve.
 * O `localeCompare` com `sensitivity: "base"` põe «Éclair» ao pé de «Empada»,
 * e não depois do «Z».
 */
export const porOrdemAlfabetica = (produtos: readonly Produto[], locale: Locale): Produto[] =>
  [...produtos].sort((a, b) =>
    nomeDe(a, locale).localeCompare(nomeDe(b, locale), locale, { sensitivity: "base", numeric: true }),
  );

/** O texto em que a pesquisa da página procura: os dois nomes, sem acentos nem maiúsculas. */
export const textoDeProcura = (produto: Produto): string => paraProcura(`${produto.nome.pt} ${produto.nome.en ?? ""}`);

/** «Pão de Ló» encontra-se com «pao de lo». */
export const paraProcura = (texto: string): string =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/**
 * A grelha de todos os cartões das encomendas — kits, bolos, boxes e a carta.
 * Uma só, para todos os produtos terem o mesmo tamanho (decidido a 25/11): duas
 * colunas no telemóvel e seis num monitor.
 */
export const GRELHA_CARTOES = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

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

// ——— A personalização (#88) ———

/**
 * O que a página e o botão de juntar precisam para o cliente personalizar: as
 * peças **disponíveis** do produto e, num composto, os simples que cada grupo
 * leva, com as variâncias deles. Sem funções, para atravessar para o cliente.
 * Os simples vêm de quem chama (o servidor), que é quem lê o catálogo.
 */
export type DadosPersonalizacao = {
  variancias: Variancia[];
  opcoes: Opcao[];
  extras: Extra[];
  /** Por grupo (`varianteId`): o que leva. */
  dentro: Record<string, { produtoId: string; nome: Texto; quantidade: number | null; variancias: Variancia[] }[]>;
};

const soAtivas = (variancias: readonly Variancia[]): Variancia[] =>
  variancias
    .map((v) => ({ ...v, escolhas: v.escolhas.filter((e) => e.ativa) }))
    .filter((v) => v.escolhas.length > 0);

export function paraPersonalizar(produto: Produto, simples: readonly Produto[]): DadosPersonalizacao {
  const porId = new Map(simples.map((p) => [p.id, p]));
  return {
    variancias: soAtivas(produto.variancias),
    opcoes: produto.opcoes.filter((o) => o.ativa),
    extras: produto.extras.filter((e) => e.ativo),
    dentro: Object.fromEntries(
      produto.variantes.map((v) => [
        v.id,
        v.leva.flatMap((l) => {
          const p = porId.get(l.produtoId);
          return p ? [{ produtoId: p.id, nome: p.nome, quantidade: l.quantidade, variancias: soAtivas(p.variancias) }] : [];
        }),
      ]),
    ),
  };
}

/** Se há alguma coisa a perguntar ou a oferecer — e com isso, se o botão rápido chega. */
export const temPersonalizacao = (dados: DadosPersonalizacao): boolean =>
  dados.variancias.length > 0 ||
  dados.opcoes.length > 0 ||
  dados.extras.length > 0 ||
  Object.values(dados.dentro).some((d) => d.some((l) => l.variancias.length > 0));

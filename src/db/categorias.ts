import type { OrdemEmenta, Produto } from "../lib/dados/tipos";
import type { categorias, familias, TipoProduto } from "./esquema";

/**
 * # As categorias da gerente, tiradas do catálogo de hoje (#124)
 *
 * Até a fronteira passar a ler `produtos.categoria_id` e `produtos.tipo`, quem
 * manda continua a ser a `familia`, a `carta` e a `categoria`: as colunas novas
 * **saem delas**, ao importar, ao criar e ao editar um produto. É esta conta.
 *
 * ⚠️ **A migração `0008` faz a mesma conta em SQL**, para os produtos que já estão
 * na Neon. As duas não se podem afastar, e é o `migracao-categorias.test.ts`
 * que o garante: importa o catálogo pelos dois caminhos e compara.
 *
 * Quando a fronteira ler as colunas novas, esta conta sai, e a gerente escolhe a
 * categoria e o tipo no painel.
 */

type LinhaCategoria = typeof categorias.$inferInsert;
type LinhaFamilia = typeof familias.$inferInsert;

/**
 * As famílias de partida (26/11): as secções da `/encomendas` de hoje, com as
 * âncoras e os títulos de hoje, e o Natal, que a casa pediu. ⚠️ A migração
 * `0012` escreve as mesmas, e o `migracao-categorias.test.ts` compara.
 */
export const FAMILIAS_DE_PARTIDA: readonly LinhaFamilia[] = [
  { id: "festas", nomePt: "Kit Festas", nomeEn: "Party Kits", posicao: 0 },
  { id: "kits-bolo", nomePt: "Bolo e mesa decorada", nomeEn: "Cake and decorated table", posicao: 1 },
  { id: "boxes", nomePt: "Boxes para dias especiais", nomeEn: "Boxes for special days", posicao: 2 },
  { id: "da-ementa", nomePt: "Da carta", nomeEn: "From the menu", posicao: 3 },
  { id: "natal", nomePt: "Natal", nomeEn: "Christmas", posicao: 4 },
];

/** A família de partida de uma categoria: as das encomendas são a sua; as outras, da carta. */
export const familiaDaCategoria = (categoriaId: string): string =>
  ["festas", "kits-bolo", "boxes"].includes(categoriaId) ? categoriaId : "da-ementa";

/** Os títulos das secções da `/encomendas` de hoje, e as âncoras delas. */
const DAS_ENCOMENDAS = {
  festa: { id: "festas", nomePt: "Kit Festas", nomeEn: "Party Kits" },
  /* O bolo por medida já vive na grelha dos kits de bolo (`encomendas/page.tsx`). */
  bolo: {
    id: "kits-bolo",
    nomePt: "Bolo e mesa decorada",
    nomeEn: "Cake and decorated table",
  },
  medida: {
    id: "kits-bolo",
    nomePt: "Bolo e mesa decorada",
    nomeEn: "Cake and decorated table",
  },
  box: {
    id: "boxes",
    nomePt: "Boxes para dias especiais",
    nomeEn: "Boxes for special days",
  },
} as const;

/** As secções das encomendas vêm antes da carta, como na página de hoje. */
const ORDEM_DAS_ENCOMENDAS = ["festas", "kits-bolo", "boxes"];

/* Os rótulos de `messages/*.json` › `ementa.categorias`. */
const ROTULOS: Record<string, { pt: string; en: string }> = {
  pausa: { pt: "Para uma pausa", en: "Light bites" },
  salgados: { pt: "Salgados", en: "Savouries" },
  pratos: { pt: "Pratos", en: "Plates" },
  doces: { pt: "Doces", en: "Pastries" },
  bebidas: { pt: "Bebidas", en: "Drinks" },
  "bolos-inteiros": { pt: "Bolos inteiros", en: "Whole cakes" },
  formatos: { pt: "Formatos", en: "Sizes" },
};

/**
 * O que a carta junta ao nome: «Doces» há dois, e sem isto a loja ficava com
 * duas secções iguais (a armadilha 8). A carta da casa não junta nada.
 */
const DA_CARTA: Record<string, { pt: string; en: string }> = {
  casa: { pt: "", en: "" },
  "fim-de-semana": { pt: " de fim de semana", en: "Weekend " },
  vegan: { pt: " vegan", en: "Vegan " },
  chocolate: { pt: " de chocolate", en: "Chocolate " },
};

/* «Formatos de chocolate» é o que a conta dá; o impresso chama-lhe isto. */
const NOMES_PROPRIOS: Record<string, { pt: string; en: string }> = {
  "chocolate-formatos": { pt: "Chocolate do Dubai", en: "Dubai Chocolate" },
};

/** Um nome que a conta não conhece fica como está, em vez de inventar um. */
const rotulo = (chave: string) => ROTULOS[chave] ?? { pt: chave, en: chave };

/** A categoria de um produto, com o nome que leva se for a primeira vez que aparece. */
export function categoriaDoProduto(produto: Produto): Omit<LinhaCategoria, "posicao"> {
  if (produto.familia !== "ementa") {
    const daEncomenda = DAS_ENCOMENDAS[produto.familia];
    return { ...daEncomenda, familiaId: familiaDaCategoria(daEncomenda.id) };
  }

  /* O contrato obriga a carta e a categoria nos artigos da carta (`EsquemaProduto`). */
  const carta = produto.carta!;
  const categoria = produto.categoria!;
  const id = `${carta}-${categoria}`;
  const proprio = NOMES_PROPRIOS[id];
  if (proprio) return { id, nomePt: proprio.pt, nomeEn: proprio.en, familiaId: familiaDaCategoria(id) };

  const base = rotulo(categoria);
  const sufixo = DA_CARTA[carta] ?? { pt: ` (${carta})`, en: `${carta} ` };
  return {
    id,
    nomePt: base.pt + sufixo.pt,
    nomeEn: sufixo.en === "" ? base.en : sufixo.en + base.en.toLowerCase(),
    familiaId: familiaDaCategoria(id),
  };
}

/** `composto` é o que se descreve pelo que leva: os kits e as boxes. */
export function tipoDoProduto(produto: Produto): TipoProduto {
  return produto.variantes.some((variante) => variante.composicao.length > 0) ? "composto" : "simples";
}

/**
 * Onde a categoria fica na ordem de partida: as das encomendas primeiro, depois
 * as da carta pela ordem das cartas e, dentro de cada uma, pela ordem que a
 * gerente gravou (#87). É a ordem da `/encomendas` de hoje.
 */
function chaveDeOrdem(produto: Produto, ordem: OrdemEmenta): [number, number, number] {
  if (produto.familia !== "ementa") {
    return [0, ORDEM_DAS_ENCOMENDAS.indexOf(DAS_ENCOMENDAS[produto.familia].id), 0];
  }
  /* Uma que a ordem não tenha vai para o fim, e não desaparece. */
  const indice = (lista: string[], valor: string | null) => {
    const i = lista.indexOf(valor ?? "");
    return i === -1 ? lista.length : i;
  };
  return [1, indice(ordem.cartas, produto.carta), indice(ordem.categorias, produto.categoria)];
}

/**
 * As categorias que o catálogo usa, cada uma uma vez, com a posição de partida.
 * Uma categoria sem produtos não nasce: a gerente cria as que quiser.
 */
export function categoriasDoCatalogo(catalogo: readonly Produto[], ordem: OrdemEmenta): LinhaCategoria[] {
  const porId = new Map<string, { linha: Omit<LinhaCategoria, "posicao">; chave: [number, number, number] }>();
  for (const produto of catalogo) {
    const linha = categoriaDoProduto(produto);
    if (!porId.has(linha.id)) porId.set(linha.id, { linha, chave: chaveDeOrdem(produto, ordem) });
  }
  const comparar = (a: [number, number, number], b: [number, number, number]) =>
    a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return (
    [...porId.values()]
      /* O desempate pelo id é byte a byte, como o `COLLATE "C"` da migração. */
      .sort((a, b) => comparar(a.chave, b.chave) || (a.linha.id < b.linha.id ? -1 : 1))
      .map(({ linha }, posicao) => ({ ...linha, posicao }))
  );
}

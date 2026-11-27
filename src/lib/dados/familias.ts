import { emId, livre } from "./regras";
import { EsquemaFamilias, type Categoria, type Familia, type ResultadoPainel, type Produto } from "./tipos";
import { categoriaDoProduto } from "@/db/categorias";

/**
 * # As famílias e as categorias (pedido de 26/11)
 *
 * A conta que as duas fontes partilham: ler a árvore que a gerente grava,
 * conferi-la contra a que existe e dizer o que muda. A gravação é de cada uma
 * — a memória no `json-painel.ts`, um lote no `bd.ts` —, mas as regras são
 * estas, e só estas.
 *
 * ⚠️ **Ganha a última gravação.** São as famílias da loja, que só a gerente
 * mexe, e não uma vaga: duas gravações ao mesmo tempo dão a segunda, inteira,
 * e nunca meia de cada uma.
 */

/** Uma linha como está gravada: a mesma forma nas duas fontes. */
export type FamiliaGravada = {
  id: string;
  nome: { pt: string; en: string | null };
  posicao: number;
  arquivada: boolean;
};
export type CategoriaGravada = FamiliaGravada & { familiaId: string };
export type SeccaoGravada = FamiliaGravada & { categoriaId: string };

export type ArvoreGravada = { familias: FamiliaGravada[]; categorias: CategoriaGravada[]; seccoes: SeccaoGravada[] };

/** O que a gravação faz. As posições já são as novas; tudo o resto fica. */
export type PlanoFamilias = {
  familias: FamiliaGravada[];
  categorias: CategoriaGravada[];
  apagarFamilias: string[];
  /** As que ficam com categorias arquivadas apontadas: não se apagam, arquivam-se. */
  arquivarFamilias: string[];
  apagarCategorias: string[];
  /** Os produtos das que saem, para onde vão — antes de elas saírem, e sem secção. */
  moverProdutos: { de: string; para: string }[];
  seccoes: SeccaoGravada[];
  /**
   * As secções que saem, arquivadas incluídas quando a categoria sai. Os
   * produtos delas ficam na categoria, sem secção: largam-na antes de ela sair.
   */
  apagarSeccoes: string[];
};

type Recusa = Extract<ResultadoPainel<never>, { ok: false }>;
const recusa = (campo: string): Recusa => ({ ok: false, erro: "dados-invalidos", campos: [campo] });

/** A ordem da loja: a posição, e o id a desempatar (a `posicao` não é única). */
const pelaOrdem = <T extends { posicao: number; id: string }>(a: T, b: T) =>
  a.posicao - b.posicao || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** A árvore da loja: sem as arquivadas, pela ordem da gerente. */
export function arvoreDaLoja({ familias, categorias, seccoes }: ArvoreGravada): Familia[] {
  const ativas = categorias.filter((c) => !c.arquivada).sort(pelaOrdem);
  const seccoesAtivas = seccoes.filter((x) => !x.arquivada).sort(pelaOrdem);
  return familias
    .filter((f) => !f.arquivada)
    .sort(pelaOrdem)
    .map((f) => ({
      id: f.id,
      nome: f.nome,
      categorias: ativas
        .filter((c) => c.familiaId === f.id)
        .map(
          (c): Categoria => ({
            id: c.id,
            nome: c.nome,
            familiaId: c.familiaId,
            seccoes: seccoesAtivas
              .filter((x) => x.categoriaId === c.id)
              .map((x) => ({ id: x.id, nome: x.nome, categoriaId: x.categoriaId })),
          }),
        ),
    }));
}

/**
 * Confere a árvore que veio do browser contra a gravada e diz o que gravar.
 * `comProdutos` são as categorias para onde aponta algum produto, arquivados
 * incluídos: essas não se apagam (a chave estrangeira também o recusava, mas
 * assim a gerente recebe o campo certo, e a fonte JSON a mesma resposta).
 */
export function planearFamilias(
  entrada: unknown,
  atual: ArvoreGravada,
  comProdutos: ReadonlySet<string>,
): { ok: true; plano: PlanoFamilias } | Recusa {
  const lido = EsquemaFamilias.safeParse(entrada);
  if (!lido.success) return recusa("familias");

  const familiasPorId = new Map(atual.familias.filter((f) => !f.arquivada).map((f) => [f.id, f]));
  const categoriasPorId = new Map(atual.categorias.filter((c) => !c.arquivada).map((c) => [c.id, c]));
  /* Os ids novos não podem pisar nenhum, arquivados incluídos: a chave primária
     não distingue, e um id reaproveitado juntava pedidos antigos a outra coisa. */
  const idsDeFamilia = new Set(atual.familias.map((f) => f.id));
  const idsDeCategoria = new Set(atual.categorias.map((c) => c.id));
  const seccoesPorId = new Map(atual.seccoes.filter((x) => !x.arquivada).map((x) => [x.id, x]));
  const idsDeSeccao = new Set(atual.seccoes.map((x) => x.id));
  const vistasSeccoes = new Set<string>();
  const seccoes: SeccaoGravada[] = [];

  const vistasFamilias = new Set<string>();
  const vistasCategorias = new Set<string>();
  const nomesDeFamilia = new Set<string>();
  const familias: FamiliaGravada[] = [];
  const categorias: CategoriaGravada[] = [];

  /* Um nome mudado perde o inglês: uma tradução do nome antigo era pior do que
     nenhuma (a loja mostra o português). */
  const nome = (pt: string, antes?: { pt: string; en: string | null }) => ({
    pt,
    en: antes && antes.pt === pt ? antes.en : null,
  });

  for (const [posicao, familia] of lido.data.familias.entries()) {
    const chave = familia.nome.toLocaleLowerCase("pt");
    if (nomesDeFamilia.has(chave)) return recusa("familias");
    nomesDeFamilia.add(chave);

    let id: string;
    let antes: FamiliaGravada | undefined;
    if (familia.id !== undefined) {
      antes = familiasPorId.get(familia.id);
      if (!antes || vistasFamilias.has(familia.id)) return recusa("familias");
      id = familia.id;
    } else {
      id = livre(emId(familia.nome) || "familia", (candidato) => idsDeFamilia.has(candidato));
      idsDeFamilia.add(id);
    }
    vistasFamilias.add(id);
    familias.push({ id, nome: nome(familia.nome, antes?.nome), posicao, arquivada: false });

    const nomesDeCategoria = new Set<string>();
    for (const [posicaoNaFamilia, categoria] of familia.categorias.entries()) {
      const chaveCategoria = categoria.nome.toLocaleLowerCase("pt");
      if (nomesDeCategoria.has(chaveCategoria)) return recusa("categorias");
      nomesDeCategoria.add(chaveCategoria);

      let idCategoria: string;
      let anterior: CategoriaGravada | undefined;
      if (categoria.id !== undefined) {
        anterior = categoriasPorId.get(categoria.id);
        if (!anterior || vistasCategorias.has(categoria.id)) return recusa("categorias");
        idCategoria = categoria.id;
      } else {
        idCategoria = livre(emId(categoria.nome) || "categoria", (candidato) => idsDeCategoria.has(candidato));
        idsDeCategoria.add(idCategoria);
      }
      vistasCategorias.add(idCategoria);
      categorias.push({
        id: idCategoria,
        nome: nome(categoria.nome, anterior?.nome),
        familiaId: id,
        posicao: posicaoNaFamilia,
        arquivada: false,
      });

      /* As secções desta categoria (27/11). ⚠️ Uma que existia fica na mesma
         categoria: noutra, os produtos dela deixavam de bater certo com a
         chave composta (`produtos_seccao_da_categoria`). */
      const nomesDeSeccao = new Set<string>();
      for (const [posicaoNaCategoria, seccao] of categoria.seccoes.entries()) {
        const chaveSeccao = seccao.nome.toLocaleLowerCase("pt");
        if (nomesDeSeccao.has(chaveSeccao)) return recusa("seccoes");
        nomesDeSeccao.add(chaveSeccao);

        let idSeccao: string;
        let daSeccao: SeccaoGravada | undefined;
        if (seccao.id !== undefined) {
          daSeccao = seccoesPorId.get(seccao.id);
          if (!daSeccao || daSeccao.categoriaId !== idCategoria || vistasSeccoes.has(seccao.id)) {
            return recusa("seccoes");
          }
          idSeccao = seccao.id;
        } else {
          idSeccao = livre(emId(seccao.nome) || "seccao", (candidato) => idsDeSeccao.has(candidato));
          idsDeSeccao.add(idSeccao);
        }
        vistasSeccoes.add(idSeccao);
        seccoes.push({
          id: idSeccao,
          nome: nome(seccao.nome, daSeccao?.nome),
          categoriaId: idCategoria,
          posicao: posicaoNaCategoria,
          arquivada: false,
        });
      }
    }
  }

  /* O que existia e não veio apaga-se. Os produtos de uma que sai passam para o
     destino que a gerente escolheu (27/11): uma que exista e fique. Sem ele, ou
     com um destino que também sai, recusa-se — um produto sem categoria
     desaparecia da loja sem ninguém dar por isso. */
  const apagarCategorias = [...categoriasPorId.keys()].filter((id) => !vistasCategorias.has(id));
  const destinos = lido.data.destinos ?? {};
  const moverProdutos: PlanoFamilias["moverProdutos"] = [];
  for (const de of apagarCategorias) {
    if (!comProdutos.has(de)) continue;
    const para = destinos[de];
    if (para === undefined || !categoriasPorId.has(para) || !vistasCategorias.has(para)) return recusa("destinos");
    moverProdutos.push({ de, para });
  }

  const omitidas = [...familiasPorId.keys()].filter((id) => !vistasFamilias.has(id));
  /* Uma categoria arquivada continua a apontar para a família: aí a família
     arquiva-se, porque a chave estrangeira não a deixa sair. */
  const comArquivadas = new Set(atual.categorias.filter((c) => c.arquivada).map((c) => c.familiaId));

  return {
    ok: true,
    plano: {
      familias,
      categorias,
      apagarFamilias: omitidas.filter((id) => !comArquivadas.has(id)),
      arquivarFamilias: omitidas.filter((id) => comArquivadas.has(id)),
      apagarCategorias,
      moverProdutos,
      seccoes,
      /* As que não vieram, e todas as das categorias que saem (arquivadas
         incluídas, que senão seguravam a categoria pela chave estrangeira). */
      apagarSeccoes: atual.seccoes
        .filter((x) => (!x.arquivada && !vistasSeccoes.has(x.id)) || apagarCategorias.includes(x.categoriaId))
        .map((x) => x.id),
    },
  };
}

/** A categoria onde o produto aparece: a gravada, ou a que sai da família, da carta e da categoria. */
export const categoriaDe = (produto: Produto): string => produto.categoriaId ?? categoriaDoProduto(produto).id;

import { asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  EsquemaHorarios,
  EsquemaProduto,
  type ConfiguracaoDaCasa,
  type DefinicoesLoja,
  type OrdemEmenta,
  type Produto,
} from "@/lib/dados/tipos";
import { categoriaDoProduto } from "./categorias";
import {
  casa,
  categorias,
  extras,
  produtos,
  produtosExtras,
  produtosVariancias,
  variancias,
  variantes,
  variantesLeva,
} from "./esquema";
import type { BatchItem } from "drizzle-orm/batch";

/**
 * # O catálogo e a casa, entre o contrato e as tabelas
 *
 * Traduz nos dois sentidos: o `Produto` de `src/lib/dados/tipos.ts` para as
 * linhas de `produtos` e `variantes`, e de volta. A importação (#28) usa o
 * primeiro sentido; a fonte sobre a base de dados (#29) usa os dois.
 *
 * ⚠️ **Ao ler, valida-se com o esquema do contrato.** Os `jsonb` (a composição,
 * os horários) a base de dados guarda sem olhar para dentro; quem garante a
 * forma deles é o `zod`. Uma linha que não passe é um erro, não um dado: é
 * melhor rebentar aqui do que mostrar um kit com a composição partida.
 */

/** Uma base de dados qualquer: a Neon no site, o PGlite nos testes. */
export type BaseDeDados = PgDatabase<PgQueryResultHKT>;

type LinhaProduto = typeof produtos.$inferSelect;
type LinhaVariante = typeof variantes.$inferSelect;
type LinhaCasa = typeof casa.$inferSelect;
type LinhaLeva = typeof variantesLeva.$inferSelect;
/** As peças partilhadas de um produto, já pela ordem dele (#88). */
type PecasLidas = {
  variancias: (typeof variancias.$inferSelect)[];
  extras: (typeof extras.$inferSelect)[];
  leva: LinhaLeva[];
};

// ——— Produto ———

/**
 * As colunas que a gerente grava ao editar um produto: tudo o que a entrada do
 * painel traz (`EsquemaEntradaProduto`). Ficam de fora o id e a posição, que não
 * mudam, e os três interruptores do balcão — arquivado, fora de venda, esgotado
 * —, que têm funções próprias: a gerente a gravar um preço não pode desfazer o
 * «esgotado» que o balcão acabou de marcar.
 */
export function colunasEditaveis(produto: Produto) {
  return {
    origem: produto.origem,
    familia: produto.familia,
    /* A que a gerente escolheu (26/11); sem ela, sai da família, da carta e da
       categoria, como desde a #124. */
    categoriaId: produto.categoriaId ?? categoriaDoProduto(produto).id,
    tipo: produto.tipo,
    nomePt: produto.nome.pt,
    nomeEn: produto.nome.en,
    descricaoPt: produto.descricao?.pt ?? null,
    descricaoEn: produto.descricao?.en ?? null,
    carta: produto.carta,
    categoria: produto.categoria,
    subcategoria: produto.subcategoria,
    unidade: produto.unidade,
    /* Os sabores de antes da #88 passaram a variâncias na `0011`; a coluna fica
       para o código de antes, e já ninguém a escreve. */
    escolhas: [],
    opcoes: produto.opcoes,
    tempoProducaoUnidade: produto.tempoProducao?.unidade ?? null,
    tempoProducaoValor: produto.tempoProducao?.valor ?? null,
    quantidadeMinima: produto.quantidadeMinima,
    multiplo: produto.multiplo,
    aVendaOnline: produto.aVendaOnline,
    apareceNaEmenta: produto.apareceNaEmenta,
    alergenios: produto.alergenios,
    vegan: produto.vegan,
    semGluten: produto.semGluten,
    pedeConfirmacao: produto.pedeConfirmacao,
    fotos: produto.fotos,
    sinalPercent: produto.sinalPercent,
    limiteQuantidade: produto.limite?.quantidade ?? null,
    limiteModo: produto.limite?.modo ?? null,
  } satisfies Partial<typeof produtos.$inferInsert>;
}

export function produtoParaLinhas(produto: Produto, posicao: number) {
  const linha = {
    id: produto.id,
    posicao,
    ...colunasEditaveis(produto),
    arquivado: produto.arquivado,
    foraDeVenda: produto.foraDeVenda,
    esgotadoNoDia: produto.esgotadoNoDia,
  } satisfies typeof produtos.$inferInsert;

  const linhasVariantes = produto.variantes.map(
    (variante, i) =>
      ({
        produtoId: produto.id,
        id: variante.id,
        posicao: i,
        rotuloPt: variante.rotulo?.pt ?? null,
        rotuloEn: variante.rotulo?.en ?? null,
        pessoas: variante.pessoas,
        precoCent: variante.precoCent,
        composicao: variante.composicao,
        ativa: variante.ativa,
      }) satisfies typeof variantes.$inferInsert,
  );
  const linhasLeva = produto.variantes.flatMap((variante) =>
    variante.leva.map(
      (l, i) =>
        ({
          produtoId: produto.id,
          varianteId: variante.id,
          posicao: i,
          simplesId: l.produtoId,
          quantidade: l.quantidade,
        }) satisfies typeof variantesLeva.$inferInsert,
    ),
  );
  const linhasVariancias = produto.variancias.map(
    (v) => ({ id: v.id, nomePt: v.nome.pt, nomeEn: v.nome.en, escolhas: v.escolhas }) satisfies typeof variancias.$inferInsert,
  );
  const linhasExtras = produto.extras.map(
    (e) =>
      ({
        id: e.id,
        nomePt: e.nome.pt,
        nomeEn: e.nome.en,
        precoCent: e.precoCent,
        maximo: e.maximo,
        ativo: e.ativo,
      }) satisfies typeof extras.$inferInsert,
  );

  /* A categoria vai junto: ao criar ou editar um produto numa categoria que
     ainda não existe, quem grava cria-a primeiro (`categoriaNova`). */
  return {
    produto: linha,
    variantes: linhasVariantes,
    leva: linhasLeva,
    variancias: linhasVariancias,
    ligacoesVariancias: produto.variancias.map((v, i) => ({ produtoId: produto.id, varianciaId: v.id, posicao: i })),
    extras: linhasExtras,
    ligacoesExtras: produto.extras.map((e, i) => ({ produtoId: produto.id, extraId: e.id, posicao: i })),
    /* `null` quando a gerente a escolheu: essa já existe, e quem grava confere-o. */
    categoria: produto.categoriaId === undefined ? categoriaDoProduto(produto) : null,
  };
}

/**
 * As instruções que gravam as peças de um produto (#88), **depois** de o produto
 * e as variantes existirem (as chaves estrangeiras). As variâncias e os extras
 * gravam-se por cima dos que já existam com o mesmo id: é o «ligar», e muda-os
 * em todos os produtos que os têm. As ligações e o que os grupos levam
 * trocam-se inteiros. Um `insert` sem linhas rebenta no Drizzle: só entra o
 * que tem.
 */
export function gravarPecas(db: BaseDeDados, linhas: ReturnType<typeof produtoParaLinhas>): BatchItem<"pg">[] {
  const id = linhas.produto.id;
  const instrucoes: BatchItem<"pg">[] = [
    db.delete(produtosVariancias).where(eq(produtosVariancias.produtoId, id)),
    db.delete(produtosExtras).where(eq(produtosExtras.produtoId, id)),
  ];
  if (linhas.variancias.length > 0) {
    instrucoes.push(
      db
        .insert(variancias)
        .values(linhas.variancias)
        .onConflictDoUpdate({
          target: variancias.id,
          set: { nomePt: sql`excluded.nome_pt`, nomeEn: sql`excluded.nome_en`, escolhas: sql`excluded.escolhas` },
        }),
      db.insert(produtosVariancias).values(linhas.ligacoesVariancias),
    );
  }
  if (linhas.extras.length > 0) {
    instrucoes.push(
      db
        .insert(extras)
        .values(linhas.extras)
        .onConflictDoUpdate({
          target: extras.id,
          set: {
            nomePt: sql`excluded.nome_pt`,
            nomeEn: sql`excluded.nome_en`,
            precoCent: sql`excluded.preco_cent`,
            maximo: sql`excluded.maximo`,
            ativo: sql`excluded.ativo`,
          },
        }),
      db.insert(produtosExtras).values(linhas.ligacoesExtras),
    );
  }
  if (linhas.leva.length > 0) instrucoes.push(db.insert(variantesLeva).values(linhas.leva));
  return instrucoes;
}

/**
 * Cria a categoria de um produto, se ainda não existir, no fim da ordem. Vai no
 * mesmo lote que grava o produto e **antes** dele, por causa da chave estrangeira.
 *
 * Só acontece se a gerente puser um artigo numa carta e categoria que ninguém
 * usava («bolos inteiros» na carta da casa): sem isto, a gravação rebentava na
 * chave estrangeira. Uma que já existe fica como está — com o nome e a posição
 * que a gerente lhe deu.
 */
export function categoriaNova(db: BaseDeDados, categoria: ReturnType<typeof categoriaDoProduto>) {
  /* No fim da família dela, e não do catálogo todo: a posição conta dentro da família. */
  const naFamilia = sql`(select coalesce(max(${categorias.posicao}), -1) + 1 from ${categorias} where ${categorias.familiaId} = ${categoria.familiaId})`;
  return db.insert(categorias).values({ ...categoria, posicao: naFamilia }).onConflictDoNothing({ target: categorias.id });
}

/** As variantes já vêm pela ordem delas (`posicao`). */
export function linhasParaProduto(
  linha: LinhaProduto,
  linhasVariantes: LinhaVariante[],
  pecas: PecasLidas = { variancias: [], extras: [], leva: [] },
): Produto {
  return EsquemaProduto.parse({
    id: linha.id,
    origem: linha.origem,
    familia: linha.familia,
    categoriaId: linha.categoriaId,
    nome: { pt: linha.nomePt, en: linha.nomeEn },
    descricao: linha.descricaoPt === null ? null : { pt: linha.descricaoPt, en: linha.descricaoEn },
    carta: linha.carta,
    categoria: linha.categoria,
    subcategoria: linha.subcategoria,
    unidade: linha.unidade,
    variantes: linhasVariantes.map((v) => ({
      id: v.id,
      rotulo: v.rotuloPt === null ? null : { pt: v.rotuloPt, en: v.rotuloEn },
      pessoas: v.pessoas,
      precoCent: v.precoCent,
      composicao: v.composicao,
      ativa: v.ativa,
      leva: pecas.leva
        .filter((l) => l.varianteId === v.id)
        .map((l) => ({ produtoId: l.simplesId, quantidade: l.quantidade })),
    })),
    tipo: linha.tipo,
    variancias: pecas.variancias.map((v) => ({ id: v.id, nome: { pt: v.nomePt, en: v.nomeEn }, escolhas: v.escolhas })),
    opcoes: linha.opcoes,
    extras: pecas.extras.map((e) => ({
      id: e.id,
      nome: { pt: e.nomePt, en: e.nomeEn },
      precoCent: e.precoCent,
      maximo: e.maximo,
      ativo: e.ativo,
    })),
    tempoProducao:
      linha.tempoProducaoUnidade === null
        ? null
        : { unidade: linha.tempoProducaoUnidade, valor: linha.tempoProducaoValor },
    quantidadeMinima: linha.quantidadeMinima,
    multiplo: linha.multiplo,
    aVendaOnline: linha.aVendaOnline,
    apareceNaEmenta: linha.apareceNaEmenta,
    alergenios: linha.alergenios,
    vegan: linha.vegan,
    semGluten: linha.semGluten,
    pedeConfirmacao: linha.pedeConfirmacao,
    fotos: linha.fotos,
    sinalPercent: linha.sinalPercent,
    limite:
      linha.limiteQuantidade === null ? null : { quantidade: linha.limiteQuantidade, modo: linha.limiteModo },
    arquivado: linha.arquivado,
    foraDeVenda: linha.foraDeVenda,
    esgotadoNoDia: linha.esgotadoNoDia,
  });
}

/**
 * Os produtos que cumprem a `condicao` (todos, sem ela), pela ordem do
 * catálogo, com as variantes.
 *
 * ⚠️ **Duas consultas, ao mesmo tempo, e nunca uma por produto** (`robustez.md`
 * › sem N+1). As variantes escolhem-se pela mesma condição, numa subconsulta,
 * para as duas poderem partir juntas: pela Neon cada consulta é uma ida e
 * volta pela rede.
 */
export async function lerProdutos(db: BaseDeDados, condicao?: SQL): Promise<Produto[]> {
  const ids = db.select({ id: produtos.id }).from(produtos).where(condicao);
  const dos = <T extends SQL | undefined>(coluna: Parameters<typeof inArray>[0]) =>
    (condicao ? inArray(coluna, ids) : undefined) as T;
  const [linhas, todasVariantes, todasVariancias, todosExtras, todaLeva] = await Promise.all([
    db.select().from(produtos).where(condicao).orderBy(asc(produtos.posicao)),
    db.select().from(variantes).where(dos(variantes.produtoId)).orderBy(asc(variantes.posicao)),
    /* As peças da #88: uma consulta por tabela, ao mesmo tempo, com a ligação ao
       produto para a ordem dele. */
    db
      .select({ produtoId: produtosVariancias.produtoId, peca: variancias })
      .from(produtosVariancias)
      .innerJoin(variancias, eq(variancias.id, produtosVariancias.varianciaId))
      .where(dos(produtosVariancias.produtoId))
      .orderBy(asc(produtosVariancias.posicao)),
    db
      .select({ produtoId: produtosExtras.produtoId, peca: extras })
      .from(produtosExtras)
      .innerJoin(extras, eq(extras.id, produtosExtras.extraId))
      .where(dos(produtosExtras.produtoId))
      .orderBy(asc(produtosExtras.posicao)),
    db.select().from(variantesLeva).where(dos(variantesLeva.produtoId)).orderBy(asc(variantesLeva.posicao)),
  ]);
  const porProduto = Map.groupBy(todasVariantes, (v) => v.produtoId);
  const varianciasDe = Map.groupBy(todasVariancias, (v) => v.produtoId);
  const extrasDe = Map.groupBy(todosExtras, (e) => e.produtoId);
  const levaDe = Map.groupBy(todaLeva, (l) => l.produtoId);
  return linhas.map((linha) =>
    linhasParaProduto(linha, porProduto.get(linha.id) ?? [], {
      variancias: (varianciasDe.get(linha.id) ?? []).map((v) => v.peca),
      extras: (extrasDe.get(linha.id) ?? []).map((e) => e.peca),
      leva: levaDe.get(linha.id) ?? [],
    }),
  );
}

/** O catálogo inteiro, arquivados incluídos. */
export const lerCatalogo = (db: BaseDeDados) => lerProdutos(db);

// ——— A casa ———

export type DadosDaCasa = {
  configuracao: ConfiguracaoDaCasa;
  definicoes: DefinicoesLoja;
  ordem: OrdemEmenta;
};

/** As colunas que a gerente grava na secção Horários (`EsquemaHorarios`). */
export function colunasDosHorarios(configuracao: ConfiguracaoDaCasa) {
  return {
    horarioLoja: configuracao.loja,
    horarioCozinha: configuracao.cozinha,
    diasFechados: [...configuracao.diasFechados],
    duracaoVagaMinutos: configuracao.duracaoVagaMinutos,
    limitePorVaga: configuracao.limitePorVaga,
    diasAFrente: configuracao.diasAFrente,
    limiarLivre: configuracao.limiaresAfluencia.livre,
    limiarMedia: configuracao.limiaresAfluencia.media,
  } satisfies Partial<typeof casa.$inferInsert>;
}

/**
 * As colunas que a gerente grava em Definições (`EsquemaDefinicoes`). ⚠️ Sem a
 * pausa, que tem função própria (`pausarLoja`): gravar o valor mínimo não pode
 * reabrir uma loja que o balcão acabou de pausar.
 */
export function colunasDasDefinicoes(definicoes: Omit<DefinicoesLoja, "pausaAte">) {
  return {
    aceitarCancelamentosSite: definicoes.aceitarCancelamentosSite,
    devolverSinalAoCancelar: definicoes.devolverSinalAoCancelar,
    valorMinimoCent: definicoes.valorMinimoCent,
  } satisfies Partial<typeof casa.$inferInsert>;
}

export function casaParaLinha({ configuracao, definicoes, ordem }: DadosDaCasa) {
  return {
    id: 1,
    ...colunasDosHorarios(configuracao),
    ...colunasDasDefinicoes(definicoes),
    pausaAte: definicoes.pausaAte,
    ordemEmenta: ordem,
  } satisfies typeof casa.$inferInsert;
}

export function linhaParaCasa(linha: LinhaCasa): DadosDaCasa {
  /* O `EsquemaHorarios` é o mesmo que valida o que a gerente grava: um horário
     que ele recusaria ao gravar também é recusado ao ler. */
  const configuracao = EsquemaHorarios.parse({
    loja: linha.horarioLoja,
    cozinha: linha.horarioCozinha,
    diasFechados: linha.diasFechados,
    duracaoVagaMinutos: linha.duracaoVagaMinutos,
    limitePorVaga: linha.limitePorVaga,
    diasAFrente: linha.diasAFrente,
    limiaresAfluencia: { livre: linha.limiarLivre, media: linha.limiarMedia },
  });
  return {
    configuracao,
    definicoes: {
      aceitarCancelamentosSite: linha.aceitarCancelamentosSite,
      devolverSinalAoCancelar: linha.devolverSinalAoCancelar,
      valorMinimoCent: linha.valorMinimoCent,
      pausaAte: linha.pausaAte,
    },
    ordem: linha.ordemEmenta,
  };
}

/** A casa, ou `null` se a base de dados ainda não foi importada. */
export async function lerCasa(db: BaseDeDados): Promise<DadosDaCasa | null> {
  const [linha] = await db.select().from(casa).where(eq(casa.id, 1));
  return linha ? linhaParaCasa(linha) : null;
}

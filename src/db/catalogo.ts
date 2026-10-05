import { asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  EsquemaHorarios,
  EsquemaProduto,
  type ConfiguracaoDaCasa,
  type DefinicoesLoja,
  type OrdemEmenta,
  type Produto,
} from "@/lib/dados/tipos";
import { casa, produtos, variantes } from "./esquema";

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

// ——— Produto ———

export function produtoParaLinhas(produto: Produto, posicao: number) {
  const linha = {
    id: produto.id,
    posicao,
    origem: produto.origem,
    familia: produto.familia,
    nomePt: produto.nome.pt,
    nomeEn: produto.nome.en,
    descricaoPt: produto.descricao?.pt ?? null,
    descricaoEn: produto.descricao?.en ?? null,
    carta: produto.carta,
    categoria: produto.categoria,
    subcategoria: produto.subcategoria,
    unidade: produto.unidade,
    escolhas: produto.escolhas,
    tempoProducaoUnidade: produto.tempoProducao?.unidade ?? null,
    tempoProducaoValor: produto.tempoProducao?.valor ?? null,
    quantidadeMinima: produto.quantidadeMinima,
    multiplo: produto.multiplo,
    aVendaOnline: produto.aVendaOnline,
    apareceNaEmenta: produto.apareceNaEmenta,
    alergenios: produto.alergenios,
    vegan: produto.vegan,
    semGluten: produto.semGluten,
    fotos: produto.fotos,
    sinalPercent: produto.sinalPercent,
    limiteQuantidade: produto.limite?.quantidade ?? null,
    limiteModo: produto.limite?.modo ?? null,
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
      }) satisfies typeof variantes.$inferInsert,
  );

  return { produto: linha, variantes: linhasVariantes };
}

/** As variantes já vêm pela ordem delas (`posicao`). */
export function linhasParaProduto(linha: LinhaProduto, linhasVariantes: LinhaVariante[]): Produto {
  return EsquemaProduto.parse({
    id: linha.id,
    origem: linha.origem,
    familia: linha.familia,
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
    })),
    escolhas: linha.escolhas,
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
 * O catálogo inteiro, arquivados incluídos, pela ordem do catálogo. Duas
 * consultas e não uma por produto (`robustez.md` › sem N+1).
 */
export async function lerCatalogo(db: BaseDeDados): Promise<Produto[]> {
  const [linhas, todasVariantes] = await Promise.all([
    db.select().from(produtos).orderBy(asc(produtos.posicao)),
    db.select().from(variantes).orderBy(asc(variantes.posicao)),
  ]);
  const porProduto = Map.groupBy(todasVariantes, (v) => v.produtoId);
  return linhas.map((linha) => linhasParaProduto(linha, porProduto.get(linha.id) ?? []));
}

// ——— A casa ———

export type DadosDaCasa = {
  configuracao: ConfiguracaoDaCasa;
  definicoes: DefinicoesLoja;
  ordem: OrdemEmenta;
};

export function casaParaLinha({ configuracao, definicoes, ordem }: DadosDaCasa) {
  return {
    id: 1,
    horarioLoja: configuracao.loja,
    horarioCozinha: configuracao.cozinha,
    diasFechados: [...configuracao.diasFechados],
    duracaoVagaMinutos: configuracao.duracaoVagaMinutos,
    limitePorVaga: configuracao.limitePorVaga,
    diasAFrente: configuracao.diasAFrente,
    limiarLivre: configuracao.limiaresAfluencia.livre,
    limiarMedia: configuracao.limiaresAfluencia.media,
    aceitarCancelamentosSite: definicoes.aceitarCancelamentosSite,
    devolverSinalAoCancelar: definicoes.devolverSinalAoCancelar,
    valorMinimoCent: definicoes.valorMinimoCent,
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

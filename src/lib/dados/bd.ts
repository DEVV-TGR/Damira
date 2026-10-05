import { and, eq, inArray } from "drizzle-orm";
import { lerCasa, lerProdutos, type BaseDeDados, type DadosDaCasa } from "@/db/catalogo";
import { produtos } from "@/db/esquema";
import { cotarLinhas } from "./regras";
import { EsquemaLinhaCesto, type FonteLoja } from "./tipos";

/**
 * # A fonte sobre a base de dados (#29, #31)
 *
 * A mesma `FonteDeDados` que o `json.ts`, com a base de dados do outro lado. As
 * páginas não dão pela troca: é a mesma interface, e as regras partilhadas
 * (`regras.ts`) são as mesmas.
 *
 * ⚠️ **Ainda só a metade do catálogo e da casa.** Os pedidos esperam pelas
 * tabelas deles (`docs/loja/base-de-dados.md` › Em aberto), e esta fonte ainda
 * não está ligada ao site: liga-se no `index.ts` quando houver conta Neon
 * (`docs/loja/ligar-a-neon.md`). Até lá vive testada ao lado da dos JSON.
 *
 * ⚠️ **Nada daqui vai para cache** por iniciativa própria. As páginas públicas
 * são estáticas e revalidam-se quando a gerente grava (`painel-gerente.md`); as
 * vagas, o checkout e o painel leem sempre (`robustez.md` › Cache).
 */

export type FonteCatalogoBd = Pick<
  FonteLoja,
  "listarProdutos" | "produtoPorId" | "ordemDaEmenta" | "configuracaoDaCasa" | "definicoesLoja" | "cotarCesto"
>;

export function criarFonteBd(db: BaseDeDados): FonteCatalogoBd {
  /* Sem a linha da casa a base de dados não foi importada, e não há horário
     nenhum para mostrar: rebenta a dizer o que falta, em vez de inventar um. */
  const casa = async (): Promise<DadosDaCasa> => {
    const lida = await lerCasa(db);
    if (!lida) {
      throw new Error(
        "src/lib/dados/bd.ts: a base de dados não tem a casa — falta importar o catálogo " +
          "(docs/loja/ligar-a-neon.md).",
      );
    }
    return lida;
  };

  return {
    async listarProdutos(filtro = {}) {
      /* O `and` ignora os `undefined`: um filtro que não vem não filtra. */
      return lerProdutos(
        db,
        and(
          filtro.incluirArquivados ? undefined : eq(produtos.arquivado, false),
          filtro.origem === undefined ? undefined : eq(produtos.origem, filtro.origem),
          filtro.familia === undefined ? undefined : eq(produtos.familia, filtro.familia),
          filtro.aVendaOnline === undefined ? undefined : eq(produtos.aVendaOnline, filtro.aVendaOnline),
          filtro.apareceNaEmenta === undefined ? undefined : eq(produtos.apareceNaEmenta, filtro.apareceNaEmenta),
        ),
      );
    },

    async produtoPorId(id) {
      const [produto] = await lerProdutos(db, and(eq(produtos.id, id), eq(produtos.arquivado, false)));
      return produto ?? null;
    },

    async ordemDaEmenta() {
      return (await casa()).ordem;
    },

    async configuracaoDaCasa() {
      return (await casa()).configuracao;
    },

    async definicoesLoja() {
      return (await casa()).definicoes;
    },

    async cotarCesto(entrada) {
      const lido = EsquemaLinhaCesto.array().max(50).safeParse(entrada);
      if (!lido.success) return { ok: false, erro: "dados-invalidos" };

      /* Só os produtos do cesto, numa consulta — e com os arquivados e os
         tirados de venda, que o `cotarLinhas` recusa com o erro certo em vez de
         «produto desconhecido». */
      const ids = [...new Set(lido.data.map((linha) => linha.produtoId))];
      const doCesto = await lerProdutos(db, inArray(produtos.id, ids));
      const porId = new Map(doCesto.map((produto) => [produto.id, produto]));
      return { ok: true, cotacao: cotarLinhas(lido.data, (id) => porId.get(id)) };
    },
  };
}

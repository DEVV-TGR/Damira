import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { produtos } from "@/db/esquema";
import { importarCatalogo, origemDosJson } from "@/db/importar-catalogo";
import { loteEmTransacao } from "@/db/lote";
import { baseDeTeste } from "@/db/teste";
import { criarFonteBd } from "./bd";
import { CATALOGO_JSON, criarFonteJson } from "./json";
import type { FiltroProdutos } from "./tipos";

/**
 * # A fonte da base de dados dá as mesmas respostas que a dos JSON
 *
 * A dos JSON é a referência: é a que as páginas usam hoje, e a que os testes do
 * Gonçalo descrevem. Aqui as duas respondem às mesmas perguntas, lado a lado,
 * com o mesmo catálogo — a da base de dados depois de o importar para um
 * PGlite. Se a troca no `index.ts` mudasse alguma coisa para as páginas, era
 * aqui que se via.
 */

const { db, cliente } = await baseDeTeste();
await importarCatalogo(db, await origemDosJson());
afterAll(() => cliente.close());

const json = criarFonteJson();
const bd = criarFonteBd(db, loteEmTransacao(db));

/* Produtos reais do catálogo, escolhidos pelo que têm de diferente. */
const AO_QUILO = CATALOGO_JSON.find((p) => p.unidade === "kg" && p.aVendaOnline)!;
const SO_AO_BALCAO = CATALOGO_JSON.find((p) => p.origem === "ementa" && !p.aVendaOnline)!;
const A_DUZIA = CATALOGO_JSON.find((p) => p.origem === "ementa" && p.aVendaOnline && p.multiplo > 1)!;

describe("as leituras dão o mesmo", () => {
  it.each<[string, FiltroProdutos | undefined]>([
    ["sem filtro", undefined],
    ["a ementa", { origem: "ementa" }],
    ["as encomendas", { origem: "encomendas" }],
    ["os kits de festa", { familia: "festa" }],
    ["o que se vende online", { aVendaOnline: true }],
    ["o que não aparece na ementa", { apareceNaEmenta: false }],
    ["com os arquivados", { incluirArquivados: true }],
  ])("listar produtos: %s", async (_, filtro) => {
    expect(await bd.listarProdutos(filtro)).toEqual(await json.listarProdutos(filtro));
  });

  it("um produto pelo id, e um que não existe", async () => {
    expect(await bd.produtoPorId("festa-premium")).toEqual(await json.produtoPorId("festa-premium"));
    expect(await bd.produtoPorId(AO_QUILO.id)).toEqual(await json.produtoPorId(AO_QUILO.id));
    expect(await bd.produtoPorId("nao-existe")).toBeNull();
  });

  it("a ordem da ementa, a configuração da casa e as definições", async () => {
    expect(await bd.ordemDaEmenta()).toEqual(await json.ordemDaEmenta());
    expect(await bd.configuracaoDaCasa()).toEqual(await json.configuracaoDaCasa());
    expect(await bd.definicoesLoja()).toEqual(await json.definicoesLoja());
  });
});

describe("o preço do cesto dá o mesmo", () => {
  const unica = (produtoId: string, quantidade: number) => ({ produtoId, varianteId: "unica", quantidade });

  it.each<[string, unknown]>([
    ["um kit de festa", [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }]],
    ["ao quilo, quilo e meio", [unica(AO_QUILO.id, 1.5)]],
    ["um artigo à dúzia, no mínimo", [unica(A_DUZIA.id, A_DUZIA.quantidadeMinima)]],
    ["abaixo do mínimo", [unica(A_DUZIA.id, 1)]],
    ["fora do múltiplo", [unica(A_DUZIA.id, A_DUZIA.quantidadeMinima + 1)]],
    ["um artigo que só se pede ao balcão", [unica(SO_AO_BALCAO.id, 1)]],
    ["o bolo por medida, sob orçamento", [unica("bolo-por-medida", 1)]],
    ["um produto que não existe", [unica("nao-existe", 1)]],
    ["uma variante que não existe", [{ produtoId: "festa-premium", varianteId: "999", quantidade: 1 }]],
    ["o mesmo produto em duas linhas", [unica(AO_QUILO.id, 1), unica(AO_QUILO.id, 2)]],
    ["um cesto vazio", []],
    ["uma linha com preço, que se recusa", [{ ...unica(AO_QUILO.id, 1), precoCent: 1 }]],
    ["lixo", "não é um cesto"],
  ])("%s", async (_, cesto) => {
    expect(await bd.cotarCesto(cesto)).toEqual(await json.cotarCesto(cesto));
  });
});

describe("as perguntas têm respostas a sério", () => {
  /* Duas fontes vazias, ou a recusar tudo, também «dão o mesmo». Isto confirma
     que as comparações de cima compararam alguma coisa. */
  it("as listas têm produtos, e os cestos válidos têm preço", async () => {
    expect(await bd.listarProdutos({ origem: "ementa" })).toHaveLength(95);
    expect((await bd.listarProdutos({ familia: "festa" })).length).toBeGreaterThan(0);

    const kit = await bd.cotarCesto([{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }]);
    expect(kit.ok && kit.cotacao.valida && kit.cotacao.totalCent > 0).toBe(true);

    const precoAoQuilo = AO_QUILO.variantes[0].precoCent!;
    const quilo = await bd.cotarCesto([{ produtoId: AO_QUILO.id, varianteId: "unica", quantidade: 1.5 }]);
    expect(quilo.ok && quilo.cotacao.totalCent).toBe(Math.round(precoAoQuilo * 1.5));
  });
});

describe("o que a base de dados muda, a fonte lê", () => {
  it("um produto arquivado sai das listas e do id, e o cesto recusa-o como fora de venda", async () => {
    await cliente.exec("begin");
    try {
      await db.update(produtos).set({ arquivado: true }).where(eq(produtos.id, "festa-premium"));

      expect(await bd.produtoPorId("festa-premium")).toBeNull();
      expect((await bd.listarProdutos()).some((p) => p.id === "festa-premium")).toBe(false);
      expect((await bd.listarProdutos({ incluirArquivados: true })).some((p) => p.id === "festa-premium")).toBe(true);

      const cotado = await bd.cotarCesto([{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }]);
      expect(cotado.ok && cotado.cotacao.linhas[0].erro).toBe("fora-de-venda");
    } finally {
      await cliente.exec("rollback");
    }
  });
});

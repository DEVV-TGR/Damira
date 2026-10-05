import { TZDate } from "@date-fns/tz";
import { afterAll, describe, expect, it } from "vitest";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { criarFonteBd } from "./bd";
import { criarFonteJson } from "./json";
import { EsquemaProduto, type ContextoPainel, type EntradaProduto, type Produto } from "./tipos";

/**
 * # As escritas de produtos dão o mesmo nas duas fontes (#31)
 *
 * Cada teste faz a mesma sequência de operações na fonte dos JSON (a
 * referência) e na da base de dados — esta numa cópia limpa do catálogo
 * importado —, compara cada resposta, e no fim compara o catálogo inteiro e o
 * preço de um cesto. Se a gerente gravar alguma coisa e as duas fontes ficarem
 * diferentes, é aqui que se vê.
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

/* Segunda, 5 de outubro de 2026, às 10h00 de Lisboa. */
const AGORA = new TZDate(2026, 9, 5, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };

/* As duas fontes, cada uma com o seu estado novo. */
async function ambas() {
  const { db, cliente } = await modelo.copia();
  return { json: criarFonteJson(), bd: criarFonteBd(db, loteEmTransacao(db)), fechar: () => cliente.close() };
}

type Fontes = Awaited<ReturnType<typeof ambas>>;

/* Corre a mesma operação nas duas e exige a mesma resposta. */
async function igual<T>(fontes: Fontes, operacao: (fonte: Fontes["json"] | Fontes["bd"]) => Promise<T>): Promise<T> {
  const daJson = await operacao(fontes.json);
  expect(await operacao(fontes.bd)).toEqual(daJson);
  return daJson;
}

/* O fim de cada teste: o catálogo inteiro e um cesto, iguais nas duas. */
async function mesmoCatalogo(fontes: Fontes, cesto: unknown = []) {
  await igual(fontes, (f) => f.listarProdutos({ incluirArquivados: true }));
  await igual(fontes, (f) => f.cotarCesto(cesto));
}

const novoBolo = (alteracoes: Partial<EntradaProduto> = {}): EntradaProduto => ({
  origem: "encomendas",
  familia: "bolo",
  nome: { pt: "Bolo de Bolacha", en: null },
  descricao: null,
  carta: null,
  categoria: null,
  subcategoria: null,
  unidade: "un",
  variantes: [{ rotulo: null, pessoas: null, precoCent: 2500, composicao: [] }],
  escolhas: [],
  tempoProducao: { unidade: "dias", valor: 2 },
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: true,
  apareceNaEmenta: false,
  alergenios: ["gluten", "ovo"],
  vegan: false,
  semGluten: false,
  fotos: [],
  sinalPercent: null,
  limite: null,
  ...alteracoes,
});

/* O que a gerente vê ao abrir um produto, pronto a gravar: sem o id e os
   interruptores do balcão, e com os alergénios respondidos (sem eles, não se
   grava nada à venda online). */
const SO_DA_ENTRADA = EsquemaProduto.omit({ id: true, arquivado: true, foraDeVenda: true, esgotadoNoDia: true });
const entradaDe = (produto: Produto): EntradaProduto => {
  const entrada = SO_DA_ENTRADA.parse(produto);
  return { ...entrada, alergenios: entrada.alergenios ?? [] };
};

describe("criar produtos", () => {
  it("o id sai do nome e nunca repete; o produto vai para o fim do catálogo", async () => {
    const fontes = await ambas();
    try {
      const primeiro = await igual(fontes, (f) => f.criarProduto(novoBolo(), GERENTE));
      expect(primeiro.ok && primeiro.valor.id).toBe("bolo-de-bolacha");
      const segundo = await igual(fontes, (f) => f.criarProduto(novoBolo(), GERENTE));
      expect(segundo.ok && segundo.valor.id).toBe("bolo-de-bolacha-2");
      await mesmoCatalogo(fontes, [{ produtoId: "bolo-de-bolacha-2", varianteId: "unica", quantidade: 1 }]);
    } finally {
      await fontes.fechar();
    }
  });

  it("as variantes ganham ids pelo que as distingue", async () => {
    const fontes = await ambas();
    try {
      const variantes = [
        { rotulo: null, pessoas: 20, precoCent: 4000, composicao: [] },
        { rotulo: null, pessoas: 40, precoCent: 7000, composicao: [] },
        { rotulo: { pt: "Meia dúzia", en: null }, pessoas: null, precoCent: 900, composicao: [] },
      ];
      const criado = await igual(fontes, (f) => f.criarProduto(novoBolo({ variantes }), GERENTE));
      expect(criado.ok && criado.valor.variantes.map((v) => v.id)).toEqual(["20", "40", "meia-duzia"]);
      await mesmoCatalogo(fontes);
    } finally {
      await fontes.fechar();
    }
  });

  it.each<[string, Partial<EntradaProduto>]>([
    ["à venda online sem os alergénios respondidos", { alergenios: null }],
    ["um artigo da ementa sem carta", { origem: "ementa", familia: "ementa", categoria: "doces" }],
    ["sem variantes", { variantes: [] }],
    ["um preço negativo", { variantes: [{ rotulo: null, pessoas: null, precoCent: -1, composicao: [] }] }],
  ])("recusa %s, e nada muda", async (_, alteracoes) => {
    const fontes = await ambas();
    try {
      const recusado = await igual(fontes, (f) => f.criarProduto(novoBolo(alteracoes), GERENTE));
      expect(recusado.ok).toBe(false);
      await mesmoCatalogo(fontes);
    } finally {
      await fontes.fechar();
    }
  });
});

describe("editar produtos", () => {
  it("muda um preço, tira um escalão e junta outro: o cesto cobra o novo, e o escalão que saiu já não existe", async () => {
    const fontes = await ambas();
    try {
      const kit = (await fontes.json.produtoPorId("festa-premium"))!;
      const [primeiro, ...resto] = kit.variantes;
      const editado = {
        ...entradaDe(kit),
        variantes: [
          { ...primeiro, precoCent: (primeiro.precoCent ?? 0) + 500 },
          ...resto.slice(0, -1),
          { rotulo: null, pessoas: 100, precoCent: 99000, composicao: [] },
        ],
      };
      const resultado = await igual(fontes, (f) => f.editarProduto("festa-premium", editado, GERENTE));
      expect(resultado.ok).toBe(true);

      const tirado = kit.variantes.at(-1)!.id;
      const cesto = [
        { produtoId: "festa-premium", varianteId: primeiro.id, quantidade: 1 },
        { produtoId: "festa-premium", varianteId: tirado, quantidade: 1 },
        { produtoId: "festa-premium", varianteId: "100", quantidade: 1 },
      ];
      await mesmoCatalogo(fontes, cesto);

      /* Iguais não chega — confirma-se o que se esperava. */
      const cotado = await fontes.bd.cotarCesto(cesto);
      expect(cotado.ok && cotado.cotacao.linhas.map((l) => [l.precoUnitarioCent, l.erro])).toEqual([
        [(primeiro.precoCent ?? 0) + 500, null],
        [null, "variante-desconhecida"],
        [99000, null],
      ]);
    } finally {
      await fontes.fechar();
    }
  });

  it("recusa um id de variante inventado e um produto que não existe", async () => {
    const fontes = await ambas();
    try {
      const kit = (await fontes.json.produtoPorId("festa-premium"))!;
      const inventado = { ...entradaDe(kit), variantes: [{ ...kit.variantes[0], id: "inventado" }] };
      expect((await igual(fontes, (f) => f.editarProduto("festa-premium", inventado, GERENTE))).ok).toBe(false);
      expect(await igual(fontes, (f) => f.editarProduto("nao-existe", entradaDe(kit), GERENTE))).toEqual({
        ok: false,
        erro: "nao-existe",
      });
      await mesmoCatalogo(fontes);
    } finally {
      await fontes.fechar();
    }
  });

  it("gravar um preço não desfaz o que o balcão marcou no mesmo produto", async () => {
    const fontes = await ambas();
    try {
      await igual(fontes, (f) => f.tirarDeVenda("festa-premium", true, GERENTE));
      await igual(fontes, (f) => f.marcarEsgotadoHoje("festa-premium", true, GERENTE));
      const kit = (await fontes.json.produtosDoPainel(GERENTE)).find((p) => p.id === "festa-premium")!;
      const gravado = await igual(fontes, (f) => f.editarProduto("festa-premium", entradaDe(kit), GERENTE));
      expect(gravado.ok && [gravado.valor.foraDeVenda, gravado.valor.esgotadoNoDia]).toEqual([true, "2026-10-05"]);
      await mesmoCatalogo(fontes);
    } finally {
      await fontes.fechar();
    }
  });
});

describe("arquivar, tirar de venda, esgotar hoje", () => {
  it("cada um muda o que deve, e desfaz-se", async () => {
    const fontes = await ambas();
    const cesto = [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }];
    try {
      for (const [ligar, desligar] of [
        [(f: Fontes["bd"]) => f.arquivarProduto("festa-premium", true, GERENTE), (f: Fontes["bd"]) => f.arquivarProduto("festa-premium", false, GERENTE)],
        [(f: Fontes["bd"]) => f.tirarDeVenda("festa-premium", true, GERENTE), (f: Fontes["bd"]) => f.tirarDeVenda("festa-premium", false, GERENTE)],
        [(f: Fontes["bd"]) => f.marcarEsgotadoHoje("festa-premium", true, GERENTE), (f: Fontes["bd"]) => f.marcarEsgotadoHoje("festa-premium", false, GERENTE)],
      ]) {
        await igual(fontes, ligar);
        await mesmoCatalogo(fontes, cesto);
        await igual(fontes, (f) => f.produtoPorId("festa-premium"));
        await igual(fontes, desligar);
        await mesmoCatalogo(fontes, cesto);
      }
    } finally {
      await fontes.fechar();
    }
  });

  it("um produto que não existe", async () => {
    const fontes = await ambas();
    try {
      await igual(fontes, (f) => f.arquivarProduto("nao-existe", true, GERENTE));
      await igual(fontes, (f) => f.tirarDeVenda("nao-existe", true, GERENTE));
      await igual(fontes, (f) => f.marcarEsgotadoHoje("nao-existe", true, GERENTE));
    } finally {
      await fontes.fechar();
    }
  });

  it("na base de dados, um valor que não é sim/não volta como dados inválidos, em vez de rebentar", async () => {
    /* Só na base de dados: a dos JSON rebenta (revisão do #66, nota 3). */
    const { bd, fechar } = await ambas();
    try {
      expect(await bd.arquivarProduto("festa-premium", "sim" as unknown as boolean, GERENTE)).toEqual({
        ok: false,
        erro: "dados-invalidos",
        campos: ["arquivado"],
      });
    } finally {
      await fechar();
    }
  });
});

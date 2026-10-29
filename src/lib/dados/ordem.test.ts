import { describe, expect, it } from "vitest";
import { compararNomes, moverNaLista, ordenarProdutos } from "@/lib/ordenar";
import { fonteDaLoja } from "./fontes-de-teste";
import { CATALOGO_JSON } from "./json";
import { protegerPainel } from "./papeis";
import type { ContextoPainel, FonteDeDados, Produto } from "./tipos";

/*
 * A ordem das categorias e a ordem alfabética dentro delas (#87). Como o
 * `painel.test.ts`, vê a fonte como o `index.ts` a expõe — com o papel
 * verificado por cima — e corre nas duas voltas: contra os JSON e contra a base
 * de dados (`fontes-de-teste.ts`).
 */

const AGORA = new Date("2026-10-16T09:00:00Z");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const BALCAO: ContextoPainel = { papel: "funcionario", agora: AGORA };

const fonte = async (): Promise<FonteDeDados> => {
  const base = await fonteDaLoja();
  return { ...base, ...protegerPainel(base) };
};

const DO_IMPRESSO = ["pausa", "salgados", "pratos", "doces", "bebidas", "bolos-inteiros", "formatos"];
const NOVA = ["doces", "bolos-inteiros", "salgados", "pausa", "pratos", "bebidas", "formatos"];

/* O que a loja recebe: o mesmo que o `listarProdutos` do `index.ts`, que é
   `server-only` e não se importa num teste. */
const daLoja = async (f: FonteDeDados, filtro: Parameters<FonteDeDados["listarProdutos"]>[0]) =>
  ordenarProdutos(await f.listarProdutos(filtro), await f.ordemDaEmenta());

/* As categorias pela ordem em que aparecem numa lista, como as lê a secção
   «Da carta, por encomenda» (`EmentaEncomendavel`). */
const categoriasPorAparecer = (produtos: Produto[], carta: string) => [
  ...new Set(produtos.filter((p) => p.carta === carta).map((p) => p.categoria)),
];

const artigo = (nome: string, alteracoes: Partial<Produto> = {}): Produto => ({
  ...CATALOGO_JSON.find((p) => p.origem === "ementa")!,
  id: nome.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-"),
  nome: { pt: nome, en: null },
  carta: "casa",
  categoria: "doces",
  ...alteracoes,
});

describe("a ordem das categorias, como a gerente a deixa", () => {
  it("por defeito é a do impresso, e cobre todas as categorias que a ementa usa", async () => {
    const f = await fonte();
    const ordem = await f.ordemDaEmenta();
    expect(ordem.categorias).toEqual(DO_IMPRESSO);
    const usadas = new Set((await f.listarProdutos({ origem: "ementa" })).map((p) => p.categoria));
    for (const categoria of usadas) expect(ordem.categorias).toContain(categoria);
  });

  it("a gerente grava, e a seguir lê-se a ordem nova — sem mexer nas cartas nem nos títulos das bebidas", async () => {
    const f = await fonte();
    const antes = await f.ordemDaEmenta();
    const resultado = await f.guardarOrdemCategorias({ categorias: NOVA }, GERENTE);
    expect(resultado).toEqual({ ok: true, valor: { ...antes, categorias: NOVA } });
    expect(await f.ordemDaEmenta()).toEqual({ ...antes, categorias: NOVA });
  });

  it("o balcão é recusado no servidor, e a ordem não muda", async () => {
    const f = await fonte();
    expect(await f.guardarOrdemCategorias({ categorias: NOVA }, BALCAO)).toEqual({ ok: false, erro: "sem-permissao" });
    expect((await f.ordemDaEmenta()).categorias).toEqual(DO_IMPRESSO);
  });

  it("recusa o que não é uma permutação das que existem: faltar, inventar, repetir", async () => {
    const f = await fonte();
    const tentativas: unknown[] = [
      { categorias: NOVA.slice(1) },
      { categorias: [...NOVA, "sopas"] },
      { categorias: [...NOVA.slice(0, -1), "sopas"] },
      { categorias: ["doces", "doces", "salgados", "pausa", "pratos", "bebidas", "formatos"] },
      { categorias: [] },
      { categorias: "doces" },
      NOVA,
      { categorias: NOVA, cartas: ["vegan"] },
    ];
    for (const entrada of tentativas) {
      expect(await f.guardarOrdemCategorias(entrada, GERENTE)).toMatchObject({
        ok: false,
        erro: "dados-invalidos",
        campos: ["categorias"],
      });
    }
    expect((await f.ordemDaEmenta()).categorias).toEqual(DO_IMPRESSO);
  });

  it("quem recebe a ordem pode mexer-lhe sem mudar a da fonte", async () => {
    const f = await fonte();
    const lida = await f.ordemDaEmenta();
    lida.categorias.reverse();
    expect((await f.ordemDaEmenta()).categorias).toEqual(DO_IMPRESSO);
  });
  it("um artigo não entra com uma categoria que não está na ordem — ficava órfão, fora da ementa", async () => {
    const f = await fonte();
    const sopa = (categoria: string) => ({
      origem: "ementa",
      familia: "ementa",
      nome: { pt: "Sopa do Dia", en: null },
      descricao: null,
      carta: "casa",
      categoria,
      subcategoria: null,
      unidade: "un",
      variantes: [{ rotulo: null, pessoas: null, precoCent: 300, composicao: [] }],
      escolhas: [],
      tempoProducao: { unidade: "horas", valor: 2 },
      quantidadeMinima: 1,
      multiplo: 1,
      aVendaOnline: false,
      apareceNaEmenta: true,
      alergenios: null,
      vegan: false,
      semGluten: false,
      fotos: [],
      sinalPercent: null,
      limite: null,
    });
    expect(await f.criarProduto(sopa("sopas"), GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["categoria"],
    });
    const criado = await f.criarProduto(sopa("pratos"), GERENTE);
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;
    expect(await f.editarProduto(criado.valor.id, sopa("sopas"), GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["categoria"],
    });
  });
});

describe("a loja recebe os produtos já pela ordem", () => {
  it("as categorias de cada carta seguem a ordem gravada, na ementa e nas encomendas", async () => {
    const f = await fonte();
    await f.guardarOrdemCategorias({ categorias: NOVA }, GERENTE);

    for (const filtro of [{ origem: "ementa" as const }, { origem: "ementa" as const, aVendaOnline: true }]) {
      const produtos = await daLoja(f, filtro);
      for (const carta of ["casa", "vegan"]) {
        const vistas = categoriasPorAparecer(produtos, carta);
        expect(vistas.length).toBeGreaterThan(1);
        expect(vistas).toEqual(NOVA.filter((c) => vistas.includes(c)));
      }
    }
  });

  it("dentro de cada categoria, por ordem alfabética portuguesa", async () => {
    const produtos = await daLoja(await fonte(), { origem: "ementa" });
    for (const carta of new Set(produtos.map((p) => p.carta))) {
      for (const categoria of categoriasPorAparecer(produtos, carta!)) {
        const nomes = produtos.filter((p) => p.carta === carta && p.categoria === categoria).map((p) => p.nome.pt);
        expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b, "pt")));
      }
    }
  });

  it("os acentos e as maiúsculas não mandam: conta a letra, como num dicionário", () => {
    const nomes = ["Tosta", "pastel", "Éclair", "Pão", "bolo", "Pao", "Bola"];
    const ordenados = ordenarProdutos(nomes.map((n) => artigo(n)), { cartas: ["casa"], categorias: ["doces"] });
    expect(ordenados.map((p) => p.nome.pt)).toEqual(["Bola", "bolo", "Éclair", "Pao", "Pão", "pastel", "Tosta"]);
    /* Em código, o «É» vinha depois do «T»: é isto que o `pt` evita. */
    expect(compararNomes("Éclair", "Tosta")).toBeLessThan(0);
  });

  it("os produtos de encomenda não se ordenam: ficam pela ordem em que vieram, depois dos da carta", () => {
    const kits = CATALOGO_JSON.filter((p) => p.origem === "encomendas");
    const carta = [artigo("Tosta"), artigo("Bola")];
    const ordenados = ordenarProdutos([kits[1], carta[0], kits[0], carta[1], kits[2]], {
      cartas: ["casa"],
      categorias: ["doces"],
    });
    expect(ordenados.map((p) => p.id)).toEqual([carta[1].id, carta[0].id, kits[1].id, kits[0].id, kits[2].id]);
  });

  it("uma categoria que ainda não está na ordem vai para o fim da carta, e não desaparece", () => {
    const ordenados = ordenarProdutos(
      [artigo("Sopa", { categoria: "sopas" }), artigo("Tosta", { categoria: "salgados" }), artigo("Bola")],
      { cartas: ["casa"], categorias: ["salgados", "doces"] },
    );
    expect(ordenados.map((p) => p.nome.pt)).toEqual(["Tosta", "Bola", "Sopa"]);
  });
});

describe("subir e descer no painel", () => {
  it("troca com a vizinha, e nas pontas não dá a volta", () => {
    const lista = ["a", "b", "c"];
    expect(moverNaLista(lista, 1, -1)).toEqual(["b", "a", "c"]);
    expect(moverNaLista(lista, 1, 1)).toEqual(["a", "c", "b"]);
    expect(moverNaLista(lista, 0, -1)).toEqual(lista);
    expect(moverNaLista(lista, 2, 1)).toEqual(lista);
    expect(lista).toEqual(["a", "b", "c"]);
  });
});

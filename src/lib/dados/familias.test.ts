import { describe, expect, it } from "vitest";
import { fonteDaLoja } from "./fontes-de-teste";
import { protegerPainel } from "./papeis";
import { EsquemaProduto, type ContextoPainel, type EntradaFamilias, type Familia, type FonteDeDados } from "./tipos";

/*
 * As famílias e as categorias da gerente (pedido de 26/11). Corre nas duas
 * voltas — contra os JSON e contra a base de dados (`vitest.config.mts`) —,
 * porque a regra é a mesma e as duas fontes gravam-na cada uma à sua maneira.
 */

const AGORA = new Date("2026-11-26T18:00:00Z");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const BALCAO: ContextoPainel = { papel: "funcionario", agora: AGORA };

const fonte = async (): Promise<FonteDeDados> => {
  const base = await fonteDaLoja();
  return { ...base, ...protegerPainel(base) };
};

/** A árvore como o painel a manda: ids das que existem, só o nome das novas. */
const comoEntrada = (arvore: Familia[]): EntradaFamilias["familias"] =>
  arvore.map((f) => ({ id: f.id, nome: f.nome.pt, categorias: f.categorias.map((c) => ({ id: c.id, nome: c.nome.pt })) }));

const gravar = async (f: FonteDeDados, familias: EntradaFamilias["familias"]) => {
  const resultado = await f.guardarFamilias({ familias }, GERENTE);
  if (!resultado.ok) throw new Error(`recusado: ${JSON.stringify(resultado)}`);
  return resultado.valor;
};

describe("as famílias de partida", () => {
  it("são as secções da /encomendas, com as âncoras de hoje, e o Natal", async () => {
    const f = await fonte();
    const arvore = await f.familias();
    expect(arvore.map((familia) => familia.id)).toEqual(["festas", "kits-bolo", "boxes", "da-ementa", "natal"]);
    expect(arvore.find((familia) => familia.id === "natal")?.categorias).toEqual([]);
    expect(arvore.find((familia) => familia.id === "festas")?.categorias.map((c) => c.id)).toEqual(["festas"]);
    expect(arvore.find((familia) => familia.id === "da-ementa")?.categorias.map((c) => c.id)).toContain("vegan-doces");
  });

  it("cada produto sai com a categoria onde aparece, e ela existe", async () => {
    const f = await fonte();
    const existentes = new Set((await f.familias()).flatMap((familia) => familia.categorias.map((c) => c.id)));
    const produtos = await f.listarProdutos();
    expect(produtos.length).toBeGreaterThan(0);
    for (const produto of produtos) expect(existentes).toContain(produto.categoriaId);
    expect(produtos.find((p) => p.id === "bolo-por-medida")?.categoriaId).toBe("kits-bolo");
  });
});

describe("a gerente grava a árvore", () => {
  it("reordena as famílias e as categorias dentro delas", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    const carta = antes.find((familia) => familia.id === "da-ementa")!;
    const nova = [
      { ...antes.find((familia) => familia.id === "natal")! },
      { ...carta, categorias: [...carta.categorias].reverse() },
      ...antes.filter((familia) => familia.id !== "natal" && familia.id !== "da-ementa"),
    ];
    const gravada = await gravar(f, nova);
    expect(gravada.map((familia) => familia.id)).toEqual(["natal", "da-ementa", "festas", "kits-bolo", "boxes"]);
    expect(gravada[1].categorias.map((c) => c.id)).toEqual(carta.categorias.map((c) => c.id).reverse());
    /* E é o que se lê a seguir. */
    expect(await f.familias()).toEqual(gravada);
  });

  it("cria uma família e categorias novas, com um id tirado do nome", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    const gravada = await gravar(f, [
      ...antes.map((familia) =>
        familia.id === "natal" ? { ...familia, categorias: [{ nome: "Bolos de Natal" }, { nome: "Doces" }] } : familia,
      ),
      { nome: "Páscoa", categorias: [] },
    ]);
    const natal = gravada.find((familia) => familia.id === "natal")!;
    expect(natal.categorias.map((c) => [c.id, c.nome.pt])).toEqual([
      ["bolos-de-natal", "Bolos de Natal"],
      /* «Doces» já existe na carta como `casa-doces`; o id novo não o pisa, e o
         nome repete-se porque é noutra família. */
      ["doces", "Doces"],
    ]);
    expect(gravada.at(-1)).toMatchObject({ id: "pascoa", nome: { pt: "Páscoa", en: null }, categorias: [] });
  });

  it("um produto vai para uma categoria do Natal, e a categoria anda com os produtos", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    const gravada = await gravar(
      f,
      antes.map((familia) => (familia.id === "natal" ? { ...familia, categorias: [{ nome: "Bolos de Natal" }] } : familia)),
    );
    const idNatal = gravada.find((familia) => familia.id === "natal")!.categorias[0].id;

    const atual = (await f.produtosDoPainel(GERENTE)).find((p) => p.id === "bolo-de-cenoura")!;
    const entrada = EsquemaProduto.omit({ id: true, arquivado: true, foraDeVenda: true, esgotadoNoDia: true }).parse({
      ...atual,
      alergenios: atual.alergenios ?? [],
      categoriaId: idNatal,
    });
    const editado = await f.editarProduto("bolo-de-cenoura", entrada, GERENTE);
    expect(editado.ok && editado.valor.categoriaId).toBe(idNatal);
    expect((await f.produtoPorId("bolo-de-cenoura"))?.categoriaId).toBe(idNatal);

    /* Uma categoria que não existe recusa-se, com o campo certo. */
    expect(await f.editarProduto("bolo-de-cenoura", { ...entrada, categoriaId: "nao-existe" }, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["categoriaId"],
    });

    /* Mover a categoria para outra família leva o produto com ela. */
    const depois = comoEntrada(await f.familias());
    const natal = depois.find((familia) => familia.id === "natal")!;
    const movida = await gravar(
      f,
      depois.map((familia) =>
        familia.id === "natal"
          ? { ...familia, categorias: [] }
          : familia.id === "boxes"
            ? { ...familia, categorias: [...familia.categorias, ...natal.categorias] }
            : familia,
      ),
    );
    expect(movida.find((familia) => familia.id === "boxes")!.categorias.map((c) => c.id)).toContain(idNatal);
    expect((await f.produtoPorId("bolo-de-cenoura"))?.categoriaId).toBe(idNatal);
  });

  it("apaga o que está vazio, e recusa apagar uma categoria com produtos", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    /* O Natal está vazio: sai. */
    const semNatal = await gravar(
      f,
      antes.filter((familia) => familia.id !== "natal"),
    );
    expect(semNatal.map((familia) => familia.id)).not.toContain("natal");

    /* Os kits de festa têm produtos: a categoria não sai, nem a família. */
    const semFestas = comoEntrada(semNatal).filter((familia) => familia.id !== "festas");
    expect(await f.guardarFamilias({ familias: semFestas }, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["categorias"],
    });
    expect((await f.familias()).map((familia) => familia.id)).toContain("festas");
  });

  it("recusa nomes repetidos, ids que não existem, e quem não é gerente", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    const recusa = (campo: string) => ({ ok: false, erro: "dados-invalidos", campos: [campo] });

    expect(await f.guardarFamilias({ familias: [...antes, { nome: "kit festas", categorias: [] }] }, GERENTE)).toEqual(
      recusa("familias"),
    );
    expect(
      await f.guardarFamilias(
        {
          familias: antes.map((familia) =>
            familia.id === "natal" ? { ...familia, categorias: [{ nome: "Doces" }, { nome: "doces" }] } : familia,
          ),
        },
        GERENTE,
      ),
    ).toEqual(recusa("categorias"));
    expect(await f.guardarFamilias({ familias: [...antes, { id: "inventada", nome: "X", categorias: [] }] }, GERENTE)).toEqual(
      recusa("familias"),
    );
    expect(await f.guardarFamilias({ familias: [] }, GERENTE)).toEqual(recusa("familias"));
    expect(await f.guardarFamilias({ familias: antes }, BALCAO)).toEqual({ ok: false, erro: "sem-permissao" });
    /* Nada disto mudou a árvore. */
    expect(comoEntrada(await f.familias())).toEqual(antes);
  });

  it("um nome mudado perde o inglês, e um que fica guarda-o", async () => {
    const f = await fonte();
    const antes = comoEntrada(await f.familias());
    const gravada = await gravar(
      f,
      antes.map((familia) => (familia.id === "festas" ? { ...familia, nome: "Festas" } : familia)),
    );
    expect(gravada.find((familia) => familia.id === "festas")?.nome).toEqual({ pt: "Festas", en: null });
    expect(gravada.find((familia) => familia.id === "boxes")?.nome.en).toBe("Boxes for special days");
  });
});

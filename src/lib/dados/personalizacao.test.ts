import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { fonteDaLoja } from "./fontes-de-teste";
import { protegerPainel } from "./papeis";
import type { ContextoPainel, EntradaProduto, FonteDeDados, LinhaCesto, Produto } from "./tipos";

/*
 * # A personalização da #88, vista de fora
 *
 * O que a gerente monta no painel e o que o servidor cobra por isso
 * (`painel-gerente.md` › Simples e compostos, `pedidos.md` › Personalização).
 * Corre contra as duas fontes (`vitest.config.mts`): o «ligar» é uma linha só
 * na base de dados e cópias nos JSON, e as duas têm de dizer o mesmo.
 */

const AGORA = new TZDate(2026, 10, 26, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };

const fonte = async (): Promise<FonteDeDados> => {
  const base = await fonteDaLoja();
  return { ...base, ...protegerPainel(base) };
};

const texto = (pt: string) => ({ pt, en: null });

const base = (nome: string, alteracoes: Partial<EntradaProduto>): EntradaProduto => ({
  origem: "encomendas",
  familia: "bolo",
  tipo: "simples",
  nome: texto(nome),
  descricao: null,
  carta: null,
  categoria: null,
  subcategoria: null,
  unidade: "un",
  variantes: [{ rotulo: null, pessoas: null, precoCent: 230, composicao: [] }],
  tempoProducao: { unidade: "horas", valor: 2 },
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: true,
  apareceNaEmenta: false,
  alergenios: [],
  vegan: false,
  semGluten: false,
  pedeConfirmacao: false,
  fotos: [],
  sinalPercent: null,
  limite: null,
  ...alteracoes,
});

/* Um cachorro com tudo: dois tamanhos, uma variância, uma opção e um extra. */
const cachorro = () =>
  base("Cão quente", {
    variantes: [
      { rotulo: texto("Normal"), pessoas: null, precoCent: 230, composicao: [] },
      { rotulo: texto("Grande"), pessoas: null, precoCent: 300, composicao: [] },
    ],
    variancias: [
      {
        nome: texto("Salsicha"),
        escolhas: [
          { nome: texto("Alemã"), acrescimoCent: 0, ativa: true },
          { nome: texto("Americana"), acrescimoCent: 50, ativa: true },
          { nome: texto("Vegan"), acrescimoCent: 0, ativa: false },
        ],
      },
    ],
    opcoes: [{ nome: texto("fiambre"), ativa: true }],
    extras: [{ nome: texto("Fatia de queijo"), precoCent: 40, maximo: 3, ativo: true }],
  });

async function criado(f: FonteDeDados, entrada: EntradaProduto): Promise<Produto> {
  const r = await f.criarProduto(entrada, GERENTE);
  if (!r.ok) throw new Error(`não gravou: ${JSON.stringify(r)}`);
  return r.valor;
}

async function cotada(f: FonteDeDados, linha: LinhaCesto) {
  const r = await f.cotarCesto([linha]);
  if (!r.ok) throw new Error("dados inválidos");
  return r.cotacao.linhas[0];
}

describe("um produto simples personalizado", () => {
  it("dá ids às peças novas, a partir do nome", async () => {
    const p = await criado(await fonte(), cachorro());
    expect(p.variantes.map((v) => v.id)).toEqual(["normal", "grande"]);
    expect(p.variancias[0].id).toBe("salsicha");
    expect(p.variancias[0].escolhas.map((e) => e.id)).toEqual(["alema", "americana", "vegan"]);
    expect(p.opcoes[0].id).toBe("fiambre");
    expect(p.extras[0].id).toBe("fatia-de-queijo");
  });

  it("cobra o tamanho, mais a variância e os extras — e tirar não desconta", async () => {
    const f = await fonte();
    await criado(f, cachorro());
    const linha = await cotada(f, {
      produtoId: "cao-quente",
      varianteId: "grande",
      quantidade: 2,
      variancias: [{ varianciaId: "salsicha", escolhaId: "americana" }],
      opcoes: ["fiambre"],
      extras: [{ id: "fatia-de-queijo", quantidade: 2 }],
    });
    expect(linha).toMatchObject({ erro: null, precoUnitarioCent: 300 + 50 + 2 * 40, totalCent: 860 });
    expect(linha.detalhe).toEqual(["Salsicha: Americana", "SEM fiambre", "+ 2 × Fatia de queijo"]);
  });

  it("recusa o que o produto não tem, o que está desligado e o que passa do máximo", async () => {
    const f = await fonte();
    await criado(f, cachorro());
    const linha = (alteracoes: Partial<LinhaCesto>): LinhaCesto => ({
      produtoId: "cao-quente",
      varianteId: "normal",
      quantidade: 1,
      variancias: [{ varianciaId: "salsicha", escolhaId: "alema" }],
      ...alteracoes,
    });
    const erro = async (l: LinhaCesto) => (await cotada(f, l)).erro;
    expect(await erro(linha({}))).toBeNull();
    /* Uma variância por responder, ou respondida duas vezes. */
    expect(await erro(linha({ variancias: [] }))).toBe("escolha-invalida");
    expect(
      await erro(
        linha({
          variancias: [
            { varianciaId: "salsicha", escolhaId: "alema" },
            { varianciaId: "salsicha", escolhaId: "americana" },
          ],
        }),
      ),
    ).toBe("escolha-invalida");
    /* «Esgotou a vegan»: desligada, não se escolhe. */
    expect(await erro(linha({ variancias: [{ varianciaId: "salsicha", escolhaId: "vegan" }] }))).toBe("escolha-invalida");
    expect(await erro(linha({ opcoes: ["cebola"] }))).toBe("escolha-invalida");
    expect(await erro(linha({ extras: [{ id: "fatia-de-queijo", quantidade: 4 }] }))).toBe("escolha-invalida");
    expect(await erro(linha({ extras: [{ id: "ovo", quantidade: 1 }] }))).toBe("escolha-invalida");
  });

  it("um tamanho desligado sai do checkout", async () => {
    const f = await fonte();
    const p = await criado(f, cachorro());
    const editado = await f.editarProduto(
      p.id,
      { ...cachorro(), variantes: p.variantes.map((v) => ({ ...v, ativa: v.id !== "grande" })) },
      GERENTE,
    );
    expect(editado.ok).toBe(true);
    const linha = await cotada(f, {
      produtoId: "cao-quente",
      varianteId: "grande",
      quantidade: 1,
      variancias: [{ varianciaId: "salsicha", escolhaId: "alema" }],
    });
    expect(linha.erro).toBe("variante-desconhecida");
  });
});

describe("ligar e copiar", () => {
  it("uma variância ligada muda em todos os produtos que a têm", async () => {
    const f = await fonte();
    const primeiro = await criado(f, cachorro());
    /* O segundo liga a mesma variância, e sobe a americana para 1 €. */
    const salsicha = primeiro.variancias[0];
    const segundo = await criado(
      f,
      base("Cachorro especial", {
        variancias: [
          {
            ...salsicha,
            escolhas: salsicha.escolhas.map((e) => (e.id === "americana" ? { ...e, acrescimoCent: 100 } : e)),
          },
        ],
      }),
    );
    expect(segundo.variancias[0].id).toBe("salsicha");
    const linha = await cotada(f, {
      produtoId: "cao-quente",
      varianteId: "normal",
      quantidade: 1,
      variancias: [{ varianciaId: "salsicha", escolhaId: "americana" }],
    });
    expect(linha.precoUnitarioCent).toBe(330);
  });

  it("copiar é criar outra: o original fica como estava", async () => {
    const f = await fonte();
    const primeiro = await criado(f, cachorro());
    const { id: _id, ...semId } = primeiro.extras[0];
    void _id;
    const segundo = await criado(f, base("Tosta", { extras: [{ ...semId, precoCent: 90 }] }));
    expect(segundo.extras[0].id).toBe("fatia-de-queijo-2");
    expect((await f.produtoPorId("cao-quente"))!.extras[0].precoCent).toBe(40);
  });

  it("recusa o id de uma peça que não existe em lado nenhum", async () => {
    const f = await fonte();
    const r = await f.criarProduto(
      base("Tosta", { extras: [{ id: "inventado", nome: texto("X"), precoCent: 0, maximo: 1, ativo: true }] }),
      GERENTE,
    );
    expect(r).toMatchObject({ ok: false, erro: "dados-invalidos", campos: ["extras"] });
  });
});

describe("um produto composto", () => {
  const kit = (leva: { produtoId: string; quantidade: number | null }[], alteracoes: Partial<EntradaProduto> = {}) =>
    base("Kit Cachorros", {
      familia: "festa",
      tipo: "composto",
      variantes: [{ rotulo: texto("10 pessoas"), pessoas: null, precoCent: 2500, composicao: [], leva }],
      ...alteracoes,
    });

  it("cobra o grupo, pede as variâncias dos simples lá dentro e guarda o que levava", async () => {
    const f = await fonte();
    await criado(f, cachorro());
    const k = await criado(f, kit([{ produtoId: "cao-quente", quantidade: 10 }]));
    const linha = {
      produtoId: k.id,
      varianteId: k.variantes[0].id,
      quantidade: 1,
    } satisfies LinhaCesto;
    expect((await cotada(f, linha)).erro).toBe("escolha-invalida");
    const certa = await cotada(f, {
      ...linha,
      variancias: [{ produtoId: "cao-quente", varianciaId: "salsicha", escolhaId: "americana" }],
    });
    /* A americana custa mais no cachorro sozinho; dentro do kit, o preço é o do grupo. */
    expect(certa).toMatchObject({ erro: null, precoUnitarioCent: 2500 });
    expect(certa.detalhe).toEqual(["10 × Cão quente — Americana"]);
  });

  it("só leva produtos simples, e não leva opções nem extras", async () => {
    const f = await fonte();
    await criado(f, cachorro());
    await criado(f, kit([{ produtoId: "cao-quente", quantidade: 10 }]));
    const dentroDeKit = await f.criarProduto(kit([{ produtoId: "kit-cachorros", quantidade: 1 }]), GERENTE);
    expect(dentroDeKit).toMatchObject({ ok: false, campos: ["variantes"] });
    const comExtras = await f.criarProduto(
      kit([], { extras: [{ nome: texto("Topper"), precoCent: 500, maximo: 1, ativo: true }] }),
      GERENTE,
    );
    expect(comExtras).toMatchObject({ ok: false, campos: ["extras"] });
    /* E um simples não leva produtos. */
    const simplesComLeva = await f.criarProduto(
      base("Tosta", { variantes: [{ rotulo: null, pessoas: null, precoCent: 1, composicao: [], leva: [{ produtoId: "cao-quente", quantidade: 1 }] }] }),
      GERENTE,
    );
    expect(simplesComLeva).toMatchObject({ ok: false, campos: ["variantes"] });
    /* E o simples que está num kit não passa a composto. */
    const atual = (await f.produtoPorId("cao-quente"))!;
    const virado = await f.editarProduto("cao-quente", { ...cachorro(), tipo: "composto", variancias: [], opcoes: [], extras: [], variantes: atual.variantes }, GERENTE);
    expect(virado).toMatchObject({ ok: false, campos: ["tipo"] });
  });
});

describe("os sabores de antes da #88", () => {
  it("são uma variância a 0 €, e um cesto antigo com o sabor pelo nome continua a valer", async () => {
    const f = await fonte();
    const folhados = (await f.produtoPorId("vegan-folhados"))!;
    expect(folhados.variancias).toHaveLength(1);
    expect(folhados.variancias[0]).toMatchObject({ id: "vegan-folhados-sabor", nome: { pt: "Sabor" } });
    const linha = { produtoId: folhados.id, varianteId: "unica", quantidade: folhados.quantidadeMinima };
    const pelaVariancia = await cotada(f, {
      ...linha,
      variancias: [{ varianciaId: "vegan-folhados-sabor", escolhaId: "s1" }],
    });
    const peloNome = await cotada(f, { ...linha, escolhas: ["Alheira"] });
    expect(pelaVariancia.erro).toBeNull();
    expect(peloNome).toEqual(pelaVariancia);
    expect(peloNome.detalhe).toEqual(["Sabor: Alheira"]);
    expect((await cotada(f, { ...linha, escolhas: ["Inventado"] })).erro).toBe("escolha-invalida");
  });
});

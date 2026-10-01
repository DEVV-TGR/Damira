import { describe, expect, it } from "vitest";
import { cestoEmTexto, estimativa } from "./cesto";
import { criarFonteJson } from "./dados/json";
import { itensDoServidor } from "./pedido-servidor";
import { formatarCent } from "./preco";

const fonte = criarFonteJson();
const ROTULOS = { semPreco: "Sob orçamento", estimativa: "Estimativa", aPartirDe: "A partir de" };

const CESTO = [
  { produtoId: "festa-premium", varianteId: "20", quantidade: 1, notas: null },
  { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 18, notas: null },
  { produtoId: "vegan-tarte-de-nata", varianteId: "unica", quantidade: 1.5, notas: null },
  { produtoId: "chocolate-do-dubai", varianteId: "150g", quantidade: 2, notas: null },
  { produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1, notas: "Mensagem: Parabéns, Ana" },
];

describe("o cesto refeito no servidor", () => {
  it("leva os nomes e os preços do catálogo", async () => {
    const resultado = await itensDoServidor(CESTO, fonte, "pt");
    if (!resultado.ok) throw new Error("devia ter refeito o cesto");
    expect(resultado.itens.map((i) => [i.nome, i.variante, i.precoCent])).toEqual([
      ["Kit Premium", "20 pessoas", 33500],
      ["Bolo de Cenoura", null, 300],
      ["Tarte de Nata", null, 1700],
      ["Chocolate do Dubai", "150g", 1075],
      ["Bolo por medida", null, null],
    ]);
    expect(estimativa(resultado.itens)).toEqual({ somaCent: 33500 + 5400 + 2550 + 2150, semPreco: 1 });
  });

  it("escreve o texto do email como o browser escrevia — sem o «(150g) (150g)»", async () => {
    const resultado = await itensDoServidor(CESTO, fonte, "pt");
    if (!resultado.ok) throw new Error("devia ter refeito o cesto");
    const eur = (cent: number) => formatarCent(cent, "pt");
    expect(cestoEmTexto(resultado.itens, "pt", ROTULOS)).toBe(
      [
        `- 1× Kit Premium (20 pessoas) — ${eur(33500)}`,
        `- 18× Bolo de Cenoura — ${eur(5400)}`,
        `- 1,5 kg Tarte de Nata — ${eur(2550)}`,
        `- 2× Chocolate do Dubai (150g) — ${eur(2150)}`,
        `- 1× Bolo por medida — Sob orçamento`,
        `    Mensagem: Parabéns, Ana`,
        ``,
        `A partir de: ${eur(43600)}`,
      ].join("\n"),
    );
  });

  it("em inglês, com os nomes em inglês", async () => {
    const resultado = await itensDoServidor(CESTO.slice(0, 2), fonte, "en");
    expect(resultado.ok && resultado.itens.map((i) => [i.nome, i.variante])).toEqual([
      ["Premium Kit", "20 people"],
      ["Carrot Cake", null],
    ]);
  });

  it("um preço mandado pelo browser é recusado, não usado", async () => {
    const adulterado = [{ ...CESTO[0], precoCent: 1 }];
    expect(await itensDoServidor(adulterado, fonte, "pt")).toEqual({ ok: false });
  });

  it.each([
    ["um artigo que não existe", { produtoId: "nao-existe", varianteId: "unica", quantidade: 1 }],
    ["abaixo do mínimo", { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 6 }],
    ["um escalão que não existe", { produtoId: "festa-premium", varianteId: "30", quantidade: 1 }],
  ])("recusa %s", async (_caso, linha) => {
    expect(await itensDoServidor([linha], fonte, "pt")).toEqual({ ok: false });
  });

  it("recusa um cesto vazio ou que não se percebe", async () => {
    expect(await itensDoServidor([], fonte, "pt")).toEqual({ ok: false });
    expect(await itensDoServidor(null, fonte, "pt")).toEqual({ ok: false });
  });
});

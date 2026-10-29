import { describe, expect, it } from "vitest";
import { cestoEmTexto, estimativa, idComEscolha, idsDoItem, linhasDoCesto, normalizarCesto } from "./cesto";
import { gerarReferencia, normalizarHistorico } from "./historico";

/* O cesto e o histórico vivem no `localStorage` de quem já usou o site, e o
   que lá está foi escrito por versões anteriores: ids compostos, preços em
   euros. Estes testes prendem a migração — um cesto antigo que deixasse de se
   poder enviar era alguém parado a meio de encomendar. */

describe("os ids de uma linha antiga", () => {
  it.each([
    ["ementa:bolo-de-cenoura", "bolo-de-cenoura", "unica"],
    ["ementa:chocolate-do-dubai:470g", "chocolate-do-dubai", "470g"],
    ["festa-premium:40", "festa-premium", "40"],
    ["box-aniversario", "box-aniversario", "unica"],
    ["bolo-por-medida#k3x9", "bolo-por-medida", "unica"],
    ["festa-medio:70#a1b2", "festa-medio", "70"],
  ])("%s → %s / %s", (id, produtoId, varianteId) => {
    expect(idsDoItem(id)).toEqual({ produtoId, varianteId });
  });
});

describe("normalizar o cesto guardado", () => {
  it("um item de antes de outubro ganha ids e passa de euros a cêntimos", () => {
    const [item] = normalizarCesto([
      {
        id: "festa-premium:40#k3x",
        tipo: "festa",
        nome: "Kit Premium",
        variante: "40 pessoas",
        preco: 650,
        pessoas: 40,
        quantidade: 1,
        unidade: "un",
        minimo: 1,
        passo: 1,
        notas: "Parabéns, Ana",
      },
    ]);
    expect(item).toMatchObject({
      produtoId: "festa-premium",
      varianteId: "40",
      precoCent: 65000,
      notas: "Parabéns, Ana",
    });
    expect(item).not.toHaveProperty("preco");
  });

  it("um preço com cêntimos converte sem perder um cêntimo", () => {
    const [item] = normalizarCesto([{ id: "ementa:nata", nome: "Nata", preco: 4.15 }]);
    expect(item.precoCent).toBe(415);
  });

  it("um item de hoje fica como está", () => {
    const [item] = normalizarCesto([
      {
        id: "ementa:chocolate-do-dubai:150g",
        produtoId: "chocolate-do-dubai",
        varianteId: "150g",
        nome: "Chocolate do Dubai",
        precoCent: 1075,
        quantidade: 2,
      },
    ]);
    expect(item).toMatchObject({ produtoId: "chocolate-do-dubai", varianteId: "150g", precoCent: 1075 });
  });

  it("sob orçamento continua sob orçamento, e não passa a zero", () => {
    const [item] = normalizarCesto([{ id: "bolo-por-medida", nome: "Bolo por medida", preco: null }]);
    expect(item.precoCent).toBeNull();
  });
});

describe("a estimativa", () => {
  it("conta em cêntimos inteiros, também ao quilo", () => {
    const cesto = normalizarCesto([
      { id: "ementa:vegan-tarte-de-nata", nome: "Tarte de Nata", precoCent: 1700, quantidade: 1.5, unidade: "kg" },
      { id: "ementa:bolo-de-cenoura", nome: "Bolo de Cenoura", precoCent: 300, quantidade: 18 },
      { id: "bolo-por-medida", nome: "Bolo por medida", precoCent: null },
    ]);
    expect(estimativa(cesto)).toEqual({ somaCent: 2550 + 5400, semPreco: 1 });
  });
});

describe("o histórico guardado", () => {
  it("um pedido antigo ganha a estimativa em cêntimos e os ids nos artigos", () => {
    const [pedido] = normalizarHistorico([
      {
        referencia: "DAM-0309-4F7K",
        quando: "2026-09-03T10:00:00.000Z",
        estado: "enviado",
        tipo: "festa",
        data: "2026-09-20",
        pessoas: 40,
        itens: [{ id: "festa-premium:40", nome: "Kit Premium", preco: 650, quantidade: 1 }],
        estimativa: 650,
        semPreco: 0,
      },
    ]);
    expect(pedido.estimativaCent).toBe(65000);
    expect(pedido.itens[0]).toMatchObject({ produtoId: "festa-premium", varianteId: "40", precoCent: 65000 });
  });
});

describe("a referência", () => {
  it("leva o dia de Lisboa, e não o de UTC", () => {
    // 23h30 UTC de segunda, 5 de outubro, já é 00h30 de terça em Lisboa
    expect(gerarReferencia(new Date("2026-10-05T23:30:00Z"))).toMatch(/^DAM-0610-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("no inverno Lisboa e UTC coincidem", () => {
    expect(gerarReferencia(new Date("2026-12-05T23:30:00Z"))).toMatch(/^DAM-0512-/);
  });
});

describe("o sabor escolhido", () => {
  const folhado = (escolha: string) => ({
    id: idComEscolha("ementa:vegan-folhados", escolha),
    produtoId: "vegan-folhados",
    varianteId: "unica",
    tipo: "ementa" as const,
    nome: "Folhados",
    variante: null,
    precoCent: 165,
    pessoas: null,
    quantidade: 12,
    unidade: "un" as const,
    minimo: 12,
    passo: 6,
    notas: null,
    escolha,
  });

  it("cada sabor é uma linha à parte, sem acentos no id", () => {
    expect(idComEscolha("ementa:vegan-folhados", "Grão-de-bico e azeitona")).toBe("ementa:vegan-folhados~grao-de-bico-e-azeitona");
    expect(idComEscolha("ementa:nata", null)).toBe("ementa:nata");
    expect(folhado("Alheira").id).not.toBe(folhado("Legumes").id);
  });

  it("vai para o servidor como escolha, e o email escreve-o colado ao artigo", () => {
    expect(linhasDoCesto([folhado("Alheira")])[0]).toMatchObject({ escolhas: ["Alheira"] });
    const texto = cestoEmTexto([folhado("Alheira")], "pt", { semPreco: "—", estimativa: "Estimativa", aPartirDe: "A partir de" });
    expect(texto).toContain("Folhados · Alheira");
  });

  it("um cesto guardado com o sabor continua com ele; um antigo fica sem", () => {
    expect(normalizarCesto([folhado("Soja")])[0].escolha).toBe("Soja");
    expect(normalizarCesto([{ ...folhado("Soja"), escolha: undefined }])[0].escolha).toBeNull();
  });
});


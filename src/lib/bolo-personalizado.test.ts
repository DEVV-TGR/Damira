import { describe, expect, it } from "vitest";
import { OPCOES_BOLO } from "@/data/bolos-personalizados";
import { criarFonteJson } from "@/lib/dados/json";
import type { EntradaBolo, OpcoesBolo } from "@/lib/dados/tipos";
import {
  coberturasDaMassa,
  comCobertura,
  linhasDoBolo,
  precoAPartirDe,
  ROTULOS_PT,
  validarBolo,
} from "./bolo-personalizado";

const FOTO_A = "bolos/11111111-1111-4111-8111-111111111111.webp";
const FOTO_B = "bolos/22222222-2222-4222-8222-222222222222.jpg";

/** Um bolo válido com as opções do PDF: Red Velvet aceita todas as coberturas. */
const bolo = (mudar: Partial<EntradaBolo> = {}): EntradaBolo => ({
  tamanhoId: null,
  massaId: "red-velvet",
  coberturaId: "butter-cream",
  recheioId: "cream-cheese",
  aVoltaId: "migalhas-red-velvet",
  toppingId: "frutos-vermelhos-a-decorar",
  fotosReferencia: [],
  fotoImprimir: null,
  autorizaFoto: false,
  ...mudar,
});

describe("as opções do PDF da casa", () => {
  it("têm as listas que o PDF tem", () => {
    expect(OPCOES_BOLO.massas).toHaveLength(21);
    /* As 48 do PDF «Todas as Coberturas»: a «Outras» deu lugar às restantes. */
    expect(OPCOES_BOLO.coberturas).toHaveLength(48);
    expect(OPCOES_BOLO.coberturas.map((c) => c.id)).not.toContain("outras");
    expect(OPCOES_BOLO.coberturas.map((c) => c.id)).toEqual(expect.arrayContaining(["butter-cream", "pasta-de-acucar", "sem-cobertura"]));
    expect(OPCOES_BOLO.recheios).toHaveLength(42);
    expect(OPCOES_BOLO.aVolta).toHaveLength(24);
    expect(OPCOES_BOLO.toppings).toHaveLength(32);
  });

  it("a massa decide as coberturas: o Pão-de-Ló leva as «outras» (todas menos a Butter Cream e a Pasta de Açúcar)", () => {
    const pao = coberturasDaMassa(OPCOES_BOLO, "pao-de-lo").map((c) => c.id);
    expect(pao).toHaveLength(46);
    expect(pao).not.toContain("butter-cream");
    expect(pao).not.toContain("pasta-de-acucar");
    expect(coberturasDaMassa(OPCOES_BOLO, "red-velvet")).toHaveLength(48);
    expect(coberturasDaMassa(OPCOES_BOLO, "nao-existe")).toEqual([]);
  });
});

describe("validarBolo", () => {
  it("aceita um bolo que a casa faz", () => {
    expect(validarBolo(OPCOES_BOLO, bolo())).toBeNull();
  });

  it("recusa uma cobertura que a massa não leva", () => {
    expect(validarBolo(OPCOES_BOLO, bolo({ massaId: "pao-de-lo", coberturaId: "butter-cream" }))).toBe("cobertura");
  });

  it("recusa uma opção desligada pela gerente, mesmo que o cesto a tenha guardado", () => {
    const opcoes: OpcoesBolo = {
      ...OPCOES_BOLO,
      recheios: OPCOES_BOLO.recheios.map((r) => (r.id === "cream-cheese" ? { ...r, ativa: false } : r)),
    };
    expect(validarBolo(opcoes, bolo())).toBe("recheio");
  });

  it("recusa um recheio que não vai com a cobertura (lista positiva)", () => {
    const opcoes: OpcoesBolo = {
      ...OPCOES_BOLO,
      recheios: OPCOES_BOLO.recheios.map((r) => (r.id === "cream-cheese" ? { ...r, coberturas: ["outras"] } : r)),
    };
    expect(validarBolo(opcoes, bolo())).toBe("recheio");
    expect(comCobertura(opcoes.recheios, "butter-cream").some((r) => r.id === "cream-cheese")).toBe(false);
  });

  it("sem tamanhos não se escolhe nenhum; com tamanhos, escolhe-se um dos ligados", () => {
    expect(validarBolo(OPCOES_BOLO, bolo({ tamanhoId: "grande" }))).toBe("tamanho");
    const comTamanhos: OpcoesBolo = {
      ...OPCOES_BOLO,
      tamanhos: [{ id: "1-kg", nome: "1 kg", ativa: true, precoCent: 3000 }],
    };
    expect(validarBolo(comTamanhos, bolo())).toBe("tamanho");
    expect(validarBolo(comTamanhos, bolo({ tamanhoId: "1-kg" }))).toBeNull();
  });

  it("a foto para imprimir é opcional com qualquer topping, e obrigatória com o que a imprime", () => {
    const comFoto = { toppingId: "foto-em-folha-de-hostia" };
    expect(validarBolo(OPCOES_BOLO, bolo(comFoto))).toBe("foto-imprimir");
    expect(validarBolo(OPCOES_BOLO, bolo({ ...comFoto, fotoImprimir: FOTO_A, autorizaFoto: true }))).toBeNull();
    /* Com outro topping (o açúcar em pó), pode ter foto, e pode não ter. */
    expect(validarBolo(OPCOES_BOLO, bolo({ toppingId: "acucar-em-po", fotoImprimir: FOTO_A, autorizaFoto: true }))).toBeNull();
    expect(validarBolo(OPCOES_BOLO, bolo({ toppingId: "acucar-em-po" }))).toBeNull();
    expect(validarBolo(OPCOES_BOLO, bolo({ toppingId: "acucar-em-po", fotoImprimir: FOTO_A }))).toBe("autorizacao");
  });

  it("sem a autorização, a foto para imprimir é recusada", () => {
    expect(
      validarBolo(OPCOES_BOLO, bolo({ toppingId: "foto-em-folha-de-hostia", fotoImprimir: FOTO_A })),
    ).toBe("autorizacao");
  });

  it("até 3 fotos de referência, sem repetir, e nenhuma é a de imprimir", () => {
    expect(validarBolo(OPCOES_BOLO, bolo({ fotosReferencia: [FOTO_A, FOTO_B] }))).toBeNull();
    expect(validarBolo(OPCOES_BOLO, bolo({ fotosReferencia: [FOTO_A, FOTO_A] }))).toBe("fotos-referencia");
    const sem: OpcoesBolo = { ...OPCOES_BOLO, fotos: { ...OPCOES_BOLO.fotos, referenciaMaximo: 1 } };
    expect(validarBolo(sem, bolo({ fotosReferencia: [FOTO_A, FOTO_B] }))).toBe("fotos-referencia");
    expect(
      validarBolo(
        OPCOES_BOLO,
        bolo({ toppingId: "foto-em-folha-de-hostia", fotoImprimir: FOTO_A, autorizaFoto: true, fotosReferencia: [FOTO_A] }),
      ),
    ).toBe("foto-imprimir");
  });
});

describe("linhasDoBolo", () => {
  it("escreve o bolo pela ordem do configurador, com os nomes da casa", () => {
    expect(linhasDoBolo(OPCOES_BOLO, bolo(), ROTULOS_PT)).toEqual([
      "Massa: Red Velvet",
      "Cobertura: Butter Cream",
      "Recheio: Cream Cheese",
      "À volta: Migalhas Red Velvet",
      "Topping: Frutos Vermelhos a Decorar",
    ]);
  });
});

describe("o servidor cota o bolo personalizado", () => {
  const linha = (mudar: Record<string, unknown> = {}) => ({
    produtoId: "bolo-por-medida",
    varianteId: "unica",
    quantidade: 1,
    bolo: bolo(),
    ...mudar,
  });

  it("aceita o bolo montado, sob orçamento", async () => {
    const r = await criarFonteJson().cotarCesto([linha()]);
    expect(r.ok && r.cotacao.valida).toBe(true);
    expect(r.ok && r.cotacao.semPreco).toBe(1);
  });

  it("recusa o bolo por medida sem bolo, ou com um bolo que a casa não faz", async () => {
    const sem = await criarFonteJson().cotarCesto([linha({ bolo: undefined })]);
    expect(sem.ok && sem.cotacao.linhas[0].erro).toBe("bolo-invalido");
    const errado = await criarFonteJson().cotarCesto([
      linha({ bolo: bolo({ massaId: "pao-de-lo", coberturaId: "butter-cream" }) }),
    ]);
    expect(errado.ok && errado.cotacao.linhas[0].erro).toBe("bolo-invalido");
  });

  it("recusa um bolo colado a outro produto", async () => {
    const r = await criarFonteJson().cotarCesto([
      { produtoId: "festa-premium", varianteId: "20", quantidade: 1, bolo: bolo() },
    ]);
    expect(r.ok && r.cotacao.linhas[0].erro).toBe("bolo-invalido");
  });

  it("recusa uma foto que não tem a forma das que o envio escreve", async () => {
    const r = await criarFonteJson().cotarCesto([
      linha({ bolo: bolo({ fotosReferencia: ["https://exemplo.com/x.png"] }) }),
    ]);
    expect(r.ok).toBe(false);
  });

  it("a gerente grava as opções, e o servidor confere contra as novas", async () => {
    const fonte = criarFonteJson();
    const ctx = { papel: "gerente" as const, agora: new Date() };
    const opcoes = await fonte.opcoesDoBolo();
    const semRedVelvet = { ...opcoes, massas: opcoes.massas.map((m) => (m.id === "red-velvet" ? { ...m, ativa: false } : m)) };
    expect((await fonte.guardarOpcoesDoBolo(semRedVelvet, ctx)).ok).toBe(true);
    const r = await fonte.cotarCesto([linha()]);
    expect(r.ok && r.cotacao.linhas[0].erro).toBe("bolo-invalido");
    expect((await fonte.guardarOpcoesDoBolo({ ...opcoes, coberturas: [] }, ctx)).ok).toBe(false);
  });
});

describe("os toppings extra (26/11)", () => {
  /* Dois a mais, e um preço indicativo nos morangos. */
  const comExtras: OpcoesBolo = {
    ...OPCOES_BOLO,
    toppingsExtra: { maximo: 2 },
    tamanhos: [{ id: "1-kg", nome: "1 kg", ativa: true, precoCent: 3500 }],
    toppings: OPCOES_BOLO.toppings.map((t) => (t.id === "morangos-a-decorar" ? { ...t, precoExtraCent: 250 } : t)),
  };
  const comTamanho = (mudar: Partial<EntradaBolo> = {}) => bolo({ tamanhoId: "1-kg", ...mudar });

  it("estão desligados de partida: o PDF da casa não os oferece", () => {
    expect(OPCOES_BOLO.toppingsExtra.maximo).toBe(0);
    expect(validarBolo(OPCOES_BOLO, bolo({ toppingsExtra: ["pintarolas"] }))).toBe("toppings-extra");
  });

  it("aceitam até ao máximo, sem repetir e sem o topping principal", () => {
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["pintarolas", "morangos-a-decorar"] }))).toBeNull();
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["pintarolas", "morangos-a-decorar", "fios-d-ovos"] }))).toBe("toppings-extra");
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["pintarolas", "pintarolas"] }))).toBe("toppings-extra");
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["frutos-vermelhos-a-decorar"] }))).toBe("toppings-extra");
  });

  it("só os que a gerente deixa ir a mais: o «Sem Topping» não vai", () => {
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["sem-topping"] }))).toBe("toppings-extra");
  });

  it("não aceitam o topping que imprime a foto, nem um que não vai com a cobertura", () => {
    expect(validarBolo(comExtras, comTamanho({ toppingsExtra: ["foto-em-folha-de-hostia"] }))).toBe("toppings-extra");
    const soSemCobertura: OpcoesBolo = {
      ...comExtras,
      toppings: comExtras.toppings.map((t) => (t.id === "pintarolas" ? { ...t, coberturas: ["sem-cobertura"] } : t)),
    };
    expect(validarBolo(soSemCobertura, comTamanho({ toppingsExtra: ["pintarolas"] }))).toBe("toppings-extra");
  });

  it("vão escritos numa linha, e somam ao «a partir de» só com um tamanho com preço", () => {
    const escolha = comTamanho({ toppingsExtra: ["pintarolas", "morangos-a-decorar"] });
    expect(linhasDoBolo(comExtras, escolha, ROTULOS_PT)).toContain("Toppings extra: Pintarolas, Morangos a decorar");
    expect(precoAPartirDe(comExtras, "1-kg", ["pintarolas", "morangos-a-decorar"])).toBe(3750);
    expect(precoAPartirDe(comExtras, null, ["morangos-a-decorar"])).toBeNull();
  });

  it("o servidor cota o bolo com extras sem preço: a linha continua sob orçamento", async () => {
    const fonte = criarFonteJson();
    await fonte.guardarOpcoesDoBolo(comExtras, { papel: "gerente", agora: new Date() });
    const r = await fonte.cotarCesto([
      { produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1, bolo: comTamanho({ toppingsExtra: ["morangos-a-decorar"] }) },
    ]);
    expect(r.ok && r.cotacao.linhas[0]).toMatchObject({ erro: null, precoUnitarioCent: null });
  });
});

describe("o bolo personalizado não leva peças da #88 (26/11)", () => {
  it("recusa variâncias, opções, extras ou um sabor pelo nome na linha do bolo", async () => {
    const base = { produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1, bolo: bolo() };
    for (const pecas of [
      { extras: [{ id: "topper", quantidade: 1 }] },
      { opcoes: ["sem-acucar"] },
      { variancias: [{ produtoId: null, varianciaId: "sabor", escolhaId: "s1" }] },
      { escolhas: ["Chocolate"] },
    ]) {
      const r = await criarFonteJson().cotarCesto([{ ...base, ...pecas }]);
      expect(r.ok && r.cotacao.linhas[0].erro).toBe("bolo-invalido");
    }
  });
});

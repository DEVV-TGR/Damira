import { describe, expect, it } from "vitest";
import { OPCOES_BOLO } from "@/data/bolos-personalizados";
import { criarFonteJson } from "@/lib/dados/json";
import type { EscolhaBolo, OpcoesBolo } from "@/lib/dados/tipos";
import {
  coberturasDaMassa,
  comCobertura,
  linhasDoBolo,
  ROTULOS_PT,
  validarBolo,
} from "./bolo-personalizado";

const FOTO_A = "bolos/11111111-1111-4111-8111-111111111111.webp";
const FOTO_B = "bolos/22222222-2222-4222-8222-222222222222.jpg";

/** Um bolo válido com as opções do PDF: Red Velvet aceita as três coberturas. */
const bolo = (mudar: Partial<EscolhaBolo> = {}): EscolhaBolo => ({
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
    expect(OPCOES_BOLO.coberturas.map((c) => c.id)).toEqual(["outras", "pasta-de-acucar", "butter-cream"]);
    expect(OPCOES_BOLO.recheios).toHaveLength(42);
    expect(OPCOES_BOLO.aVolta).toHaveLength(24);
    expect(OPCOES_BOLO.toppings).toHaveLength(32);
  });

  it("a massa decide as coberturas: o Pão-de-Ló só leva «Outras»", () => {
    expect(coberturasDaMassa(OPCOES_BOLO, "pao-de-lo").map((c) => c.id)).toEqual(["outras"]);
    expect(coberturasDaMassa(OPCOES_BOLO, "red-velvet")).toHaveLength(3);
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

  it("a foto para imprimir vem com o topping que a imprime, e só com ele", () => {
    const comFoto = { toppingId: "foto-em-folha-de-hostia" };
    expect(validarBolo(OPCOES_BOLO, bolo(comFoto))).toBe("foto-imprimir");
    expect(validarBolo(OPCOES_BOLO, bolo({ fotoImprimir: FOTO_A, autorizaFoto: true }))).toBe("foto-imprimir");
    expect(validarBolo(OPCOES_BOLO, bolo({ ...comFoto, fotoImprimir: FOTO_A, autorizaFoto: true }))).toBeNull();
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

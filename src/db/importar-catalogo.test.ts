import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lerCasa, lerCatalogo } from "./catalogo";
import { casa, produtos, variantes } from "./esquema";
import { compararCatalogo, importarCatalogo, origemDosJson } from "./importar-catalogo";
import { baseDeTeste } from "./teste";

/**
 * A migração do catálogo, de ponta a ponta, contra um Postgres verdadeiro: o
 * que entra dos JSON é o que se lê da base de dados, campo a campo (#28).
 */

const origem = await origemDosJson();
const { db, cliente } = await baseDeTeste();

beforeAll(() => importarCatalogo(db, origem));
afterAll(() => cliente.close());

describe("a importação dos JSON", () => {
  it("leva os 95 artigos da ementa e os 12 produtos de encomenda", async () => {
    const lidos = await lerCatalogo(db);
    expect(lidos.filter((p) => p.origem === "ementa")).toHaveLength(95);
    expect(lidos.filter((p) => p.origem === "encomendas")).toHaveLength(12);
  });

  it("não deixa diferença nenhuma entre a base de dados e os JSON", async () => {
    expect(await compararCatalogo(db, origem)).toEqual([]);
  });

  it("a casa vem sem cozinha, com tudo desligado: nada de exemplo entra", async () => {
    const lida = await lerCasa(db);
    expect(lida?.configuracao.cozinha).toBeNull();
    expect(lida?.configuracao.limitePorVaga).toBeNull();
    expect(lida?.definicoes).toEqual({
      aceitarCancelamentosSite: false,
      devolverSinalAoCancelar: false,
      valorMinimoCent: null,
      pausaAte: null,
    });
  });

  it("recusa-se a correr uma segunda vez, por cima do que já lá está", async () => {
    await expect(importarCatalogo(db, origem)).rejects.toThrow(/só corre sobre uma base de dados vazia/);
    expect(await compararCatalogo(db, origem)).toEqual([]);
  });
});

describe("a comparação dá pelas diferenças", () => {
  /* Uma comparação que dá sempre «sem diferenças» não prova nada. Cada caso
     estraga uma coisa, confirma que a comparação a vê, e repõe-na. */

  it("um preço mudado", async () => {
    const [antes] = await db.select().from(variantes).where(eq(variantes.produtoId, "festa-premium")).limit(1);
    /* Só este escalão: o produto tem vários, e repor todos com o preço de um
       estragava os dados para os testes seguintes. */
    const esteEscalao = and(eq(variantes.produtoId, antes.produtoId), eq(variantes.id, antes.id));
    await db
      .update(variantes)
      .set({ precoCent: (antes.precoCent ?? 0) + 1 })
      .where(esteEscalao);
    try {
      expect((await compararCatalogo(db, origem)).some((d) => d.startsWith("festa-premium.variantes"))).toBe(true);
    } finally {
      await db.update(variantes).set({ precoCent: antes.precoCent }).where(esteEscalao);
    }
    expect(await compararCatalogo(db, origem)).toEqual([]);
  });

  it("um produto em falta", async () => {
    const [croissant] = await db.select().from(produtos).where(eq(produtos.id, "croissant-misto"));
    const variantesDoCroissant = await db.select().from(variantes).where(eq(variantes.produtoId, "croissant-misto"));
    await db.delete(variantes).where(eq(variantes.produtoId, "croissant-misto"));
    await db.delete(produtos).where(eq(produtos.id, "croissant-misto"));
    try {
      expect(await compararCatalogo(db, origem)).toContain("croissant-misto: não está na base de dados");
    } finally {
      await db.insert(produtos).values(croissant);
      await db.insert(variantes).values(variantesDoCroissant);
    }
    expect(await compararCatalogo(db, origem)).toEqual([]);
  });

  it("um horário da loja mudado", async () => {
    const [antes] = await db.select().from(casa);
    await db
      .update(casa)
      .set({ horarioLoja: { ...antes.horarioLoja, domingo: [] } })
      .where(eq(casa.id, 1));
    try {
      expect(await compararCatalogo(db, origem)).toContain("casa.configuracao difere");
    } finally {
      await db.update(casa).set({ horarioLoja: antes.horarioLoja }).where(eq(casa.id, 1));
    }
    expect(await compararCatalogo(db, origem)).toEqual([]);
  });
});

import { count, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { produtos, variantes } from "./esquema";
import { loteEmTransacao } from "./lote";
import { baseDeTeste } from "./teste";

/**
 * O `emLote` grava tudo ou nada: se uma instrução do lote falhar, as que já
 * correram também não ficam. É a garantia de que um produto nunca fica gravado
 * sem as variantes dele.
 */

const { db, cliente } = await baseDeTeste();
afterAll(() => cliente.close());

const PRODUTO = {
  id: "bolo-de-teste",
  posicao: 0,
  origem: "encomendas",
  familia: "bolo",
  nomePt: "Bolo de teste",
  unidade: "un",
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: false,
  apareceNaEmenta: false,
} satisfies typeof produtos.$inferInsert;

const quantos = async () => (await db.select({ n: count() }).from(produtos).where(eq(produtos.id, PRODUTO.id)))[0].n;

describe("emLote", () => {
  it("grava todas as instruções", async () => {
    await loteEmTransacao(db)((d) => [
      d.insert(produtos).values(PRODUTO),
      d.insert(variantes).values({ produtoId: PRODUTO.id, id: "unica", posicao: 0, precoCent: 1000 }),
    ]);
    expect(await quantos()).toBe(1);
    await db.delete(variantes).where(eq(variantes.produtoId, PRODUTO.id));
    await db.delete(produtos).where(eq(produtos.id, PRODUTO.id));
  });

  it("se a segunda falha, a primeira também não fica", async () => {
    const lote = loteEmTransacao(db)((d) => [
      d.insert(produtos).values(PRODUTO),
      /* Um preço negativo: a regra `variantes_preco` recusa-o. */
      d.insert(variantes).values({ produtoId: PRODUTO.id, id: "unica", posicao: 0, precoCent: -1 }),
    ]);
    await expect(lote).rejects.toThrow();
    expect(await quantos()).toBe(0);
  });
});

import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, describe, expect, it } from "vitest";

/**
 * # A migração `0011` (#88), sobre uma base que já tem produtos
 *
 * Como a prova da `0005`: a base fica na `0010`, ganha produtos com sabores, e
 * só depois apanha a `0011`. É a única forma de ver a conversão das `escolhas`
 * a variâncias — numa base vazia não há nada para converter.
 */

const MIGRACOES = fileURLToPath(new URL("./migracoes", import.meta.url));

const pasta = await mkdtemp(join(tmpdir(), "migracoes-"));
await cp(MIGRACOES, pasta, { recursive: true });
const diario = join(pasta, "meta", "_journal.json");
const lido = JSON.parse(await readFile(diario, "utf8")) as { entries: { tag: string }[] };
lido.entries = lido.entries.slice(0, lido.entries.findIndex((e) => e.tag.startsWith("0011_")));
await writeFile(diario, JSON.stringify(lido));

const cliente = new PGlite();
const db = drizzle(cliente);

afterAll(async () => {
  await cliente.close();
  await rm(pasta, { recursive: true, force: true });
});

describe("a 0011 numa base com produtos", () => {
  it("passa os sabores a uma variância a 0 €, ligada ao produto", async () => {
    await migrate(db, { migrationsFolder: pasta });
    /* SQL e não o `db.insert`: o Drizzle já conhece as colunas novas. */
    await cliente.exec(`
      insert into categorias (id, nome_pt, posicao) values ('casa-bebidas', 'Bebidas', 0);
      insert into produtos (id, posicao, origem, familia, categoria_id, tipo, nome_pt, carta, categoria, unidade, escolhas, quantidade_minima, multiplo, a_venda_online, aparece_na_ementa) values
        ('milkshake', 0, 'ementa', 'ementa', 'casa-bebidas', 'simples', 'Milkshake', 'casa', 'bebidas', 'un', '{Manga,Morango}', 1, 1, false, true),
        ('galao', 1, 'ementa', 'ementa', 'casa-bebidas', 'simples', 'Galão', 'casa', 'bebidas', 'un', '{}', 1, 1, false, true);
      insert into variantes (produto_id, id, posicao, preco_cent) values ('milkshake', 'unica', 0, 400), ('galao', 'unica', 0, 150);
    `);

    await migrate(db, { migrationsFolder: MIGRACOES });

    const { rows: variancias } = await cliente.query<{ id: string; nome_pt: string; escolhas: unknown }>(
      "select id, nome_pt, escolhas from variancias",
    );
    expect(variancias).toEqual([
      {
        id: "milkshake-sabor",
        nome_pt: "Sabor",
        escolhas: [
          { id: "s1", nome: { pt: "Manga", en: null }, acrescimoCent: 0, ativa: true },
          { id: "s2", nome: { pt: "Morango", en: null }, acrescimoCent: 0, ativa: true },
        ],
      },
    ]);
    const { rows: ligacoes } = await cliente.query("select produto_id, variancia_id, posicao from produtos_variancias");
    expect(ligacoes).toEqual([{ produto_id: "milkshake", variancia_id: "milkshake-sabor", posicao: 0 }]);

    /* As colunas novas nascem com o valor de sempre: nada desligado, nada a tirar. */
    const { rows: variantes } = await cliente.query("select produto_id, ativa from variantes order by produto_id");
    expect(variantes).toEqual([
      { produto_id: "galao", ativa: true },
      { produto_id: "milkshake", ativa: true },
    ]);
    const { rows: opcoes } = await cliente.query("select distinct opcoes from produtos");
    expect(opcoes).toEqual([{ opcoes: [] }]);
  });

  it("recusa um kit dentro de si próprio e o mesmo produto duas vezes no grupo", async () => {
    await cliente.exec(`
      insert into produtos (id, posicao, origem, familia, categoria_id, tipo, nome_pt, carta, categoria, unidade, quantidade_minima, multiplo, a_venda_online, aparece_na_ementa)
        values ('kit', 2, 'ementa', 'ementa', 'casa-bebidas', 'composto', 'Kit', 'casa', 'bebidas', 'un', 1, 1, false, true);
      insert into variantes (produto_id, id, posicao, preco_cent) values ('kit', '20', 0, 30000);
      insert into variantes_leva (produto_id, variante_id, posicao, simples_id, quantidade) values ('kit', '20', 0, 'milkshake', 20);
    `);
    await expect(
      cliente.exec("insert into variantes_leva values ('kit', '20', 1, 'kit', null)"),
    ).rejects.toThrow(/variantes_leva_nao_a_si/);
    await expect(
      cliente.exec("insert into variantes_leva values ('kit', '20', 1, 'milkshake', 5)"),
    ).rejects.toThrow(/variantes_leva_unico/);

    /* Trocar as variantes de um kit (o `editarProduto`) leva o que elas levavam. */
    await cliente.exec("delete from variantes where produto_id = 'kit'");
    const { rows } = await cliente.query("select * from variantes_leva");
    expect(rows).toEqual([]);
  });
});

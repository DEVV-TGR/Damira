import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, describe, expect, it } from "vitest";

/**
 * # A migração `0005`, sobre uma base de dados que já tem produtos
 *
 * As outras provas correm as migrações numa base vazia e importam depois — e
 * aí o `UPDATE` da `0005` não tem nada para mudar. A Neon não é assim: os 107
 * produtos já lá estão quando ela chega. Aqui a base fica na `0004`, ganha
 * produtos, e só depois apanha a `0005`, como no `npm run bd:migrar`.
 */

const MIGRACOES = fileURLToPath(new URL("./migracoes", import.meta.url));

/* Uma cópia da pasta das migrações que acaba na `0004`: o migrador do Drizzle
   aplica o que está no `_journal.json`, e nada mais. */
const pasta = await mkdtemp(join(tmpdir(), "migracoes-"));
await cp(MIGRACOES, pasta, { recursive: true });
const diario = join(pasta, "meta", "_journal.json");
const lido = JSON.parse(await readFile(diario, "utf8")) as { entries: { tag: string }[] };
lido.entries = lido.entries.slice(0, lido.entries.findIndex((e) => e.tag.startsWith("0005_")));
await writeFile(diario, JSON.stringify(lido));

const cliente = new PGlite();
const db = drizzle(cliente);

afterAll(async () => {
  await cliente.close();
  await rm(pasta, { recursive: true, force: true });
});

describe("a 0005 numa base com produtos", () => {
  it("liga a caixa só nos produtos sem nenhum preço", async () => {
    await migrate(db, { migrationsFolder: pasta });
    /* SQL e não o `db.insert`: o Drizzle já conhece a coluna nova e escrevia-a
       numa tabela que ainda não a tem. */
    await cliente.exec(`
      insert into produtos (id, posicao, origem, familia, nome_pt, carta, categoria, unidade, quantidade_minima, multiplo, a_venda_online, aparece_na_ementa) values
        ('nata', 0, 'ementa', 'ementa', 'Pastel de nata', 'casa', 'doces', 'un', 6, 6, true, true),
        ('festa-premium', 1, 'encomendas', 'festa', 'Kit Premium', null, null, 'un', 1, 1, true, false),
        ('bolo-por-medida', 2, 'encomendas', 'medida', 'Bolo por medida', null, null, 'un', 1, 1, true, false);
      insert into variantes (produto_id, id, posicao, preco_cent) values
        ('nata', 'unica', 0, 140),
        ('festa-premium', '20', 0, 33500),
        ('festa-premium', '70', 1, null),
        ('bolo-por-medida', 'unica', 0, null);
    `);

    await migrate(db, { migrationsFolder: MIGRACOES });

    const { rows } = await cliente.query<{ id: string; pede_confirmacao: boolean }>(
      "select id, pede_confirmacao from produtos order by posicao",
    );
    /* Um kit com um escalão sob orçamento tem preço nos outros: fica desligado. */
    expect(rows).toEqual([
      { id: "nata", pede_confirmacao: false },
      { id: "festa-premium", pede_confirmacao: false },
      { id: "bolo-por-medida", pede_confirmacao: true },
    ]);
  });
});

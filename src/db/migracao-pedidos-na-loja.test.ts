import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, describe, expect, it } from "vitest";

/**
 * # A migração `0006`, sobre uma base de dados que já tem pedidos do Stripe
 *
 * A `0006` tira e volta a pôr o `CHECK` do `pago_em` e o dos estados — e um
 * `ADD CONSTRAINT` confere todas as linhas que já lá estão. As outras provas
 * migram uma base vazia, onde isso não se vê. Aqui a base fica na `0005`,
 * ganha um pedido do Stripe em cada estado, e só depois apanha a `0006`, como no
 * `npm run bd:migrar`: a garantia do Stripe tem de continuar a aceitar o que já
 * aceitava (`pedidos.md` › Impactos na base de dados).
 */

const MIGRACOES = fileURLToPath(new URL("./migracoes", import.meta.url));

/* Uma cópia da pasta das migrações que acaba antes da `0006`. */
const pasta = await mkdtemp(join(tmpdir(), "migracoes-"));
await cp(MIGRACOES, pasta, { recursive: true });
const diario = join(pasta, "meta", "_journal.json");
const lido = JSON.parse(await readFile(diario, "utf8")) as { entries: { tag: string }[] };
lido.entries = lido.entries.slice(0, lido.entries.findIndex((e) => e.tag.startsWith("0006_")));
await writeFile(diario, JSON.stringify(lido));

const cliente = new PGlite();
const db = drizzle(cliente);

afterAll(async () => {
  await cliente.close();
  await rm(pasta, { recursive: true, force: true });
});

describe("a 0006 numa base com pedidos do Stripe", () => {
  it("aceita-os todos como estavam, e não lhes inventa uma confirmação", async () => {
    await migrate(db, { migrationsFolder: pasta });
    /* SQL e não o `db.insert`: o Drizzle já conhece a coluna nova e escrevia-a
       numa tabela que ainda não a tem. */
    await cliente.exec(`
      insert into pedidos (
        id, referencia, estado, criado_em, levantamento_em, cliente_nome, cliente_email, cliente_telefone,
        total_cent, modo_pagamento, chave_idempotencia, procura, de_teste,
        pago_em, pago_online_cent, entregue_em, cancelado_em, cancelado_por, chegou_tarde
      )
      select
        ('6f1c1f5e-8c1b-4d5a-9a43-1d2f3c4b5a6' || n)::uuid, 'DAM-0311-AAA' || (n + 2), estado,
        '2026-11-03T10:00:00Z', '2026-11-07T15:00:00Z', 'Cliente de Teste', 'cliente@example.com', '+351911222333',
        1260, modo, ('2b7e1516-28ae-4d2a-8f15-0a1b2c3d4e5' || n)::uuid, 'cliente de teste', true,
        pago_em::timestamptz, pago_online, entregue_em::timestamptz, cancelado_em::timestamptz, cancelado_por, tarde
      from (values
        (1, 'pendente',  'total', null,                   0,    null,                   null,                   null,      false),
        (2, 'expirado',  'total', null,                   0,    null,                   null,                   null,      false),
        (3, 'pago',      'total', '2026-11-03T10:05:00Z', 1260, null,                   null,                   null,      false),
        (4, 'pago',      'sinal', '2026-11-03T10:05:00Z', 378,  null,                   null,                   null,      true),
        (5, 'entregue',  'total', '2026-11-03T10:05:00Z', 1260, '2026-11-07T15:10:00Z', null,                   null,      false),
        (6, 'cancelado', 'total', '2026-11-03T10:05:00Z', 1260, null,                   '2026-11-04T09:00:00Z', 'gerente', false)
      ) as p(n, estado, modo, pago_em, pago_online, entregue_em, cancelado_em, cancelado_por, tarde);
    `);

    await migrate(db, { migrationsFolder: MIGRACOES });

    const { rows } = await cliente.query<{ estado: string; com_pagamento: boolean; confirmado_em: Date | null }>(
      "select estado, pago_em is not null as com_pagamento, confirmado_em from pedidos order by referencia",
    );
    expect(rows).toEqual([
      { estado: "pendente", com_pagamento: false, confirmado_em: null },
      { estado: "expirado", com_pagamento: false, confirmado_em: null },
      { estado: "pago", com_pagamento: true, confirmado_em: null },
      { estado: "pago", com_pagamento: true, confirmado_em: null },
      { estado: "entregue", com_pagamento: true, confirmado_em: null },
      { estado: "cancelado", com_pagamento: true, confirmado_em: null },
    ]);
  });
});

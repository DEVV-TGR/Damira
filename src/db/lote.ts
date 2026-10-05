import type { BatchItem } from "drizzle-orm/batch";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { BaseDeDados } from "./catalogo";

/**
 * # Gravar tudo ou nada, da mesma forma nos dois drivers
 *
 * Uma escrita com várias partes — um produto e as variantes dele — tem de
 * entrar inteira ou não entrar. Os dois sítios onde o código corre fazem-no de
 * maneiras diferentes:
 *
 * - **a Neon, pelo driver HTTP** (o site), manda um **lote**: as instruções
 *   todas de uma vez, numa transação que corre inteira ou nada. Não faz
 *   transações interativas — não se pode ler a meio e decidir o resto;
 * - **o PGlite** (os testes) não faz lotes, mas faz transações.
 *
 * Um `Lote` é por isso uma lista de instruções que **não dependem de ler
 * nenhuma das anteriores** (`docs/loja/base-de-dados.md` › As ferramentas), e
 * o `ExecutarLote` de cada driver corre-a à sua maneira. O código da fonte
 * escreve-a uma vez, e é o mesmo que os testes provam.
 *
 * O lote recebe a base de dados onde construir as instruções: no PGlite é a
 * transação, para elas correrem lá dentro.
 */
export type Lote = (db: BaseDeDados) => BatchItem<"pg">[];
export type ExecutarLote = (lote: Lote) => Promise<void>;

/** No site: um lote do driver HTTP da Neon. */
export const loteNeon =
  (db: NeonHttpDatabase): ExecutarLote =>
  async (lote) => {
    const [primeira, ...resto] = lote(db as unknown as BaseDeDados);
    if (primeira) await db.batch([primeira, ...resto]);
  };

/** Nos testes (e em qualquer driver com transações): uma transação. */
export const loteEmTransacao =
  (db: BaseDeDados): ExecutarLote =>
  async (lote) => {
    await db.transaction(async (tx) => {
      for (const instrucao of lote(tx)) await instrucao;
    });
  };

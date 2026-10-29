import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

/**
 * Uma base de dados para os testes: um PGlite (um Postgres dentro do Node, sem
 * conta nem rede) com as migrações verdadeiras de `src/db/migracoes/` aplicadas.
 * É a mesma base de dados que a Neon vai ter, a começar vazia.
 *
 * Só para testes — o site fala com a Neon.
 */
export async function baseDeTeste() {
  const cliente = new PGlite();
  const db = drizzle(cliente);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("./migracoes", import.meta.url)) });
  return { db, cliente };
}

/**
 * O nome da regra que recusou uma escrita, ou um erro se ela foi aceite.
 *
 * O Drizzle embrulha o erro do Postgres e o nome da regra está na causa.
 * Confirmar o nome, e não só que falhou, é o que garante que foi aquela regra a
 * recusar — e não outra coisa partida pelo caminho.
 */
export async function recusado(escrita: Promise<unknown>): Promise<string> {
  try {
    await escrita;
  } catch (erro) {
    const causa = (erro as { cause?: { constraint?: string } }).cause;
    return causa?.constraint ?? `sem regra: ${String(erro)}`;
  }
  throw new Error("a base de dados aceitou o que devia recusar");
}

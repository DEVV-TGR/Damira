import { defineConfig } from "drizzle-kit";

/**
 * O `drizzle-kit` lê o esquema e escreve as migrações em SQL, em
 * `src/db/migracoes/`. É o SQL que se revê no PR (`docs/loja/base-de-dados.md`).
 *
 * ⚠️ **Só gera — não liga a base de dados nenhuma.** Aplicar as migrações na
 * Neon é um passo à parte, com o endereço do ramo certo; nunca o de produção
 * para testar (`AGENTS.md` › Base de dados).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/esquema.ts",
  out: "./src/db/migracoes",
});

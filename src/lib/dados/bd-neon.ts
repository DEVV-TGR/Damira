import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { BaseDeDados } from "@/db/catalogo";
import { loteNeon, type ExecutarLote } from "@/db/lote";
import { criarFonteBd, pedidosAindaNaoGuardados } from "./bd";
import type { FonteDeDados } from "./tipos";

/**
 * # A fonte do site sobre a Neon
 *
 * O driver **HTTP** (`@neondatabase/serverless`): na Vercel, cada função abria
 * a sua ligação persistente, e um pico esgotava-as (`robustez.md` › Consultas).
 * As escritas com várias partes vão em lote (`loteNeon`), que o HTTP corre tudo
 * ou nada.
 *
 * Quem a escolhe é o `fonteDoAmbiente` (`exemplo.ts`), quando há
 * `DATABASE_URL`; com o modo de teste ligado, põe-lhe por cima a camada de
 * exemplo (`comExemplo`). Ver `docs/loja/ligar-a-neon.md`.
 */
export function fonteDaNeon(endereco: string): FonteDeDados {
  const { db, emLote } = baseDaNeon(endereco);
  return { ...pedidosAindaNaoGuardados, ...criarFonteBd(db, emLote) };
}

/**
 * A base de dados da Neon pelo driver HTTP, e a forma de gravar tudo ou nada
 * nela. É a mesma para a fonte e para a entrada no painel
 * (`src/lib/sessao-painel/escolher.ts`). Não abre ligação nenhuma: cada consulta
 * é um pedido HTTP.
 */
export function baseDaNeon(endereco: string): { db: BaseDeDados; emLote: ExecutarLote } {
  const db = drizzle(neon(endereco));
  return { db: db as unknown as BaseDeDados, emLote: loteNeon(db) };
}

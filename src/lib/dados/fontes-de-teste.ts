import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { montarFonteBd, type FonteBd } from "./bd";
import { criarFonteJson } from "./json";
import type { FonteDeDados } from "./tipos";

/**
 * # A fonte que os testes de especificação usam
 *
 * Os testes do contrato (`dados.test.ts`, `painel.test.ts`, `ordem.test.ts`)
 * correm duas vezes no `npm test` (ver `vitest.config.mts`): uma contra a fonte
 * dos JSON, como sempre, e outra contra a da base de dados, num PGlite com o
 * catálogo importado. É a prova de que a troca no `index.ts` não muda nada para
 * as páginas (#29, #31).
 *
 * Só para testes.
 */

/** A volta da base de dados (`FONTE_DOS_TESTES=bd`). */
export const NA_BASE_DE_DADOS = process.env.FONTE_DOS_TESTES === "bd";

/* O catálogo importado uma vez por ficheiro de testes; cada fonte nova é uma
   cópia limpa dele. */
let modelo: ReturnType<typeof catalogoDeTeste> | undefined;

/**
 * O painel dos pedidos ainda não está na base de dados (os da loja já estão:
 * `bd-pedidos.ts`). Chamá-los rebenta a dizê-lo: um teste que precise deles tem
 * de saltar a volta da base de dados de propósito, e não passar a correr contra
 * os JSON sem ninguém dar por isso.
 */
const PEDIDOS = [
  "listarPedidos",
  "pedidoDoPainel",
  "marcarEntregue",
  "desfazerEntregue",
  "precisaDeAtencao",
  "tratarAviso",
  "reagendarPedido",
  "cancelarPedido",
  "reembolsarPedido",
] as const satisfies readonly Exclude<keyof FonteDeDados, keyof FonteBd>[];

const semPedidos = Object.fromEntries(
  PEDIDOS.map((nome) => [
    nome,
    () => {
      throw new Error(`${nome}: os pedidos ainda não estão na base de dados — este teste salta a volta «bd».`);
    },
  ]),
) as unknown as Pick<FonteDeDados, (typeof PEDIDOS)[number]>;

/** A fonte da base de dados, numa cópia limpa do catálogo de hoje. */
export async function fonteDaBaseDeDados(): Promise<FonteDeDados> {
  modelo ??= catalogoDeTeste();
  const { db } = await (await modelo).copia();
  return { ...montarFonteBd(db, loteEmTransacao(db), { deTeste: false }), ...semPedidos };
}

/** A fonte da loja desta volta: a dos JSON, ou a da base de dados. */
export async function fonteDaLoja(): Promise<FonteDeDados> {
  return NA_BASE_DE_DADOS ? fonteDaBaseDeDados() : criarFonteJson();
}

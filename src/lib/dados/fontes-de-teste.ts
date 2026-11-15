import { eq, sql } from "drizzle-orm";
import { casa as tabelaCasa, linhasPedido, pedidos as tabelaPedidos, reembolsos as tabelaReembolsos, vagas } from "@/db/esquema";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { montarFonteBd } from "./bd";
import { CONFIGURACAO_JSON, criarFonteJson } from "./json";
import { textoDeProcura } from "./regras";
import type { FonteDeDados, Pedido } from "./tipos";

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

/** A fonte da base de dados, numa cópia limpa do catálogo de hoje. */
export async function fonteDaBaseDeDados(): Promise<FonteDeDados> {
  modelo ??= catalogoDeTeste();
  const { db } = await (await modelo).copia();
  return montarFonteBd(db, loteEmTransacao(db), { deTeste: false });
}

/** A fonte da loja desta volta: a dos JSON, ou a da base de dados. */
export async function fonteDaLoja(): Promise<FonteDeDados> {
  return NA_BASE_DE_DADOS ? fonteDaBaseDeDados() : criarFonteJson();
}

/**
 * Um id com a forma que a coluna `uuid` pede, a partir de um nome curto. É o
 * mesmo nas duas fontes, para os testes do contrato dizerem o mesmo nas duas.
 */
export const idDeTeste = (nome: string): string =>
  `00000000-0000-4000-8000-${Buffer.from(nome).toString("hex").padStart(12, "0")}`;

export type CasaDeTeste = { limitePorVaga?: number | null };

/**
 * A fonte desta volta, já com estes pedidos lá dentro. Na base de dados, cada um
 * entra como o site o deixaria: com as linhas, os reembolsos e a vaga contada.
 */
export async function fonteComPedidos(pedidos: Pedido[], casa: CasaDeTeste = {}): Promise<FonteDeDados> {
  if (!NA_BASE_DE_DADOS) {
    return criarFonteJson({ pedidos, configuracao: { ...CONFIGURACAO_JSON, ...casa } });
  }
  return (await baseComPedidos(pedidos, casa)).fonte;
}

/** A fonte da base de dados com estes pedidos, e a base de dados, para os testes a espreitarem. */
export async function baseComPedidos(pedidos: Pedido[], casa: CasaDeTeste = {}) {
  modelo ??= catalogoDeTeste();
  const { db } = await (await modelo).copia();
  if (casa.limitePorVaga !== undefined) {
    await db.update(tabelaCasa).set({ limitePorVaga: casa.limitePorVaga }).where(eq(tabelaCasa.id, 1));
  }
  for (const pedido of pedidos) await guardarPedido(db, pedido, casa.limitePorVaga ?? null);
  return { db, fonte: montarFonteBd(db, loteEmTransacao(db), { deTeste: false }) };
}

type BaseDeTeste = Awaited<ReturnType<Awaited<NonNullable<typeof modelo>>["copia"]>>["db"];

async function guardarPedido(db: BaseDeTeste, pedido: Pedido, limite: number | null) {
  const { cliente } = pedido;
  const devolvidos = pedido.reembolsos.filter((r) => r.estado !== "falhado");
  await db.insert(tabelaPedidos).values({
    id: pedido.id,
    referencia: pedido.referencia,
    estado: pedido.estado,
    criadoEm: pedido.criadoEm,
    levantamentoEm: pedido.levantamentoEm,
    clienteNome: cliente.nome,
    clienteEmail: cliente.email,
    clienteTelefone: cliente.telefone,
    clienteNif: cliente.nif,
    contaId: cliente.contaId,
    observacoes: pedido.observacoes,
    totalCent: pedido.totalCent,
    modoPagamento: pedido.modoPagamento,
    pagoOnlineCent: pedido.pagoOnlineCent,
    chegouTarde: pedido.chegouTarde,
    avisosTratados: pedido.avisosTratados,
    pagoEm: pedido.pagoEm,
    impressoEm: pedido.impressoEm,
    entregueEm: pedido.entregueEm,
    canceladoEm: pedido.canceladoEm,
    canceladoPor: pedido.canceladoPor,
    reagendadoEm: pedido.reagendadoEm,
    chaveIdempotencia: pedido.id,
    procura: textoDeProcura(cliente.nome, pedido.referencia),
    reembolsoReservadoCent: devolvidos.reduce((soma, r) => soma + r.valorCent, 0),
    deTeste: false,
  });
  await db.insert(linhasPedido).values(pedido.linhas.map((linha, posicao) => ({ pedidoId: pedido.id, posicao, ...linha })));
  for (const reembolso of pedido.reembolsos) {
    await db.insert(tabelaReembolsos).values({ ...reembolso, pedidoId: pedido.id });
  }
  /* O que ocupa: pendente, pago e entregue (`base-de-dados.md`). */
  if (pedido.estado === "pendente" || pedido.estado === "pago" || pedido.estado === "entregue") {
    await db
      .insert(vagas)
      .values({ inicio: pedido.levantamentoEm, ocupadas: 1, limite })
      .onConflictDoUpdate({ target: vagas.inicio, set: { ocupadas: sql`${vagas.ocupadas} + 1` } });
  }
}

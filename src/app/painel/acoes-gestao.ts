"use server";

import { guardarDefinicoes, guardarHorarios, listarPedidos, pedidoDoPainel } from "@/lib/dados";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/dados/tipos";
import { intervaloDeDias } from "@/lib/painel";
import { comSessao } from "@/lib/painel-servidor";

/**
 * # As ações da gestão (`painel-gerente.md`)
 *
 * Passam pelo `comSessao` (o papel sai da sessão, no servidor) e pela fronteira,
 * que as recusa a quem não é gerente (`src/lib/dados/papeis.ts`). As leituras de
 * pedidos são dos dois papéis na fronteira; aqui, a lista com filtros é da
 * gestão, e o balcão tem a sua (`acoes-balcao.ts`).
 */

export type FiltroGestao = {
  estado: EstadoPedido | "todos";
  /** `"2026-10-07"`, dia de Lisboa, ou vazio. */
  desde: string;
  ate: string;
  texto: string;
  cursor: string | null;
};

/** A lista de pedidos da gestão: por estado, por dias de levantamento, por nome ou referência. */
export async function pedidosDaGestao(filtro: FiltroGestao) {
  return comSessao(async (ctx) => {
    if (ctx.papel !== "gerente") return { ok: false, erro: "sem-permissao" } as const;
    const estado = ESTADOS_PEDIDO.includes(filtro.estado as EstadoPedido) ? (filtro.estado as EstadoPedido) : null;
    const dias = intervaloDeDias(filtro.desde || null, filtro.ate || null);
    const texto = filtro.texto.trim();
    return listarPedidos(
      {
        ...(estado ? { estados: [estado] } : {}),
        ...(dias.desde ? { levantamentoDesde: dias.desde } : {}),
        ...(dias.ate ? { levantamentoAte: dias.ate } : {}),
        ...(texto.length >= 2 ? { texto } : {}),
        ordem: "recentes",
        cursor: filtro.cursor,
        limite: 25,
      },
      ctx,
    );
  });
}

export async function detalheDoPedido(id: string) {
  return comSessao((ctx) => pedidoDoPainel(id, ctx));
}

export async function gravarHorarios(entrada: unknown) {
  return comSessao((ctx) => guardarHorarios(entrada, ctx));
}

export async function gravarDefinicoes(entrada: unknown) {
  return comSessao((ctx) => guardarDefinicoes(entrada, ctx));
}

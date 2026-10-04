"use server";

import * as dados from "@/lib/dados";
import {
  cancelarPedido,
  guardarDefinicoes,
  guardarHorarios,
  listarPedidos,
  pedidoDoPainel,
  reagendarPedido,
  reembolsarPedido,
  tratarAviso,
} from "@/lib/dados";
import { ESTADOS_PEDIDO, type AvisoTratavel, type EstadoPedido } from "@/lib/dados/tipos";
import { intervaloDeDias } from "@/lib/painel";
import { comSessao, contextoDoPainel } from "@/lib/painel-servidor";
import { horasDaLoja } from "@/lib/vagas-servidor";

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

// ——— As decisões da gerente (`pedidos.md`) ———
// Todas mudam um pedido: avisam o polling, e o balcão vê-as na volta seguinte.

/** «Aceitar», «manter neste dia», «já devolvi»: o facto fica, o aviso sai. */
export async function tratar(id: string, tipo: AvisoTratavel) {
  return comSessao((ctx) => tratarAviso(id, tipo, ctx), true);
}

export async function reagendar(id: string, levantamentoEm: string) {
  return comSessao((ctx) => reagendarPedido(id, levantamentoEm, ctx), true);
}

export async function cancelar(id: string, reembolsoCent: number) {
  return comSessao((ctx) => cancelarPedido(id, reembolsoCent, ctx), true);
}

export async function reembolsar(id: string, valorCent: number) {
  return comSessao((ctx) => reembolsarPedido(id, valorCent, ctx), true);
}

/** As horas da loja num dia, para mudar o levantamento. Só para a gerente. */
export async function horasParaMudar(data: string) {
  const ctx = await contextoDoPainel();
  if (ctx?.papel !== "gerente") return [];
  return horasDaLoja(data, dados, ctx.agora);
}

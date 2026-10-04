"use server";

import {
  configuracaoDaCasa,
  desfazerEntregue,
  listarPedidos,
  marcarEntregue,
  marcarEsgotadoHoje,
  pausarLoja,
  simularPedidoDeTeste,
  tirarDeVenda,
} from "@/lib/dados";
import { fimDaPausa, OPCOES_PAUSA, type OpcaoPausa } from "@/lib/painel";
import { comSessao } from "@/lib/painel-servidor";

/**
 * # As ações do balcão (`painel-balcao.md`)
 *
 * Todas passam pelo `comSessao` (`src/lib/painel-servidor.ts`): o papel sai da
 * sessão, no servidor, e quem muda um pedido avisa o polling.
 */

export async function entregar(id: string, faltaCobrada: boolean) {
  return comSessao((ctx) => marcarEntregue(id, faltaCobrada, ctx), true);
}

export async function desfazer(id: string) {
  return comSessao((ctx) => desfazerEntregue(id, ctx), true);
}

export async function esgotarHoje(id: string, esgotado: boolean) {
  return comSessao((ctx) => marcarEsgotadoHoje(id, esgotado, ctx));
}

export async function porForaDeVenda(id: string, fora: boolean) {
  return comSessao((ctx) => tirarDeVenda(id, fora, ctx));
}

/** `null` retoma. O fim de cada opção calcula-se aqui, com o horário da casa. */
export async function pausar(opcao: OpcaoPausa | null) {
  return comSessao(async (ctx) => {
    if (opcao !== null && !OPCOES_PAUSA.includes(opcao)) {
      return { ok: false, erro: "dados-invalidos", campos: ["opcao"] };
    }
    const ate = opcao === null ? null : fimDaPausa(opcao, ctx.agora, await configuracaoDaCasa());
    if (opcao !== null && ate === null) return { ok: false, erro: "dados-invalidos", campos: ["opcao"] };
    return pausarLoja(ate, ctx);
  });
}

/** A pesquisa do balcão: referência ou nome, os mais recentes primeiro. */
export async function procurar(texto: string) {
  return comSessao((ctx) =>
    listarPedidos({ texto, estados: ["pago", "entregue", "cancelado"], ordem: "recentes", limite: 30 }, ctx),
  );
}

/** O arquivo: entregues e cancelados, página a página. */
export async function arquivo(cursor: string | null) {
  return comSessao((ctx) =>
    listarPedidos({ estados: ["entregue", "cancelado"], ordem: "recentes", cursor, limite: 20 }, ctx),
  );
}

/**
 * ⚠️ **Só no modo de teste.** Um pedido pago a chegar agora, para experimentar
 * o som, o aviso e o talão que falha sem haver pagamentos (#42).
 */
export async function simularPedido(talaoFalhou: boolean) {
  return comSessao(async () => {
    if (!simularPedidoDeTeste) return { ok: false, erro: "sem-permissao" } as const;
    return { ok: true, valor: simularPedidoDeTeste(new Date(), { talaoFalhou }) };
  }, true);
}

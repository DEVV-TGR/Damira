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
import type { ContextoPainel, ResultadoPainel } from "@/lib/dados/tipos";
import { fimDaPausa, OPCOES_PAUSA, type OpcaoPausa } from "@/lib/painel";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";
import { sessao } from "@/lib/sessao-painel";

/**
 * # As ações do balcão (`painel-balcao.md`)
 *
 * ⚠️ **Esconder um botão não é proteger** (regra 8). O papel sai da sessão,
 * aqui, no servidor — nunca de um argumento — e a fronteira (`papeis.ts`)
 * verifica-o outra vez. Sem sessão, `sem-permissao`.
 *
 * Quem muda um pedido chama `avisarQuePedidosMudaram()`: é o que faz os outros
 * dispositivos verem a mudança na próxima volta do polling.
 */

const SEM_SESSAO = { ok: false, erro: "sem-permissao" } as const;

async function contexto(): Promise<ContextoPainel | null> {
  const agora = new Date();
  const atual = await sessao.sessaoAtual(agora);
  return atual ? { papel: atual.papel, agora } : null;
}

/* Corre a ação com o contexto da sessão; se mudou um pedido e correu bem, avisa. */
async function comSessao<T>(
  acao: (ctx: ContextoPainel) => Promise<ResultadoPainel<T>>,
  mudaPedidos = false,
): Promise<ResultadoPainel<T>> {
  const ctx = await contexto();
  if (!ctx) return SEM_SESSAO;
  const resultado = await acao(ctx);
  if (resultado.ok && mudaPedidos) avisarQuePedidosMudaram();
  return resultado;
}

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
    if (!simularPedidoDeTeste) return { ok: false, erro: "sem-permissao" };
    return { ok: true, valor: simularPedidoDeTeste(new Date(), { talaoFalhou }) };
  }, true);
}

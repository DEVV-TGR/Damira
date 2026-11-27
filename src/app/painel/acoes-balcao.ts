"use server";

import {
  configuracaoDaCasa,
  desfazerEntregue,
  listarPedidos,
  marcarEntregue,
  marcarEsgotadoHoje,
  pausarLoja,
  responderPedido,
  simularPedidoDeTeste,
  tirarDeVenda,
} from "@/lib/dados";
import { enviarDepois } from "@/lib/emails/depois";
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

/**
 * O «sim» do balcão a um pedido que espera pela casa: confirma-o **tal como
 * está**, sem preço nem hora nova (`pedidos.md` › Quem confirma). É a mesma
 * porta da gerente (`responderPedido`), com a resposta vazia; a fronteira deixa
 * a equipa confirmar e recusa-lhe propor, e a passagem é condicional — dois
 * tablets a confirmar ao mesmo tempo confirmam uma vez.
 */
export async function confirmar(id: string) {
  const resultado = await comSessao((ctx) => responderPedido(id, { precos: [], levantamentoEm: null }, ctx), true);
  /* A fronteira pôs o `confirmado-cliente` na fila na mesma instrução que confirmou;
     pede-se o envio só depois, e só se ficou gravado — como as decisões da gerente
     (`eEnviaEmails`, em `acoes-gestao.ts`). Sem isto o email ficava na fila até ao
     envio seguinte de outra ação. */
  if (resultado.ok) enviarDepois();
  return resultado;
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
    listarPedidos(
      {
        texto,
        /* Quem liga a perguntar pelo pedido pode estar à espera de resposta — ou
           o pedido pode ter expirado, e é isso que se lhe tem de dizer. */
        estados: ["confirmado", "pago", "por-confirmar", "a-aguardar-aceite", "entregue", "cancelado", "expirado"],
        ordem: "recentes",
        limite: 30,
      },
      ctx,
    ),
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

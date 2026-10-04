import "server-only";
import type { ContextoPainel, ResultadoPainel } from "@/lib/dados/tipos";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";
import { sessao } from "@/lib/sessao-painel";

/**
 * # O que todas as ações do painel fazem antes de fazer alguma coisa
 *
 * ⚠️ **Esconder um botão não é proteger** (regra 8). O papel sai da sessão,
 * aqui, no servidor — nunca de um argumento que o browser mande — e a fronteira
 * (`src/lib/dados/papeis.ts`) verifica-o outra vez. Sem sessão, `sem-permissao`.
 */

const SEM_SESSAO = { ok: false, erro: "sem-permissao" } as const;

export async function contextoDoPainel(): Promise<ContextoPainel | null> {
  const agora = new Date();
  const atual = await sessao.sessaoAtual(agora);
  return atual ? { papel: atual.papel, agora } : null;
}

/**
 * Corre a ação com o contexto da sessão. Se mudou um pedido e correu bem, avisa
 * o polling (`avisarQuePedidosMudaram`): é o que faz os outros dispositivos
 * verem a mudança na próxima volta.
 */
export async function comSessao<T>(
  acao: (ctx: ContextoPainel) => Promise<ResultadoPainel<T>>,
  mudaPedidos = false,
): Promise<ResultadoPainel<T>> {
  const ctx = await contextoDoPainel();
  if (!ctx) return SEM_SESSAO;
  const resultado = await acao(ctx);
  if (resultado.ok && mudaPedidos) avisarQuePedidosMudaram();
  return resultado;
}

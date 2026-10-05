import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { versaoPedidos } from "@/lib/dados";

/**
 * # O número que o painel pergunta de 10 em 10 segundos
 *
 * ⚠️ **A base de dados dorme** (regra 6 do AGENTS.md). O tablet fica aberto
 * catorze horas por dia; se cada pergunta lesse a base de dados, ela nunca
 * adormecia e o plano gratuito acabava a meio do mês (`robustez.md`). Por isso
 * a versão é servida **da cache da Vercel**, com uma etiqueta, e só vai à base
 * de dados quando a etiqueta é invalidada — por quem mudou um pedido.
 */

export const ETIQUETA_PEDIDOS = "pedidos";

export const versaoEmCache = unstable_cache(() => versaoPedidos(), ["painel-versao"], {
  tags: [ETIQUETA_PEDIDOS],
});

/**
 * Chama-se depois de **qualquer** alteração a um pedido: entregar, desfazer,
 * cancelar, pagar (o `marcarPago` da #42). ⚠️ `expire: 0` e não `"max"`: com o
 * `"max"` a próxima pergunta ainda recebia a versão antiga, e o pedido novo
 * chegava ao balcão dez segundos mais tarde.
 */
export function avisarQuePedidosMudaram(): void {
  revalidateTag(ETIQUETA_PEDIDOS, { expire: 0 });
}

/**
 * A versão do site. Quando muda, o painel aberto desde manhã recarrega-se: as
 * ações do servidor da versão antiga deixaram de existir (`painel.md`).
 */
export const VERSAO_DO_SITE =
  process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

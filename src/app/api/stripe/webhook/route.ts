import { emModoDeTeste } from "@/lib/modo-teste";
import { fonteDoWebhook } from "@/lib/pagamentos/fonte";
import { tratarWebhook } from "@/lib/pagamentos/webhook";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";

/**
 * O webhook do Stripe (`pagamentos.md` › Confirmar: o webhook). Só liga as
 * peças: o que decide está em `src/lib/pagamentos/webhook.ts`, que os testes
 * percorrem inteiro.
 *
 * ⚠️ **Nunca em cache** (regra 7): cada evento é uma escrita. E em Node, não no
 * Edge: a verificação da assinatura do SDK é síncrona, com o `crypto` do Node.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(pedido: Request) {
  return tratarWebhook(pedido, {
    segredo: process.env.STRIPE_WEBHOOK_SECRET,
    emTeste: emModoDeTeste(),
    fonte: fonteDoWebhook(),
    avisarPainel: avisarQuePedidosMudaram,
    agora: () => new Date(),
  });
}

import "server-only";
import { baseDaNeon } from "@/lib/dados/bd-neon";
import { DESTINO_PEDIDOS } from "@/lib/pedidos";
import { criarFonteWebhookBd } from "./fonte-bd";
import type { FonteWebhook } from "./tipos";

/**
 * # Com que dados fala o webhook
 *
 * Com a mesma `DATABASE_URL` que a `FonteDeDados`. Sem ela, responde `null`: a rota
 * verifica a assinatura e responde 503, o Stripe volta a tentar, e nada é dado por
 * tratado.
 *
 * Não há uma implementação sobre os JSON, como na `FonteDeDados`: os pedidos deles
 * vivem na memória de uma instância, e o webhook chega a outra.
 */
export const fonteDoWebhook = (): FonteWebhook | null => {
  const endereco = process.env.DATABASE_URL;
  if (!endereco) return null;
  return criarFonteWebhookBd(baseDaNeon(endereco).db, { emailDaLoja: DESTINO_PEDIDOS });
};

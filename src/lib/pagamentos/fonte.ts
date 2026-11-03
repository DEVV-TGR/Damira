import "server-only";
import type { FonteWebhook } from "./tipos";

/**
 * # Com que dados fala o webhook
 *
 * ⚠️ **Ainda com nenhuns.** A implementação sobre a Neon espera pelas tabelas
 * dos pedidos (#101) e pelo `criarPedido` na base de dados (#102), e entra aqui
 * quando eles entrarem, ligada à mesma `DATABASE_URL` que a `FonteDeDados`.
 *
 * Até lá a rota verifica a assinatura e responde 503: o Stripe volta a tentar,
 * e nada é dado por tratado. Hoje nenhum endpoint aponta para ela — o checkout
 * (#38) ainda não existe.
 *
 * Não há uma implementação sobre os JSON, como na `FonteDeDados`: os pedidos
 * deles vivem na memória de uma instância, e o webhook chega a outra.
 */
export const fonteDoWebhook = (): FonteWebhook | null => null;

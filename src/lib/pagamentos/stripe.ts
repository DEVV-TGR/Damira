import "server-only";
import Stripe from "stripe";

/**
 * # A versão da API do Stripe, num sítio só
 *
 * O SDK está fixo no `package.json` (sem `^`) e a versão da API está fixa
 * aqui. As duas andam juntas: cada SDK é escrito para uma versão, e o endpoint
 * do webhook em cada sandbox tem de ser criado com ela (`pagamentos.md` ›
 * Preparar cada sandbox). Um evento chega na versão do endpoint e não na do
 * SDK; se forem diferentes, um campo pode faltar sem erro nenhum.
 *
 * ⚠️ **O `satisfies` é de propósito.** Uma subida do SDK que mude a versão faz
 * falhar o `build` aqui, e quem a sobe fica a saber que tem de recriar os
 * endpoints com a versão nova antes do deploy.
 */
export const VERSAO_API_STRIPE = "2026-10-28.endive" satisfies Stripe.LatestApiVersion;

/** O cliente para chamar o Stripe (o checkout da #38). O webhook não precisa dele. */
export const criarClienteStripe = (chave: string): Stripe =>
  new Stripe(chave, { apiVersion: VERSAO_API_STRIPE });

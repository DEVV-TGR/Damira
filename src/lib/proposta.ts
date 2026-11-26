import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { FORMATO_REFERENCIA } from "@/lib/dados/tipos";

/**
 * # O link do aceite (`pedidos.md` › O orçamento e o aceite)
 *
 * O link do email leva a referência, a versão da proposta e uma assinatura das duas
 * (HMAC-SHA256 com `PROPOSTA_SEGREDO`). Nada disto se guarda: a página refaz a assinatura e
 * compara-a, em tempo constante, antes de ler ou mudar o pedido (`base-de-dados.md` › A credencial
 * do aceite).
 *
 * - A referência sozinha não autoriza nada: quem a vê num talão não aceita por ninguém.
 * - Uma proposta revista sobe a versão, e o link antigo deixa de corresponder ao pedido.
 * - Sem a chave não há links: falha fechado, em vez de assinar com uma chave vazia.
 */

/**
 * O caminho da página, sem a língua: `/pedido/proposta/DAM-0212-K7Q2/1-<assinatura>`.
 *
 * ⚠️ O separador é um hífen e não um ponto: o `proxy.ts` deixa de fora os caminhos com um ponto
 * (são ficheiros), e sem ele a língua não se resolvia e a página dava 404.
 */
export const caminhoDaProposta = (referencia: string, versao: number): string =>
  `/pedido/proposta/${referencia}/${versao}-${assinar(referencia, versao)}`;

/**
 * A versão que a credencial do link assina, ou `null` se ela não for desta referência — mal
 * formada, de outra chave, ou inventada. Não diz porquê, de propósito.
 */
export function versaoDoLink(referencia: string, credencial: string): number | null {
  if (!FORMATO_REFERENCIA.test(referencia)) return null;
  /* A assinatura tem sempre 43 carateres, e pode ela própria ter hífenes: é o tamanho que a separa. */
  const partes = /^([1-9][0-9]{0,8})-([A-Za-z0-9_-]{43})$/.exec(credencial);
  if (!partes) return null;
  const versao = Number(partes[1]);
  const esperada = Buffer.from(assinar(referencia, versao));
  const recebida = Buffer.from(partes[2]);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida) ? versao : null;
}

function assinar(referencia: string, versao: number): string {
  const segredo = process.env.PROPOSTA_SEGREDO?.trim();
  /* Uma chave curta adivinha-se; uma vazia assinava tudo igual para toda a gente. */
  if (!segredo || segredo.length < 32) throw new Error("PROPOSTA_SEGREDO em falta ou curto: os links do aceite não se assinam.");
  /* O prefixo separa este uso da chave de qualquer outro que ela venha a ter. */
  return createHmac("sha256", segredo).update(`aceite-proposta:${referencia}:${versao}`).digest("base64url");
}

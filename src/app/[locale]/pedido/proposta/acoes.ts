"use server";

import { aceitarProposta, recusarProposta } from "@/lib/dados";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";
import { versaoDoLink } from "@/lib/proposta";

/**
 * # O aceite e a recusa pelo link do email (`pedidos.md` › O aceite do cliente)
 *
 * ⚠️ A credencial verifica-se **aqui**, no servidor, antes de chegar à fronteira: a referência e a
 * versão vêm do browser, e só a assinatura diz que o link foi nosso. Abrir a página não aceita nada
 * (os filtros de correio abrem os links sozinhos); aceitar é este botão.
 */

export type ResultadoDecisao = { ok: true } | { ok: false; erro: "link-invalido" | "nao-existe" | "estado-mudou" };

async function decidir(referencia: string, credencial: string, decisao: "aceitar" | "recusar"): Promise<ResultadoDecisao> {
  const versao = versaoDoLink(referencia, credencial);
  if (versao === null) return { ok: false, erro: "link-invalido" };
  const agora = new Date();
  const resultado = decisao === "aceitar" ? await aceitarProposta(referencia, versao, agora) : await recusarProposta(referencia, versao, agora);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  /* O balcão e a gerente veem a mudança no próximo toque do polling. */
  avisarQuePedidosMudaram();
  return { ok: true };
}

export async function aceitar(referencia: string, credencial: string): Promise<ResultadoDecisao> {
  return decidir(referencia, credencial, "aceitar");
}

export async function recusar(referencia: string, credencial: string): Promise<ResultadoDecisao> {
  return decidir(referencia, credencial, "recusar");
}

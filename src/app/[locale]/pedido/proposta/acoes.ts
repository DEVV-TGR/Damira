"use server";

import { aceitarProposta, recusarProposta } from "@/lib/dados";
import { enviarDepois } from "@/lib/emails/depois";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";
import { versaoDoLink } from "@/lib/proposta";

/**
 * # O aceite e a recusa pelo link do email (`pedidos.md` › O aceite do cliente)
 *
 * ⚠️ A credencial verifica-se **aqui**, no servidor, antes de chegar à fronteira: a referência e a
 * versão vêm do browser, e só a assinatura diz que o link foi nosso. Abrir a página não aceita nada
 * (os filtros de correio abrem os links sozinhos); aceitar é este botão.
 */

export type ResultadoDecisao =
  | { ok: true }
  | { ok: false; erro: "link-invalido" | "nao-existe" | "estado-mudou" | "falhou" };

async function decidir(referencia: string, credencial: string, decisao: "aceitar" | "recusar"): Promise<ResultadoDecisao> {
  /* ⚠️ Nunca rebenta para o browser (`robustez.md` › Erros): uma base de dados em baixo, ou a
     `PROPOSTA_SEGREDO` em falta, dão a mensagem de erro da página, e não um ecrã partido. No log
     fica só o que falhou, sem a mensagem do erro, que pode trazer dados do pedido. */
  try {
    const versao = versaoDoLink(referencia, credencial);
    if (versao === null) return { ok: false, erro: "link-invalido" };
    const agora = new Date();
    const resultado =
      decisao === "aceitar" ? await aceitarProposta(referencia, versao, agora) : await recusarProposta(referencia, versao, agora);
    if (!resultado.ok) return { ok: false, erro: resultado.erro };
    /* O aceite e a recusa gravaram os emails na mesma instrução; só agora saem.
       Antes do aviso ao painel: o `enviarDepois` nunca lança, e uma falha do aviso
       não pode deixar na fila os emails de uma decisão que ficou gravada. */
    enviarDepois();
    /* O balcão e a gerente veem a mudança no próximo toque do polling. */
    avisarQuePedidosMudaram();
    return { ok: true };
  } catch {
    console.error(`[proposta] falhou ao ${decisao} uma proposta`);
    return { ok: false, erro: "falhou" };
  }
}

export async function aceitar(referencia: string, credencial: string): Promise<ResultadoDecisao> {
  return decidir(referencia, credencial, "aceitar");
}

export async function recusar(referencia: string, credencial: string): Promise<ResultadoDecisao> {
  return decidir(referencia, credencial, "recusar");
}

import { casa } from "@/data/casa";
import { DESTINO_PEDIDOS, REMETENTE_PEDIDOS } from "@/lib/pedidos";

/**
 * Manda o email de um pedido à casa, pelo Resend.
 *
 * Sem chave (`RESEND_API_KEY`), ou com o serviço a recusar, devolve
 * `sem-servico` — **não é uma avaria**: a página devolve o pedido já escrito
 * para a pessoa o mandar do seu próprio correio. Uma encomenda nunca se perde
 * por falta de email.
 *
 * O corpo do erro do serviço fica no registo do servidor e **não vai para o
 * ecrã**: traz detalhes da conta e da chave que não são para mostrar a quem está
 * a encomendar um bolo. E nunca se regista o email nem o telefone do cliente
 * (`robustez.md` › Logs) — só a referência.
 */
export async function enviarEmailDePedido(email: {
  referencia: string;
  assunto: string;
  corpo: string;
  responderPara: string;
}): Promise<"enviado" | "sem-servico"> {
  const chave = process.env.RESEND_API_KEY?.trim();
  if (!chave) return "sem-servico";

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${casa.nome} <${REMETENTE_PEDIDOS}>`,
        to: [DESTINO_PEDIDOS],
        /* Responder ao email abre uma resposta para quem encomendou, e não para
           o remetente técnico. */
        reply_to: email.responderPara,
        subject: email.assunto,
        text: email.corpo,
      }),
    });
    if (!resposta.ok) {
      console.error(`[pedidos] ${email.referencia}: o serviço de email recusou (${resposta.status}):`, await resposta.text());
      return "sem-servico";
    }
    return "enviado";
  } catch (erro) {
    console.error(`[pedidos] ${email.referencia}: falha a contactar o serviço de email:`, erro);
    return "sem-servico";
  }
}

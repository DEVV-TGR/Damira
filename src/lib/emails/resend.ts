import { ANEXO_LOGOTIPO } from "./html";

export type MensagemResend = {
  id: string; remetente: string; destinatario: string; responderPara: string;
  assunto: string; texto: string; html: string;
};
export type ResultadoEnvio = { ok: true } | { ok: false; codigo: string; definitiva: boolean };

/** Nunca lê o corpo dos erros: pode conter destinatários e detalhes da conta. */
export async function enviarPeloResend(mensagem: MensagemResend, chave: string, buscar: typeof fetch): Promise<ResultadoEnvio> {
  try {
    const resposta = await buscar("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", "Idempotency-Key": mensagem.id },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from: mensagem.remetente, to: [mensagem.destinatario], reply_to: mensagem.responderPara,
        subject: mensagem.assunto, text: mensagem.texto, html: mensagem.html, attachments: [ANEXO_LOGOTIPO] }),
    });
    if (resposta.ok) return { ok: true };
    // Autorização/domínio afetam a conta inteira; corrigir configuração permite retomar a fila.
    const recuperavel = [401, 403, 429].includes(resposta.status);
    return { ok: false, codigo: `resend-${resposta.status}`, definitiva: resposta.status >= 400 && resposta.status < 500 && !recuperavel };
  } catch {
    return { ok: false, codigo: "resend-rede", definitiva: false };
  }
}

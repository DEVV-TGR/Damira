import { casa } from "@/data/casa";

/**
 * # O código da gerente, por email
 *
 * Pelo Resend, como os emails dos pedidos (`src/lib/email.ts`). A diferença é
 * que este **não tem alternativa**: o código nunca vai para o ecrã. Se o envio
 * falhar, rebenta — e a entrada (`bd.ts`) regista-o sem o email e responde à
 * gerente o mesmo de sempre (`painel.md`).
 *
 * ⚠️ **Nunca se regista o email nem o código** (`robustez.md` › Logs).
 *
 * O remetente tem de ser de um domínio verificado no Resend. O de testes,
 * `onboarding@resend.dev`, **só entrega a quem criou a conta Resend** — que é a
 * forma de o código chegar à gerente antes de o domínio da casa estar
 * verificado, se a conta for criada com o email dela (`docs/loja/visita.md`).
 */
export function enviadorDoResend(chave: string, remetente: string) {
  return async (email: string, codigo: string): Promise<void> => {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${casa.nome} <${remetente}>`,
        to: [email],
        subject: `${codigo} — o código para entrar no painel`,
        text:
          `O código para entrar no painel da ${casa.nome} é ${codigo}.\n\n` +
          "Vale 10 minutos e serve uma vez.\n\n" +
          "Se não foi a gerente a pedi-lo, pode ignorar este email: sem o código, ninguém entra.",
      }),
    });
    /* O corpo da resposta não se regista: traz o endereço de destino. */
    if (!resposta.ok) throw new Error(`o Resend recusou o envio (${resposta.status})`);
  };
}

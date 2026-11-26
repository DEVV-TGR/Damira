import { atenderRecuperacaoEmails } from "@/lib/emails/recuperacao-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(pedido: Request): Promise<Response> {
  return atenderRecuperacaoEmails(pedido, process.env, async agora => {
    // Autorização e configuração conferidas antes de importar a fronteira dos dados.
    const { recuperarEmailsDoAmbiente } = await import("@/lib/emails/recuperacao-servidor");
    return recuperarEmailsDoAmbiente(agora);
  });
}

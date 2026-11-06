import { redirect } from "next/navigation";
import { TesteTalao } from "@/components/painel/TesteTalao";
import { sessao } from "@/lib/sessao-painel";

/**
 * # `/painel/talao` — o teste da impressora (#46, #47)
 *
 * Imprime talões de exemplo na impressora da loja antes de haver pagamentos:
 * o bloco invertido «HOJE», o talão inteiro a preto, o cancelamento e os
 * acentos. Atrás da entrada do painel, como o resto. Ninguém lá chega por um
 * botão: é uma ferramenta da visita, e o caminho está em `impressao.md`.
 */
export const dynamic = "force-dynamic";

export default async function PaginaTalao() {
  const agora = new Date();
  if (!sessao.ligada || !(await sessao.sessaoAtual(agora))) redirect("/painel");
  return <TesteTalao agoraIso={agora.toISOString()} />;
}

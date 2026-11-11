import { POST as encaminhar } from "@sentry/nextjs/tunnel";

/* É destes cabeçalhos que o SDK tira o IP para o passar ao Sentry. */
const CABECALHOS_COM_O_IP = ["cf-connecting-ip", "x-vercel-forwarded-for", "x-forwarded-for"];

/**
 * Por aqui passam os erros do browser, a caminho do Sentry. O browser fala com
 * `/api/erros` (`next.config.ts`), e o site continua com `connect-src 'self'`.
 *
 * ⚠️ **O caminho não se traduz: é o que o SDK procura.** Sem este ficheiro, o
 * `/api/erros` passava a ser uma reescrita, que levava todos os cabeçalhos do
 * pedido. Com ele segue só o corpo, e o browser e a origem. O IP de quem visita
 * fica aqui.
 */
export function POST(pedido: Request) {
  const cabecalhos = new Headers(pedido.headers);
  for (const nome of CABECALHOS_COM_O_IP) cabecalhos.delete(nome);
  return encaminhar(new Request(pedido, { headers: cabecalhos }));
}

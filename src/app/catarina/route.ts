import { after } from "next/server";
import { track } from "@vercel/analytics/server";

/**
 * # `damira.pt/catarina` — o link da influencer
 *
 * Leva à página inicial, tal e qual, e serve só para contar quantas pessoas
 * chegam por ele. Conta-se de duas formas, porque nenhuma das duas sozinha é
 * de confiança:
 *
 * - **Um evento `link-catarina` no Vercel Analytics**, enviado daqui, do
 *   servidor. É o número a ler (Analytics › Events). Não depende do browser de
 *   quem clica: o do Instagram costuma esconder de onde a pessoa vem, e um
 *   bloqueador de anúncios corta o script do Analytics — mas não corta isto.
 * - **Os `utm_` no endereço de chegada**, que o Analytics mostra ao lado das
 *   visitas da página inicial. Servem de confirmação, e é o que fica se o
 *   evento falhar.
 *
 * ⚠️ **O evento conta cliques, não pessoas.** Quem abre o link duas vezes conta
 * duas. É o que se pediu («quantas pessoas vão clicar»), mas não é o número de
 * clientes: o que se vende vê-se nos pedidos.
 *
 * ⚠️ **`307` e não `308`.** Um redirecionamento permanente fica guardado no
 * browser, e a segunda visita já não passava por aqui — não contava. E deixa
 * trocar o destino amanhã sem o link antigo ficar preso ao de hoje.
 *
 * Fica fora do encaminhamento de idioma (`src/proxy.ts`): sem isso, o
 * `next-intl` mandava o pedido para `/catarina` dentro de `[locale]`, que não
 * existe. As maiúsculas (`/Catarina`) chegam cá pelo `src/proxy.ts`, que as leva a `/catarina`.
 *
 * Nunca em cache: uma resposta guardada pela CDN deixava de chegar ao servidor,
 * e o contador parava no primeiro clique.
 */
export const dynamic = "force-dynamic";

const DESTINO = "/?utm_source=catarina&utm_medium=influencer&utm_campaign=catarina";

export function GET(request: Request) {
  /* Depois da resposta, para quem clica não esperar pelo Analytics. Se falhar,
     a pessoa chega na mesma — perde-se um número, nunca uma visita. */
  after(async () => {
    try {
      await track("link-catarina", {}, { request });
    } catch {
      /* Sem rede para o Analytics, ou em local: não há nada a fazer aqui. */
    }
  });

  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(DESTINO, request.url).toString(),
      "Cache-Control": "no-store",
    },
  });
}

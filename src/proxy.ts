import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const idioma = createMiddleware(routing);

/**
 * O link da influencer escreve-se de cabeça, e quem o escreve põe maiúsculas:
 * `/Catarina` ia parar ao `next-intl` e dava 404. Leva-se à forma certa, que é
 * a que conta o clique (`src/app/catarina/route.ts`). Não se faz no
 * `next.config.ts` porque aí a comparação não distingue maiúsculas e o
 * redirecionamento apanhava o próprio `/catarina`, em ciclo.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== "/catarina" && pathname.replace(/\/$/, "").toLowerCase() === "/catarina") {
    return NextResponse.redirect(new URL("/catarina", request.url), 307);
  }
  return idioma(request);
}

export const config = {
  // Tudo o que não seja API, o painel, ficheiros internos do Next/Vercel ou um
  // pedido com extensão (imagens, sitemap.xml, robots.txt) passa pelo
  // encaminhamento de idioma: a língua sai do prefixo do endereço e de mais nada
  // (desde #78 não se adivinha pelo browser — ver `routing.ts`). ⚠️ O painel
  // fica de fora: é só em português e vive fora de `[locale]` — sem isto,
  // `/painel` ia parar a `/pt/painel`, que não existe. O `/catarina` (só em
  // minúsculas) também: é uma rota que conta o clique e redireciona, fora de
  // `[locale]` (`src/app/catarina/route.ts`).
  matcher: ["/((?!api|painel|catarina$|_next|_vercel|.*\\..*).*)"],
};

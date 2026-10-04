import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tudo o que não seja API, o painel, ficheiros internos do Next/Vercel ou um
  // pedido com extensão (imagens, sitemap.xml, robots.txt) passa pelo
  // negociador de idioma. ⚠️ O painel fica de fora: é só em português e vive
  // fora de `[locale]` — sem isto, `/painel` ia parar a `/pt/painel`, que não existe.
  matcher: ["/((?!api|painel|_next|_vercel|.*\\..*).*)"],
};

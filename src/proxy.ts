import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tudo o que não seja API, ficheiros internos do Next/Vercel ou um pedido com
  // extensão (imagens, sitemap.xml, robots.txt) passa pelo negociador de idioma.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

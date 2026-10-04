import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

/**
 * ⚠️ **Deixa indexar tudo** — menos o painel da equipa. Enquanto o site estiver num domínio de
 * demonstração, é a demonstração que o Google indexa — e depois é preciso pedir
 * a remoção. Ver a lista *Antes de publicar* no README.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    /* O painel da equipa não é para motores de busca (também tem `noindex`). */
    rules: { userAgent: "*", allow: "/", disallow: ["/painel"] },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}

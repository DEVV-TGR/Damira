import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

/**
 * ⚠️ **Deixa indexar tudo.** Enquanto o site estiver num domínio de
 * demonstração, é a demonstração que o Google indexa — e depois é preciso pedir
 * a remoção. Ver a lista *Antes de publicar* no README.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}

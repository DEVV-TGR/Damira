import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { rotasPublicas, urlLocalizado } from "@/lib/site";

/**
 * Uma entrada por rota e por idioma, cada uma a apontar para as suas alternativas
 * — é o que diz ao Google que `/ementa` e `/en/ementa` são a mesma página em
 * duas línguas, e não conteúdo duplicado a competir consigo próprio.
 *
 * A lista sai de `rotasPublicas()`: uma página nova entra lá e aparece aqui
 * sozinha, nas duas línguas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return rotasPublicas().flatMap((rota) =>
    routing.locales.map((locale) => ({
      url: urlLocalizado(rota, locale),
      lastModified: new Date(),
      priority: rota === "/" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, urlLocalizado(rota, l)]),
        ),
      },
    })),
  );
}

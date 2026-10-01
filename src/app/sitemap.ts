import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { listarProdutos } from "@/lib/dados";
import { ROTAS_FIXAS, urlLocalizado } from "@/lib/site";
import { caminhoDoArtigo, caminhoDoProduto } from "@/lib/vista";

/**
 * Todas as rotas públicas.
 *
 * ⚠️ **As páginas de produto e de artigo entram aqui e não numa lista à mão.**
 * Saem do mesmo catálogo de onde saem os cartões e as rotas — um produto novo
 * aparece na grelha, ganha página e entra no mapa do site de uma vez. Uma
 * segunda lista era a maneira garantida de um deles ficar fora do Google sem
 * ninguém dar por isso.
 *
 * Vivia no `site.ts` e mudou-se para aqui quando o catálogo passou a vir de
 * `@/lib/dados`, que é só de servidor: o `site.ts` é importado por todo o lado
 * e assim continua sem dados nenhuns.
 */
async function rotasPublicas(): Promise<string[]> {
  const [encomendas, ementa] = await Promise.all([
    listarProdutos({ origem: "encomendas" }),
    listarProdutos({ origem: "ementa" }),
  ]);
  return [
    ...ROTAS_FIXAS,
    ...encomendas.map((p) => caminhoDoProduto(p.id)),
    ...ementa.map((a) => caminhoDoArtigo(a.id)),
  ];
}

/**
 * Uma entrada por rota e por idioma, cada uma a apontar para as suas alternativas
 * — é o que diz ao Google que `/ementa` e `/en/ementa` são a mesma página em
 * duas línguas, e não conteúdo duplicado a competir consigo próprio.
 *
 * A lista sai de `rotasPublicas()`: uma página nova entra lá e aparece aqui
 * sozinha, nas duas línguas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await rotasPublicas()).flatMap((rota) =>
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

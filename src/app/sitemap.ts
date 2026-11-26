import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { listarProdutos } from "@/lib/dados";
import { ROTAS_FIXAS, urlLocalizado } from "@/lib/site";
import { caminhoDoProduto, temPagina } from "@/lib/vista";

/**
 * Todas as rotas públicas.
 *
 * ⚠️ **As páginas de produto entram aqui e não numa lista à mão.**
 * Saem do mesmo catálogo de onde saem os cartões e as rotas — um produto novo
 * aparece na grelha, ganha página e entra no mapa do site de uma vez. Uma
 * segunda lista era a maneira garantida de um deles ficar fora do Google sem
 * ninguém dar por isso.
 *
 * Vivia no `site.ts` e mudou-se para aqui quando o catálogo passou a vir de
 * `@/lib/dados`, que é só de servidor: o `site.ts` é importado por todo o lado
 * e assim continua sem dados nenhuns.
 *
 * ⚠️ **Os artigos do dia a dia não têm página** desde que a `/ementa` saiu
 * (#123, decisão de 12/11): encomendam-se no cartão, na secção «Da carta»
 * da `/encomendas`. Voltar a pô-los aqui era anunciar ao Google 95 endereços
 * que dão 404.
 */
async function rotasPublicas(): Promise<string[]> {
  /* As mesmas páginas que a rota gera (`temPagina`): as encomendas e os
     artigos da carta que se encomendam. */
  const comPagina = (await listarProdutos()).filter(temPagina);
  return [...ROTAS_FIXAS, ...comPagina.map((p) => caminhoDoProduto(p.id))];
}

/**
 * Uma entrada por rota e por idioma, cada uma a apontar para as suas alternativas
 * — é o que diz ao Google que `/encomendas` e `/en/encomendas` são a mesma página em
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

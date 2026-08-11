import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "./site";

/**
 * Monta as metadata de uma página a partir das mensagens, e trata sozinho da
 * parte que é sempre igual e sempre esquecida: o `metadataBase` (sem ele as
 * imagens de partilha saem com caminho relativo e nenhuma rede as resolve) e os
 * `alternates.languages`, que são o que diz ao Google que `/ementa` e
 * `/en/ementa` são a mesma página em duas línguas — e não conteúdo duplicado.
 *
 * `chave` aponta para `metadata.<chave>.{titulo,descricao}` nas mensagens.
 */
export async function metadataDaPagina(
  locale: Locale,
  chave: string,
  rota: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `metadata.${chave}` });
  const marca = await getTranslations({ locale, namespace: "marca" });

  const titulo = t("titulo");
  const descricao = t("descricao");

  return {
    metadataBase: new URL(URL_SITE),
    title: titulo,
    description: descricao,
    alternates: {
      canonical: caminhoLocalizado(rota, locale),
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, caminhoLocalizado(rota, l)]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: marca("nome"),
      title: titulo,
      description: descricao,
      url: urlLocalizado(rota, locale),
      locale: locale === "pt" ? "pt_PT" : "en_GB",
    },
  };
}

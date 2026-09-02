import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "./site";

/**
 * A imagem que aparece quando alguém partilha o site.
 *
 * ## Porque isto passou a existir
 *
 * ⚠️ **Não havia nenhuma.** O `metadataBase` estava aqui há muito, com um
 * comentário a explicar que sem ele "as imagens de partilha saem com caminho
 * relativo e nenhuma rede as resolve" — e depois nunca se definia imagem
 * nenhuma. O caminho estava preparado para uma coisa que não existia: quem
 * mandava o site por WhatsApp ou o colava no Facebook recebia um cartão com
 * texto e um retângulo vazio, que é o formato que as pessoas ignoram.
 *
 * Para uma casa cujo tráfego vem de partilhas e de redes, este é o primeiro
 * ecrã do site para muita gente — antes da homepage.
 *
 * ## O ficheiro
 *
 * `public/og.jpg`, 1200×630, recortado da fotografia da fachada. É o
 * enquadramento que diz tudo de uma vez: o letreiro «Pão Quente», a placa com o
 * pão e o nome, e «Histórias com sabor» pintado no vidro — o slogan da casa e o
 * título do herói, na letra da própria montra.
 *
 * ⚠️ **JPEG e não WebP**, apesar de o resto do site servir WebP. Os
 * pré-visualizadores das redes e das aplicações de mensagens não são browsers e
 * a lista dos que não lêem WebP ainda inclui algumas — e um cartão vazio por
 * causa do formato é exactamente o problema que isto veio resolver.
 *
 * Regenerar a partir de outra fotografia:
 *
 * ```
 * node -e "require('sharp')('public/fotos/06.webp')
 *   .resize(1200,630,{fit:'cover',position:'attention'})
 *   .jpeg({quality:82,mozjpeg:true}).toFile('public/og.jpg')"
 * ```
 */
const IMAGEM_PARTILHA = "/og.jpg";

/**
 * O bloco de imagem para o `openGraph` e para o cartão do X, com o texto
 * alternativo na língua da página.
 *
 * Vive numa função e não numa constante porque **o `alt` é traduzido**, e uma
 * constante obrigava a que uma das duas línguas ficasse escrita à mão no sítio
 * onde fosse usada — que é como uma tradução fica para trás.
 */
export function imagensDePartilha(alt: string) {
  return [{ url: IMAGEM_PARTILHA, width: 1200, height: 630, alt }];
}

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
  const meta = await getTranslations({ locale, namespace: "metadata" });

  const titulo = t("titulo");
  const descricao = t("descricao");
  const imagens = imagensDePartilha(meta("imagemAlt"));

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
      images: imagens,
    },
    /* O X não lê o `openGraph` para escolher o formato do cartão: sem isto
       mostra a miniatura pequena ao lado do texto em vez da imagem inteira. */
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: imagens },
  };
}

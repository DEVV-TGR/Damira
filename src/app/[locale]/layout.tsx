import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { BotaoEncomendar } from "@/components/BotaoEncomendar";
import { FaixaModoTeste } from "@/components/FaixaModoTeste";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { ProvedorConta } from "@/components/conta/ProvedorConta";
import { CestoProvider } from "@/components/encomendas/CestoProvider";
import { ProvedorHistorico } from "@/components/encomendas/ProvedorHistorico";
import { Cesto } from "@/components/encomendas/Cesto";
import { MODO_CONTA } from "@/lib/conta";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, urlLocalizado } from "@/lib/site";
import { imagensDePartilha } from "@/lib/metadata";
import { corpo, display } from "@/lib/fontes";
import "../globals.css";

/** As duas línguas geram-se no `build`; não há renderização a pedido. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.inicio" });
  const marca = await getTranslations({ locale, namespace: "marca" });
  const meta = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(URL_SITE),
    /* O `%s` é o título de cada página; a homepage usa o `default`. Poupa
       repetir o nome da casa em cada `generateMetadata`.
       ⚠️ **Aqui vai o nome curto e não o completo.** "Encomendas — Confeitaria
       e Pão Quente Damira" são 45 caracteres, e um separador de browser mostra
       uns vinte: o que o utilizador lê é "Encomendas — Confeit…", que perde
       justamente a parte que identifica a casa. O nome completo fica onde é
       identificação a sério — na descrição, nos dados estruturados e no
       copyright. */
    title: { default: t("titulo"), template: `%s — ${marca("nomeCurto")}` },
    description: t("descricao"),
    /**
     * ⚠️ **A homepage não tinha `openGraph` nenhum**, e é o URL que mais se
     * partilha — o que se manda a um amigo é "damira.pt", não
     * "damira.pt/encomendas". As outras duas páginas recebiam o bloco pelo
     * `metadataDaPagina()`; esta monta as suas metadata aqui e ficou de fora.
     *
     * ⚠️ **E não se herda.** O `openGraph` de uma rota-filha **substitui** o do
     * pai por inteiro em vez de se fundir campo a campo, por isso este bloco
     * tem de estar completo aqui e completo lá — não chega pô-lo num sítio e
     * contar com o outro.
     */
    openGraph: {
      type: "website",
      siteName: marca("nome"),
      title: t("titulo"),
      description: t("descricao"),
      url: urlLocalizado("/", locale),
      locale: locale === "pt" ? "pt_PT" : "en_GB",
      images: imagensDePartilha(meta("imagemAlt")),
    },
    twitter: {
      card: "summary_large_image",
      title: t("titulo"),
      description: t("descricao"),
      images: imagensDePartilha(meta("imagemAlt")),
    },
  };
}

export default async function LayoutIdioma({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  /* Sem isto, qualquer componente que peça traduções obriga a página a passar a
     dinâmica — e perde-se a geração estática das duas línguas. */
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "metadata.inicio" });
  const nav = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} className={`${display.variable} ${corpo.variable}`}>
      <body>
        {/* ⚠️ **O provedor da conta envolve tudo, mas só monta o `next-auth`
            quando há chaves.** Sem elas o modo é `demonstracao`, a conta vive no
            browser e não se faz pedido nenhum ao `/api/auth/session` — nem um,
            em nenhuma página. Ver `conta.ts` e `ProvedorConta`. */}
        <NextIntlClientProvider>
        <ProvedorConta modo={MODO_CONTA}>
        {/* ⚠️ **O cesto e o histórico subiram da página das encomendas para
            aqui.** Não é arrumação: a página da conta precisa de ler o histórico
            e de repor um pedido antigo no cesto, e um provedor montado só em
            `/encomendas` deixava-a a olhar para `null`. */}
        <CestoProvider>
        <ProvedorHistorico>
          {/* Primeiro tabulador da página: quem navega por teclado salta o
              cabeçalho inteiro em vez de o percorrer em todas as páginas. */}
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-3 focus:rounded focus:bg-tinta focus:px-4 focus:py-2 focus:text-papel"
          >
            {nav("saltarParaConteudo")}
          </a>
          {/* O modo de teste diz-se em voz alta, no topo de todas as páginas.
              Ver `src/lib/modo-teste.ts`. */}
          <FaixaModoTeste />
          <Cabecalho locale={locale as Locale} />
          <main id="conteudo">{children}</main>
          <Rodape />
          {/* Fica fora do `<main>`: é navegação persistente, não conteúdo da
              página. Ver o componente para as duas regras que o mantêm
              discreto. */}
          <BotaoEncomendar />
          {/* ⚠️ **O botão do cesto e o «Encomendas» ocupam o mesmo canto e
              trocam-se**: com o cesto vazio aparece o «Encomendas» (fora das
              encomendas), com alguma coisa dentro aparece o carrinho, em todas as
              páginas — juntar acontece na ementa, nas encomendas e nas páginas de
              produto, e o sinal de que se acertou tem de estar em todas. Nunca os
              dois ao mesmo tempo. */}
          <Cesto locale={locale as Locale} />
        </ProvedorHistorico>
        </CestoProvider>
        </ProvedorConta>
        </NextIntlClientProvider>
        <DadosEstruturados descricao={t("descricao")} />
        <Analytics />
      </body>
    </html>
  );
}

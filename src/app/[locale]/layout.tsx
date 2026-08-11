import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE } from "@/lib/site";
import "../globals.css";

/**
 * ⚠️ **As duas fontes são aproximações.** O impresso usa um display condensado
 * com textura gasta e um sans humanista, e nenhum dos dois se identifica a
 * partir de um PDF achatado. Quando aparecer o manual de marca, trocam-se aqui e
 * mudam em todo o lado.
 *
 * A **Bricolage Grotesque** entrou por ter eixos de largura e de tamanho ótico:
 * dá para abrir um título gigante e apertar uma etiqueta de 12 px sem trocar de
 * família, e é isso que mantém a página coerente. A Anton, que aqui esteve
 * antes, é uma fonte de póster — puxava a página para o registo gritado do
 * impresso, que é justamente o que esta direção não quer.
 *
 * `next/font` descarrega-as no `build` e serve-as do próprio domínio, que é o
 * que permite ao `font-src 'self'` da CSP ser tão fechado.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--fonte-display",
  display: "swap",
});

const corpo = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});

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

  return {
    metadataBase: new URL(URL_SITE),
    /* O `%s` é o título de cada página; a homepage usa o `default`. Poupa
       repetir "— Santo Burga" em cada `generateMetadata`. */
    title: { default: t("titulo"), template: `%s — ${marca("nome")}` },
    description: t("descricao"),
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
        <NextIntlClientProvider>
          {/* Primeiro tabulador da página: quem navega por teclado salta o
              cabeçalho inteiro em vez de o percorrer em todas as páginas. */}
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-3 focus:rounded focus:bg-tinta focus:px-4 focus:py-2 focus:text-papel"
          >
            {nav("saltarParaConteudo")}
          </a>
          <Cabecalho locale={locale as Locale} />
          <main id="conteudo">{children}</main>
          <Rodape />
        </NextIntlClientProvider>
        <DadosEstruturados descricao={t("descricao")} />
        <Analytics />
      </body>
    </html>
  );
}

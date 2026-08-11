import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Carta } from "@/components/ementa/Carta";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale as Locale, "ementa", "/ementa");
}

export default async function PaginaEmenta({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations({ locale, namespace: "ementa" });

  return <Ementa locale={locale as Locale} />;
}

function Ementa({ locale }: { locale: Locale }) {
  const t = useTranslations("ementa");

  return (
    <>
      {/* Abre a magenta chapado, como a coluna direita da primeira página do
          impresso. Daí para baixo as secções alternam pelas quatro faces. */}
      <div className="bloco-magenta-texto relative overflow-hidden">
        <div className="envolvente relative py-[clamp(3.5rem,8vw,6rem)]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em] opacity-80">
            {t("navegar")}
          </p>
          <h1
            className="titulo-display mt-4 text-[clamp(3.5rem,12vw,9rem)] uppercase"
            style={{ fontVariationSettings: '"wdth" 68, "opsz" 48' }}
          >
            {t("titulo")}
          </h1>
          <p className="mt-4 max-w-[42ch] text-lg">{t("intro")}</p>
        </div>

        <span
          aria-hidden
          className="traco pointer-events-none absolute -right-14 top-1/2 hidden h-[24rem] w-[23.7rem] -translate-y-1/2 opacity-20 lg:block"
          style={{
            maskImage: "url(/tracos/hamburguer.png)",
            WebkitMaskImage: "url(/tracos/hamburguer.png)",
          }}
        />
      </div>

      <Carta locale={locale} />

      {/* As duas primeiras notas estão em letra pequena no impresso e são
          compromissos com quem se senta à mesa — o acompanhamento incluído e o
          I.V.A. A terceira é nossa, e existe porque a lei manda ter a informação
          de alergénios disponível, mesmo quando não vai escrita na carta. */}
      <aside className="bg-tinta text-papel">
        <ul className="envolvente max-w-[70ch] space-y-2 py-12 text-sm text-papel/70">
          <li>{t("notas.acompanhamento")}</li>
          <li>{t("notas.iva")}</li>
          <li>{t("notas.alergenios")}</li>
          <li>{t("notas.precos")}</li>
        </ul>
      </aside>
    </>
  );
}

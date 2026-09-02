import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ementa } from "@/data/ementa";
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
      {/* ⚠️ **Abria a tijolo, e a primeira carta é tijolo também.** Os dois
          blocos ficavam colados com uma tira branca de navegação a separá-los, e
          lia-se como um só bloco interrompido — o salto de cor que devia
          anunciar «começou a carta da casa» não acontecia, porque a cor já lá
          estava.

          Passou a tinta. Daí para baixo a cor marca **a carta** e não a secção
          (ver o comentário em `Carta.tsx`), e a sequência ficou: tinta, tijolo,
          papel-fundo, verde, tinta. Nenhuma face repete a anterior. */}
      <div className="relative overflow-hidden bg-tinta text-papel">
        <div className="envolvente relative py-[clamp(3.5rem,8vw,6rem)]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em] opacity-80">
            {t("quantosArtigos", { n: ementa.length })}
          </p>
          <h1
            className="titulo-display titulo-capa mt-4 uppercase"
            style={{ fontVariationSettings: '"wdth" 68, "opsz" 48' }}
          >
            {t("titulo")}
          </h1>
          <p className="mt-4 max-w-[42ch] text-lg">{t("intro")}</p>
        </div>

        <span
          aria-hidden
          className="traco pointer-events-none absolute -right-[6%] top-1/2 hidden h-[150%] w-[38%] -translate-y-1/2 opacity-[0.13] lg:block"
          style={{
            maskImage: "url(/marca/simbolo.svg)",
            WebkitMaskImage: "url(/marca/simbolo.svg)",
          }}
        />
      </div>

      <Carta locale={locale} />

      {/* As notas que valem para a ementa toda. As que pertencem a uma secção
          — a batata, os sabores do dia, as palhinhas — ficam coladas a essa
          secção, e não aqui. A dos alergénios é nossa, e existe porque a lei
          manda ter a informação disponível mesmo quando não vai escrita na
          carta. */}
      <aside className="bg-tinta text-papel">
        <ul className="envolvente max-w-[70ch] space-y-2 py-12 text-sm text-papel/70">
          <li>{t("notas.iva")}</li>
          <li>{t("notas.alergenios")}</li>
          <li>{t("notas.precos")}</li>
        </ul>
      </aside>
    </>
  );
}

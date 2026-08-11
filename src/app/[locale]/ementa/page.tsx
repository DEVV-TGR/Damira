import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { NavegacaoEmenta } from "@/components/ementa/NavegacaoEmenta";
import { SeccaoEmenta } from "@/components/ementa/SeccaoEmenta";
import { categoriasComArtigos } from "@/data/ementa";
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
  const categorias = categoriasComArtigos();

  return (
    <>
      <div className="bloco-magenta">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h1 className="titulo-display text-6xl sm:text-8xl">{t("titulo")}</h1>
          <p className="mt-3 max-w-[46ch] text-lg">{t("intro")}</p>
        </div>
      </div>

      <NavegacaoEmenta categorias={categorias} />

      {categorias.map((categoria, indice) => (
        <SeccaoEmenta
          key={categoria}
          categoria={categoria}
          indice={indice}
          locale={locale}
        />
      ))}

      {/* As duas primeiras notas estão em letra pequena no impresso e são
          compromissos com quem se senta à mesa — o acompanhamento incluído e o
          I.V.A. A terceira é nossa, e existe porque a lei manda ter a informação
          de alergénios disponível, mesmo quando não vai escrita na carta. */}
      <aside className="mx-auto max-w-6xl px-5 py-12 text-sm opacity-75">
        <ul className="space-y-2">
          <li>{t("notas.acompanhamento")}</li>
          <li>{t("notas.iva")}</li>
          <li>{t("notas.alergenios")}</li>
        </ul>
      </aside>
    </>
  );
}

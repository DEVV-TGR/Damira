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
      <div className="relative overflow-hidden">
        <div className="envolvente relative py-[clamp(4rem,9vw,7rem)]">
          <p className="olho">{t("navegar")}</p>
          <h1 className="titulo-display mt-5 text-[clamp(3.5rem,11vw,8rem)]">
            {t("titulo")}
          </h1>
          <p className="mt-5 max-w-[42ch] text-lg text-tinta-suave">{t("intro")}</p>
        </div>

        {/* O hambúrguer do impresso a espreitar pela direita, cortado pela
            margem. Cortá-lo é de propósito: sugere que continua para lá do ecrã
            e evita que pareça um autocolante pousado no canto. */}
        <span
          aria-hidden
          className="traco pointer-events-none absolute -right-16 top-1/2 hidden h-[26rem] w-[25.7rem] -translate-y-1/2 text-turquesa lg:block"
          style={{
            maskImage: "url(/tracos/hamburguer.png)",
            WebkitMaskImage: "url(/tracos/hamburguer.png)",
          }}
        />
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
      <aside className="envolvente py-14 text-sm text-tinta-suave">
        <ul className="max-w-[70ch] space-y-2">
          <li>{t("notas.acompanhamento")}</li>
          <li>{t("notas.iva")}</li>
          <li>{t("notas.alergenios")}</li>
        </ul>
      </aside>
    </>
  );
}

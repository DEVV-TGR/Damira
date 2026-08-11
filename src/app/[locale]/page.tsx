import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Hero } from "@/components/inicio/Hero";
import { CarrosselMaisPedidos } from "@/components/inicio/CarrosselMaisPedidos";
import { FaixaFotografias } from "@/components/inicio/FaixaFotografias";
import { Casa } from "@/components/casas/Casa";
import { bestSellers } from "@/data/ementa";
import { restaurantes } from "@/data/restaurantes";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PaginaInicial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inicio locale={locale as Locale} />;
}

function Inicio({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio");

  return (
    <>
      <Hero />

      <section className="seccao">
        {/* Os doze do selo, tirados do JSON — marcar um artigo novo como
            `bestSeller` põe-no aqui sem tocar nesta página. */}
        <CarrosselMaisPedidos artigos={bestSellers()} locale={locale} />
      </section>

      <FaixaFotografias />

      <section aria-labelledby="casas" className="seccao">
        <div className="envolvente">
          <p className="olho">{t("casas.olho")}</p>
          <h2
            id="casas"
            className="titulo-display mt-4 max-w-[14ch] text-[clamp(2.5rem,6vw,4.5rem)]"
          >
            {t("casas.titulo")}
          </h2>
          <p className="mt-4 max-w-[46ch] text-tinta-suave">{t("casas.texto")}</p>

          <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-12">
            {restaurantes.map((casa) => (
              <Casa key={casa.id} casa={casa} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

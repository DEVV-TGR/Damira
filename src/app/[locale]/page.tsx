import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Casa } from "@/components/casas/Casa";
import { ArtigoEmenta } from "@/components/ementa/ArtigoEmenta";
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
  const marca = useTranslations("marca");

  return (
    <>
      <section className="bloco-magenta">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <h1 className="titulo-display max-w-[14ch] text-5xl sm:text-7xl lg:text-8xl">
            {marca("assinatura")}
          </h1>
          <p className="mt-6 text-lg font-semibold uppercase tracking-wide">
            {marca("quadrado")}
          </p>
          <p className="mt-4 max-w-[46ch]">{t("heroTexto")}</p>
          <Link
            href="/ementa"
            className="mt-8 inline-block rounded-full bg-papel px-6 py-3 text-sm font-bold uppercase tracking-wide text-tinta"
          >
            {t("verEmenta")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="best-sellers" className="mx-auto max-w-6xl px-5 py-20">
        <h2 id="best-sellers" className="titulo-display text-4xl sm:text-5xl">
          {t("bestSellers.titulo")}
        </h2>
        <p className="mt-3 max-w-[52ch] opacity-80">{t("bestSellers.texto")}</p>
        {/* Os doze do selo, tirados do JSON — marcar um artigo novo como
            `bestSeller` põe-no aqui sem tocar nesta página. */}
        <ul className="mt-6 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {bestSellers().map((artigo) => (
            <ArtigoEmenta key={artigo.id} artigo={artigo} locale={locale} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="casas" className="bloco-coral py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="casas" className="titulo-display text-4xl sm:text-5xl">
            {t("casas.titulo")}
          </h2>
          <p className="mt-3 max-w-[52ch]">{t("casas.texto")}</p>
          <div className="mt-10 grid gap-12 lg:grid-cols-2">
            {restaurantes.map((casa) => (
              <Casa key={casa.id} casa={casa} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { casa } from "@/data/casa";
import { Checkout } from "@/components/encomendas/Checkout";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* ⚠️ Fora dos motores de busca: é o fim de um caminho que começa no cesto, e
   uma pesquisa que caísse aqui com o cesto vazio encontrava uma página vazia. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "encomendas.compra" });
  return { title: t("titulo"), robots: { index: false, follow: false } };
}

export default async function PaginaCompra({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Compra locale={locale as Locale} />;
}

function Compra({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.compra");
  const tp = useTranslations("produto");

  return (
    <div className="seccao">
      <div className="envolvente">
        <Link
          href="/encomendas"
          className="alvo-toque inline-block text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
        >
          {tp("voltar")}
        </Link>
        <h1 className="titulo-display titulo-beta mt-6">{t("titulo")}</h1>
        <p className="mt-3 max-w-[52ch] text-lg text-tinta-suave">{t("intro")}</p>
        <div className="mt-10">
          <Checkout locale={locale} telefone={casa.telefone} />
        </div>
      </div>
    </div>
  );
}

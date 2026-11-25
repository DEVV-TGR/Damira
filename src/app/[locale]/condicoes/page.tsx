import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { ATUALIZADAS_EM, CONDICOES, EMAIL_ENCOMENDAS } from "@/lib/legal/condicoes";
import { PaginaLegal } from "@/components/PaginaLegal";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale as Locale, "condicoes", "/condicoes");
}

/**
 * As condições de encomenda (#52). O texto, e de quem é cada parte, está em
 * `src/lib/legal/condicoes.ts`.
 *
 * ⚠️ **A página de compra liga para aqui por cima do botão de enviar**, e é
 * isso que cumpre o «informar antes de o cliente ficar vinculado» do ponto 7:
 * uma página que só está no rodapé chega depois da compra.
 */
export default async function PaginaCondicoes({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.condicoes" });

  return (
    <PaginaLegal
      locale={locale}
      titulo={t("titulo")}
      atualizadaEm={ATUALIZADAS_EM}
      seccoes={CONDICOES}
      email={EMAIL_ENCOMENDAS}
    />
  );
}

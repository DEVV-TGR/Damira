import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { ATUALIZADA_EM, EMAIL_PRIVACIDADE, POLITICA } from "@/lib/legal/privacidade";
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
  return metadataDaPagina(locale as Locale, "privacidade", "/privacidade");
}

/**
 * A política de privacidade e de cookies (#52).
 *
 * O texto vive em `src/lib/legal/privacidade.ts`, e é lá que se lê de quem é
 * cada parte. Aqui só se desenha.
 *
 * ⚠️ **Os cookies não têm página própria nem faixa a pedir consentimento.** O
 * site só usa o estritamente necessário (a sessão, o cesto), e para isso a lei
 * não pede consentimento. Uma faixa a pedir licença para nada ensinava as
 * pessoas a carregar em «aceitar» sem ler — e o dia em que entrar um cookie que
 * precise mesmo de consentimento é o dia em que a faixa tem de aparecer, e não
 * antes. Ver a secção 11.
 */
export default async function PaginaPrivacidade({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.privacidade" });

  return (
    <PaginaLegal
      locale={locale}
      titulo={t("titulo")}
      atualizadaEm={ATUALIZADA_EM}
      seccoes={POLITICA}
      email={EMAIL_PRIVACIDADE}
    />
  );
}

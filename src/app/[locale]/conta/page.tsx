import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CONTA_ATIVA } from "@/lib/conta";
import { routing } from "@/i18n/routing";
import { PainelConta } from "@/components/conta/PainelConta";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta" });
  /* Ver `entrar/page.tsx`: uma página de conta não é para ser encontrada numa
     pesquisa, e fora do `sitemap.ts` pela mesma razão. */
  return { title: t("aMinhaConta"), robots: { index: false, follow: false } };
}

/**
 * A conta.
 *
 * ## ⚠️ Página de cliente, e a sessão não se lê aqui
 *
 * O conteúdo depende de quem entrou, e ler isso no servidor obrigava a página a
 * ser dinâmica. Como **não há nada de secreto aqui** — o que se mostra é o nome
 * e o email que o próprio Google já devolveu ao browser desta pessoa — a página
 * é gerada no `build` e o painel preenche-se do lado do cliente.
 *
 * No dia em que houver histórico de encomendas isto muda: aí há dados nossos,
 * aí é preciso lê-los no servidor com a sessão verificada, e aí a página passa a
 * dinâmica. É a fronteira certa, e é agora que ela está escrita.
 */
export default async function PaginaConta({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!CONTA_ATIVA) notFound();

  return <PainelConta />;
}

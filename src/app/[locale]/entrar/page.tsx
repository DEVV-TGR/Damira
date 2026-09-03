import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { CONTA_ATIVA, FORNECEDORES } from "@/lib/conta";
import { routing } from "@/i18n/routing";
import { Entrada } from "@/components/conta/Entrada";
import { Link } from "@/i18n/navigation";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠️ **`noindex`, e não é descuido.**
 *
 * Uma página de entrada não tem conteúdo para quem procura uma pastelaria, e
 * indexada rouba lugar às que têm. Não entra no `sitemap.ts` pela mesma razão.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta" });
  return { title: t("entrar"), robots: { index: false, follow: false } };
}

export default async function PaginaEntrar({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /* ⚠️ **Sem conta configurada, a página não existe.** Um 404 é a resposta
     honesta: mostrar um ecrã de entrada com zero botões é pior do que não ter
     ecrã nenhum. Ver `conta.ts`. */
  if (!CONTA_ATIVA) notFound();

  return <Entrar />;
}

function Entrar() {
  const t = useTranslations("conta");

  return (
    <div className="seccao">
      {/* ⚠️ **A largura não se aperta na própria `.envolvente`.** Um
          `max-w-[34rem]` escrito ao lado dela resolve para 1248 px e não para
          544: perde para a classe de `@layer components`, em silêncio e sem
          erro nenhum — é a armadilha nº 6 do AGENTS.md, desta vez do lado da
          largura. A medida vive num `<div>` por dentro, onde não compete com
          nada. */}
      <div className="envolvente">
        <div className="max-w-[34rem]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">
            {t("olho")}
          </p>
          <h1 className="titulo-display titulo-beta mt-4">{t("entrarTitulo")}</h1>
          <p className="mt-4 text-tinta-suave">{t("entrarTexto")}</p>

          <div className="mt-10">
            <Entrada fornecedores={FORNECEDORES} />
          </div>

          {/* ⚠️ **A saída sem conta fica à vista e não em letra pequena.**
              A conta nunca é obrigatória para encomendar, e uma página de
              entrada sem porta de saída ensina o contrário — quem chega aqui a
              meio de um pedido tem de poder continuar sem se registar. */}
          <p className="mt-8 border-t border-tinta/15 pt-6 text-sm text-tinta-suave">
            {t("semConta")}{" "}
            <Link
              href="/encomendas"
              className="font-semibold text-tijolo underline underline-offset-4"
            >
              {t("semContaLigacao")}
            </Link>
          </p>

          <p className="mt-6 text-sm text-tinta-suave">{t("privacidade")}</p>
        </div>
      </div>
    </div>
  );
}

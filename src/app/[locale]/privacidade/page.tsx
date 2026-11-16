import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { ATUALIZADA_EM, EMAIL_PRIVACIDADE, POLITICA, type Bloco } from "@/lib/legal/privacidade";

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
  const t = await getTranslations({ locale, namespace: "legal" });
  const tMeta = await getTranslations({ locale, namespace: "metadata.privacidade" });

  /* A data escreve-se à mão: é uma data de calendário, sem hora, e o
     `Intl` num servidor em UTC já a pôs no dia anterior uma vez. */
  const [ano, mes, dia] = ATUALIZADA_EM.split("-");
  const data = `${dia}/${mes}/${ano}`;

  return (
    <div className="seccao">
      <div className="envolvente">
        {/* A medida num `<div>` por dentro, e não ao lado da `.envolvente`
            (armadilha 14 do AGENTS.md). 42 rem é uma linha de leitura. */}
        <article className="max-w-[42rem]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">{t("olho")}</p>
          <h1 className="titulo-display titulo-beta mt-4">{tMeta("titulo")}</h1>
          <p className="mt-4 text-sm text-tinta-suave">{t("atualizadaEm", { data })}</p>

          {locale !== "pt" && (
            <p lang="en" className="mt-6 border-l-4 border-tijolo pl-4 text-tinta-suave">
              {t("apenasPortugues")}
            </p>
          )}

          <nav aria-label={t("indice")} className="mt-10 border-y border-tinta/15 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">{t("indice")}</p>
            <ol className="mt-3 space-y-1 text-sm" lang="pt">
              {POLITICA.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="alvo-toque inline-flex min-h-8 items-center underline decoration-tijolo/40 underline-offset-4 hover:decoration-tijolo">
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div lang="pt">
            {POLITICA.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-12 scroll-mt-28">
                <h2 id={`${s.id}-titulo`} className="titulo-display text-2xl leading-tight">
                  {s.titulo}
                </h2>
                <Blocos blocos={s.blocos} />
                {s.subseccoes?.map((sub) => (
                  <div key={sub.titulo} className="mt-6">
                    <h3 className="font-semibold">{sub.titulo}</h3>
                    <Blocos blocos={sub.blocos} />
                  </div>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-14 border-t border-tinta/15 pt-6 text-sm text-tinta-suave">
            {t("contacto")}{" "}
            <a href={`mailto:${EMAIL_PRIVACIDADE}`} className="font-semibold text-tijolo underline underline-offset-4">
              {EMAIL_PRIVACIDADE}
            </a>
          </p>
        </article>
      </div>
    </div>
  );
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return blocos.map((b, i) =>
    typeof b === "string" ? (
      <p key={i} className="mt-3 leading-relaxed">
        {b}
      </p>
    ) : (
      <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-tijolo">
        {b.lista.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ),
  );
}

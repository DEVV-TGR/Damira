"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Marca } from "./Marca";

/**
 * Cliente por causa do seletor de idioma, que precisa de saber em que página
 * está para trocar de língua **sem sair dela** — mandar sempre para a homepage
 * é o erro clássico, e faz o visitante perder o sítio onde ia.
 */
export function Cabecalho({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  /* O `usePathname` do next-intl devolve o caminho já sem prefixo de idioma, que
     é o que o `Link` dele volta a precisar. */
  const caminho = usePathname();
  const outra = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    /* Altura fixa, e não `py-*`: a navegação da ementa cola-se por baixo desta
       barra com `top-16`, e uma altura que muda com o conteúdo deixava uma
       fresta ou uma sobreposição consoante o tamanho do ecrã. */
    <header className="sticky top-0 z-50 h-16 border-b-2 border-tinta bg-papel">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="text-2xl sm:text-3xl" aria-label={t("inicio")}>
          <Marca />
        </Link>

        <nav className="flex items-center gap-5 text-sm font-semibold uppercase tracking-wide">
          <Link href="/" className="hover:text-magenta-forte">
            {t("inicio")}
          </Link>
          <Link href="/ementa" className="hover:text-magenta-forte">
            {t("ementa")}
          </Link>
          <Link
            href={caminho}
            locale={outra}
            className="bloco-magenta-texto rounded-full px-3 py-1.5"
            /* `lang` no link diz aos leitores de ecrã para pronunciar "English"
               à inglesa, em vez de o lerem com fonética portuguesa. */
            lang={outra}
          >
            {t("mudarIdioma")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

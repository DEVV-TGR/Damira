"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Marca } from "./Marca";

/**
 * Cliente por causa do seletor de idioma, que precisa de saber em que página
 * está para trocar de língua **sem sair dela** — mandar sempre para a homepage é
 * o erro clássico, e faz o visitante perder o sítio onde ia.
 */
export function Cabecalho({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  /**
   * ⚠️ **Este `usePathname` é o de `@/i18n/navigation`, não o do
   * `next/navigation`.** Só o primeiro devolve o caminho **sem** o prefixo de
   * idioma, que é o que o `Link` volta a precisar para lhe pôr o prefixo novo.
   *
   * Com o do Next, em `/en` o caminho vinha `/en` e o botão «Português»
   * apontava para `/pt/en` — um URL que não existe, que o negociador de idioma
   * devolvia ao inglês, e **de onde não se saía**. Só se via de `/en` para `/pt`;
   * no sentido contrário não há prefixo para duplicar e parecia tudo bem.
   */
  const caminho = usePathname();
  const outra = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    /* Altura fixa, e não `py-*`: a navegação da ementa cola-se por baixo desta
       barra com `top-16`, e uma altura que muda com o conteúdo deixava uma
       fresta ou uma sobreposição consoante o tamanho do ecrã.

       `backdrop-blur` com o papel a 80%: a barra deixa adivinhar o que passa por
       baixo em vez de a cortar a direito, que é o que a faz parecer pousada
       sobre a página e não colada em cima dela. */
    <header className="barra-vidro sticky top-0 z-50 h-16 border-b border-tinta/10 bg-papel/80 backdrop-blur-md">
      <div className="envolvente flex h-full items-center justify-between gap-3 sm:gap-6">
        {/* O tamanho do logótipo sai daqui: a `Marca` desenha-se a `1em` de
            altura, e a `text-xl` dava 20 px — a palavra "damira" a 52 px de
            largura, que num cabeçalho não se lê, lê-se-lhe a forma. A 1,75 rem
            passa a wordmark. */}
        <Link
          href="/"
          className="text-[1.5rem] sm:text-[1.75rem]"
          aria-label={t("inicio")}
        >
          <Marca />
        </Link>

        {/* ⚠️ **As encomendas estavam fora daqui**, e a chave `nav.encomendas`
            existia nas duas línguas sem ninguém a usar. Quem entrasse em
            `/encomendas` por um link ou pela pesquisa não tinha como lá voltar
            senão pelos botões do corpo da página — e uma página de topo que só
            se alcança a partir de outra não é uma página de topo.

            O «Início» saiu para lhe dar o lugar: o logótipo já é a ligação para
            a homepage (tem o `aria-label` a dizê-lo) e dois caminhos para o
            mesmo sítio, lado a lado, gastam a largura que num telemóvel não
            sobra. `gap-4` até ao `sm` pela mesma razão. */}
        <nav className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.09em] sm:gap-6 sm:text-xs sm:tracking-widest">
          <Link href="/ementa" className="hover:text-tijolo">
            {t("ementa")}
          </Link>
          <Link href="/encomendas" className="hover:text-tijolo">
            {t("encomendas")}
          </Link>
          <Link
            href={caminho}
            locale={outra}
            className="rounded-full border border-tinta/25 px-3 py-2 transition-colors hover:bg-tinta hover:text-papel sm:px-3.5"
            /* `lang` no link diz aos leitores de ecrã para pronunciar "English"
               à inglesa, em vez de o lerem com fonética portuguesa. */
            lang={outra}
            /* ⚠️ **O nome acessível vem daqui e não do que está escrito.** Num
               telemóvel o botão mostra só «EN», que poupa a largura que a
               entrada das encomendas passou a ocupar; sem este `aria-label`,
               quem ouve a página passava a ouvir duas letras em vez da palavra.
               A abreviatura é para os olhos, não para os ouvidos. */
            aria-label={t("mudarIdioma")}
          >
            {/* Duas caixas e não uma cadeia cortada: o código do idioma **é**
                o idioma (`outra` vale "pt" ou "en"), e escrevê-lo à mão era
                mais um sítio para desirmanar quando aparecer uma terceira
                língua. */}
            <span aria-hidden className="sm:hidden">
              {outra}
            </span>
            <span aria-hidden className="hidden sm:inline">
              {t("mudarIdioma")}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

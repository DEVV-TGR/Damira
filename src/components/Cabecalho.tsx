"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { BotaoConta } from "./conta/BotaoConta";
import { MenuEncomendas, type SeccaoDoMenu } from "./MenuEncomendas";

/* ⚠️ **A barra tem uma secção só, as encomendas.** Até 12/11 havia também a
   ementa, numa lista com as duas; a `/ementa` saiu (#123) e a lista com ela.
   Se voltar uma segunda secção, volta a lista: o «estou nesta página» tem de
   ser decidido da mesma maneira para todas, e duplicar a condição é como uma
   delas fica para trás. */

/**
 * Cliente por causa do seletor de idioma, que precisa de saber em que página
 * está para trocar de língua **sem sair dela** — mandar sempre para a homepage é
 * o erro clássico, e faz o visitante perder o sítio onde ia.
 */
export function Cabecalho({
  locale,
  seccoes,
  faixaDesconto,
}: {
  locale: Locale;
  seccoes: SeccaoDoMenu[];
  faixaDesconto?: ReactNode;
}) {
  const t = useTranslations("nav");
  const marca = useTranslations("marca");
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
  const noCatalogo = caminho === "/encomendas";
  const outra = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    /* Altura fixa, e não `py-*`: os títulos das secções da `/encomendas` colam-se
       por baixo desta barra, e uma altura que muda com o conteúdo deixava uma
       fresta ou uma sobreposição consoante o tamanho do ecrã.

       `backdrop-blur` com o papel a 80%: a barra deixa adivinhar o que passa por
       baixo em vez de a cortar a direito, que é o que a faz parecer pousada
       sobre a página e não colada em cima dela. */
    <>
    <header className="cabecalho-publico sticky top-0 z-50">
      <div className="barra-vidro h-[var(--altura-barra-principal)] border-b border-tinta/10 bg-papel/80 backdrop-blur-md">
      {/* ⚠️ **As folgas abaixo do `sm` foram apertadas quando a conta entrou.**
          A barra passou de quatro para cinco elementos e, a 320 px, o conteúdo
          somava 380 px — a página inteira ganhava rolagem horizontal, que é o
          defeito nº 11 do AGENTS.md e não aparece em ecrã nenhum de quem
          desenvolve. Medido à mão a 320, 340, 360, 375, 390 e 414 px. Nada disto
          muda a partir do `sm`. */}
      <div className="envolvente flex h-full items-center justify-between gap-2 sm:gap-6">
        <Link href="/" className="alvo-toque flex min-h-11 items-center">
          <Image
            src="/marca/damira-horizontal.png"
            alt={marca("nomeCurto")}
            width={2091}
            height={290}
            className="h-auto w-28 sm:w-44"
            loading="eager"
            unoptimized
          />
        </Link>

        {/* ⚠️ **As encomendas estavam fora daqui**, e a chave `nav.encomendas`
            existia nas duas línguas sem ninguém a usar. Quem entrasse em
            `/encomendas` por um link ou pela pesquisa não tinha como lá voltar
            senão pelos botões do corpo da página — e uma página de topo que só
            se alcança a partir de outra não é uma página de topo.

            O «Início» saiu para lhe dar o lugar: o logótipo já é a ligação para
            a homepage e dois caminhos para o
            mesmo sítio, lado a lado, gastam a largura que num telemóvel não
            sobra. `gap-4` até ao `sm` pela mesma razão. */}
        <nav className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.02em] sm:gap-6 sm:text-xs sm:tracking-widest">
          {/* ⚠️ **Nenhuma das duas dizia em que página se estava.** Com uma só
              entrada era quase desculpável; com duas, a barra passa a ser uma
              escolha, e uma escolha que não mostra a opção activa obriga quem
              chega de fora — de uma partilha, de uma pesquisa — a ler o título
              da página para saber onde caiu.

              O `aria-current` é a metade que conta: é o que faz um leitor de
              ecrã anunciar "página actual" em vez de mais um link igual aos
              outros. O filete a tijolo é a mesma marca que o `.olho` usa e que
              as ligações dos contactos e do rodapé já sublinham — o estado novo
              não traz desenho novo, usa o que a casa tem. */}
          {/* As encomendas abrem um menu com as secções da página (#82). Ver
              `MenuEncomendas.tsx`. */}
          <MenuEncomendas actual={noCatalogo} seccoes={seccoes} />
          {/* ⚠️ **A conta fica antes do idioma e depois das secções.** É
              navegação pessoal e não navegação do site: pô-la antes das
              encomendas dava-lhe o mesmo peso que à página que a casa quer que
              se visite. Sem conta configurada não renderiza nada e
              este espaço fecha-se sozinho. */}
          <BotaoConta />

          <Link
            href={caminho}
            locale={outra}
            className="alvo-toque controlo-cabecalho inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-tinta/25 transition-colors hover:bg-tinta"
            /* `lang` no link diz aos leitores de ecrã para pronunciar "English"
               à inglesa, em vez de o lerem com fonética portuguesa. */
            lang={outra}
            hrefLang={outra}
            aria-label={t("mudarIdioma")}
          >
            <Image
              src={`/idiomas/${outra}.png`}
              alt=""
              width={96}
              height={outra === "pt" ? 64 : 58}
              className="h-auto w-6 rounded-[2px]"
              unoptimized
            />
          </Link>
        </nav>
      </div>
      </div>
      {noCatalogo && faixaDesconto}
    </header>
    {!noCatalogo && faixaDesconto}
    </>
  );
}

"use client";

import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Se há página do site para onde voltar, sem sair dele.
 *
 * ⚠️ **Nem o `document.referrer` nem o `history.length` respondem a isto
 * sozinhos.** O `referrer` é o da **carga** do documento, e o Next navega sem
 * recarregar: quem chega à ementa pelo Google e abre um artigo continua com o
 * Google como `referrer`, apesar de ter vindo da ementa. E o `history.length`
 * conta as páginas de outros sites no mesmo separador — quem chega de uma
 * pesquisa tem dois, e um `back()` levava-o de volta à pesquisa.
 *
 * Por isso quatro perguntas, pela ordem:
 *
 * 1. Sem história nenhuma (separador novo), não há para onde voltar.
 * 2. Se se trocou de língua desde a carga, o `back()` não serve (ver abaixo).
 * 3. Se a página que **carregou** o documento não é esta, houve navegação
 *    dentro do site desde então — há uma página nossa atrás.
 * 4. Se esta foi a que carregou, só há uma página nossa atrás se o `referrer`
 *    for da mesma origem (uma carga completa vinda do site, ou um recarregar).
 *
 * ⚠️ **Trocar de língua também navega, e deixa a página anterior na outra
 * língua.** Abrir a `/ementa`, entrar num artigo e passar para inglês deixa no
 * histórico o mesmo artigo em português: o `back()` desfazia só a troca, e a
 * pessoa ficava no artigo em vez de voltar à lista. O histórico não diz o que
 * está na entrada anterior, por isso, depois de uma troca, vai-se pela lista na
 * língua de agora — perde-se a posição na lista, mas nunca se cai no sítio
 * errado nem na língua que se acabou de recusar.
 *
 * Lê-se no clique e não ao montar: o histórico muda depois da montagem, e
 * a resposta só interessa no instante em que alguém a pede.
 */
const linguaDe = (caminho: string): string =>
  routing.locales.find(
    (lingua) =>
      lingua !== routing.defaultLocale && (caminho === `/${lingua}` || caminho.startsWith(`/${lingua}/`)),
  ) ?? routing.defaultLocale;

function haPaginaDoSiteAtras(): boolean {
  if (window.history.length <= 1) return false;

  const [carga] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (carga) {
    try {
      const caminhoDaCarga = new URL(carga.name).pathname;
      if (linguaDe(caminhoDaCarga) !== linguaDe(window.location.pathname)) return false;
      if (caminhoDaCarga !== window.location.pathname) return true;
    } catch {
      /* Um `name` que não é URL não decide nada: segue para o `referrer`. */
    }
  }

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    /* `referrer` vazio — entrou pelo endereço, por um favorito ou por uma app
       que não o manda. */
    return false;
  }
}

/**
 * # «Voltar atrás», fixo no canto, nas páginas de produto
 *
 * Pedido da casa a 12/10 (#86): numa página de produto longa — um kit de festa
 * com a tabela de escalões, o bolo por medida com o catálogo — o único caminho
 * de volta estava no topo, e no telemóvel o «voltar» do browser some-se com a
 * rolagem.
 *
 * ## Volta para onde se estava, e não para o topo da lista
 *
 * Quem abriu uma box a meio da `/encomendas` quer voltar a meio da
 * `/encomendas`: o `router.back()` repõe a posição, um link para a lista não.
 * Quem entrou direto pelo endereço não tem página nossa atrás — e um `back()`
 * levava-o para fora do site —, por isso aí vai para a lista, o mesmo destino
 * do link «voltar» do topo.
 *
 * ⚠️ **É um link, e o `back()` é que é o extra.** O `href` é a lista: sem
 * JavaScript, com o botão do meio ou com `Ctrl`/`Cmd`, faz o que um link faz.
 * Só o clique simples é interceptado.
 *
 * ## ⚠️ O canto de baixo à esquerda, e não o da direita
 *
 * O da direita é do «Encomendas» flutuante e do carrinho, que se trocam um
 * pelo outro (armadilha 17). Em cima não pode ser: o cabeçalho cola-se lá, e a
 * faixa do modo de teste está por cima dele. Em baixo à esquerda não há nada
 * fixo nestas páginas, e fica à mão do polegar.
 */
export function VoltarAtras({ para }: { para: "/encomendas" | "/ementa" }) {
  const t = useTranslations("nav");
  const router = useRouter();

  const voltar = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey
    ) {
      return;
    }
    if (!haPaginaDoSiteAtras()) return;
    evento.preventDefault();
    router.back();
  };

  return (
    /* ⚠️ **O `fixed` está num invólucro e não no link**, e não é arrumação. A
       `.alvo-toque` declara `position: relative` fora de camada, e fora de
       camada ganha a qualquer utilitário (armadilha 6): com as duas classes no
       mesmo elemento, o `fixed` perdia em silêncio e o botão ficava no fluxo,
       no fim da página. */
    <div className="fixed bottom-5 left-5 z-40 print:hidden">
      <Link
        href={para}
        onClick={voltar}
        aria-label={t("voltarAtras")}
        title={t("voltarAtras")}
        /* 48 px, como o carrinho do outro canto: dois botões redondos do
           mesmo tamanho nos dois cantos lêem-se como um par. Papel e não
           tijolo — o tijolo é a acção de encomendar, e voltar não é. */
        className="alvo-toque premivel grid size-12 place-items-center rounded-full border border-tinta/20 bg-papel text-tinta shadow-lg shadow-tinta/15 hover:bg-tinta hover:text-papel"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      </Link>
    </div>
  );
}

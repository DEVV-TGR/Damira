"use client";

import { useEffect } from "react";

/** O ar, em píxeis, entre o último título colado e o elemento com o foco. */
const FOLGA_DO_FOCO = 8;

/**
 * O que as secções minimizáveis da `/encomendas` precisam de JavaScript para
 * fazer — e é só o que o `<details>` não faz sozinho. Abrir e fechar não está
 * aqui: é nativo, funciona sem isto, com rato, teclado e toque.
 *
 * ## 1. Saltar para uma secção fechada abre-a
 *
 * O menu do cabeçalho, o índice do herói e um link partilhado
 * (`/encomendas#boxes`) levam a uma secção. Se ela estiver fechada, o salto
 * chegava a um título sem nada por baixo — e quem carregou em «Boxes» queria ver
 * as boxes, não um sítio onde elas estão escondidas.
 *
 * ⚠️ **Três caminhos, porque nenhum os apanha a todos.** O `hashchange` não
 * dispara quando o hash já é o mesmo (fechar as boxes e voltar a carregar em
 * «Boxes») nem com o `Link` do Next, que muda o URL por `pushState`. O clique é
 * apanhado na fase de captura, **antes** do browser — ou do Next — rolar: a
 * secção abre primeiro, e o salto já encontra o conteúdo no lugar. O `hashchange`
 * fica para o botão de voltar atrás e para o URL escrito à mão.
 *
 * ## 2. Fechar a meio da secção não deixa a pessoa noutro sítio
 *
 * O título fica fixo enquanto se rola (#85), por isso fecha-se muitas vezes a
 * meio da secção. Ao fechar, o conteúdo desaparece de cima do ecrã e a página
 * sobe-lhe o comprimento: sem correcção, o título ia parar ecrãs acima e a
 * pessoa ficava a olhar para a secção seguinte sem perceber como lá chegou.
 * Aqui volta-se a pôr o título onde estava — no topo, colado.
 *
 * ## 3. A altura do título de cada secção
 *
 * As categorias da carta por encomenda colam-se **por baixo** do título da
 * secção, e esse título parte em duas linhas num telemóvel e não num monitor (e
 * em inglês, noutros sítios). Medido aqui, o `top` delas é sempre certo; o valor
 * de recurso do `globals.css` é para sem JavaScript.
 *
 * ## 4. O foco do teclado nunca fica por baixo dos títulos fixos
 *
 * WCAG 2.4.11. O `scroll-margin-top` do `globals.css` põe o cartão no sítio
 * certo quando o browser rola — mas o browser só rola quando acha que o cartão
 * está fora de vista, e para essa conta só desconta o `scroll-padding-top` do
 * documento (8 rem). Um cartão a 9 rem do topo está «à vista» para ele e por
 * baixo do título da categoria para quem olha: com `Shift+Tab`, a subir pela
 * grelha, era quase sempre assim. Aqui mede-se o que está colado por cima do
 * elemento com o foco e rola-se a diferença.
 */
export function SeccoesMinimizaveis() {
  useEffect(() => {
    /** Abre o que esconder o alvo do hash. Diz se abriu alguma coisa. */
    const abrirAlvo = (hash: string): boolean => {
      if (hash.length < 2) return false;
      let alvo: HTMLElement | null;
      try {
        alvo = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        // Um `%` solto no hash atira `URIError`; um link estragado não é razão
        // para rebentar a página.
        return false;
      }
      if (!alvo) return false;

      const fechados: HTMLDetailsElement[] = [];
      // A secção a que se salta tem o `<details>` lá dentro: o `id` está na
      // `<section>`, para o salto aterrar na cor dela e não no título.
      const proprio = alvo.querySelector(":scope > details");
      if (proprio instanceof HTMLDetailsElement && !proprio.open) fechados.push(proprio);
      // E um alvo dentro de uma secção fechada precisa de todas as de fora.
      for (
        let fora = alvo.parentElement?.closest("details");
        fora;
        fora = fora.parentElement?.closest("details")
      ) {
        if (!fora.open) fechados.push(fora);
      }

      for (const detalhes of fechados) detalhes.open = true;
      return fechados.length > 0;
    };

    const aoClicar = (evento: MouseEvent) => {
      // Abrir num separador novo não mexe nesta página.
      if (
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      ) {
        return;
      }
      const ligacao =
        evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (
        ligacao instanceof HTMLAnchorElement &&
        ligacao.hash &&
        ligacao.pathname === window.location.pathname
      ) {
        abrirAlvo(ligacao.hash);
      }
    };

    const aoMudarHash = () => {
      // Aqui o browser já rolou — para um sítio escondido, se havia o que
      // abrir. Abre-se e rola-se outra vez.
      if (abrirAlvo(window.location.hash)) {
        document
          .getElementById(decodeURIComponent(window.location.hash.slice(1)))
          ?.scrollIntoView({ block: "start" });
      }
    };

    const aoAlternar = (evento: Event) => {
      const detalhes = evento.target;
      if (!(detalhes instanceof HTMLDetailsElement) || detalhes.open) return;
      const sumario = detalhes.querySelector(":scope > summary");
      if (!sumario) return;
      // O `top` do título fixo é onde ele estava colado. Se o princípio da
      // secção ficou acima disso, fechou-se a meio dela: volta-se a pôr lá.
      const colado = parseFloat(getComputedStyle(sumario).top);
      if (Number.isNaN(colado)) return;
      const desvio = detalhes.getBoundingClientRect().top - colado;
      if (desvio < 0) window.scrollBy({ top: desvio, behavior: "instant" });
    };

    /* A da categoria também, para o foco do teclado não ficar por baixo dela
       (ver «O foco do teclado nunca fica por baixo dos títulos fixos», no
       `globals.css`). */
    const medidor = new ResizeObserver((entradas) => {
      for (const entrada of entradas) {
        const sumario = entrada.target as HTMLElement;
        const detalhes = sumario.parentElement;
        detalhes?.style.setProperty(
          detalhes.hasAttribute("data-seccao") ? "--altura-titulo-seccao" : "--altura-titulo-categoria",
          `${sumario.getBoundingClientRect().height}px`,
        );
      }
    });
    for (const sumario of document.querySelectorAll(
      "details[data-seccao] > summary, details[data-categoria] > summary",
    )) {
      medidor.observe(sumario);
    }

    const aoFocar = (evento: FocusEvent) => {
      const alvo = evento.target;
      // Só o teclado: um clique num cartão à vista não tem nada que o tape.
      if (!(alvo instanceof HTMLElement) || alvo.matches("summary") || !alvo.matches(":focus-visible")) {
        return;
      }
      const seccao = alvo.closest("details[data-seccao]");
      if (!seccao) return;
      /* Depois da rolagem do próprio browser, e antes de se pintar: corrige-se
         só o que ele deixou por baixo. */
      requestAnimationFrame(() => {
        /* ⚠️ **As alturas dos títulos, e não onde eles estão agora.** Com o
           elemento acima do ecrã, o título da categoria ainda não está colado:
           medir-lhe a posição dava uma correção curta, e depois de rolar ele
           colava-se por cima do elemento que se queria mostrar. */
        const sumarios = [
          seccao.querySelector(":scope > summary"),
          alvo.closest("details[data-categoria]")?.querySelector(":scope > summary"),
        ];
        let tapa = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        for (const sumario of sumarios) tapa += sumario?.getBoundingClientRect().height ?? 0;
        const falta = tapa + FOLGA_DO_FOCO - alvo.getBoundingClientRect().top;
        if (falta > 0) window.scrollBy({ top: -falta, behavior: "instant" });
      });
    };

    // O `toggle` não sobe pela árvore; na fase de captura chega na mesma.
    document.addEventListener("toggle", aoAlternar, true);
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("focusin", aoFocar);
    window.addEventListener("hashchange", aoMudarHash);
    // Com o JavaScript ainda a chegar, o browser já tentou o salto do URL.
    aoMudarHash();

    return () => {
      medidor.disconnect();
      document.removeEventListener("toggle", aoAlternar, true);
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("focusin", aoFocar);
      window.removeEventListener("hashchange", aoMudarHash);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SECCOES_ENCOMENDAS } from "@/lib/vista";

/**
 * As secções da `/encomendas`, da mesma lista que a página usa para os `id`
 * (`SECCOES_ENCOMENDAS`). O «como encomendar» fica de fora: não é uma família de
 * produtos, é o fim do caminho, e o pedido da casa (#82) foi pelas quatro
 * famílias.
 */
const SECCOES = SECCOES_ENCOMENDAS.filter((seccao) => seccao !== "pedido");

/**
 * # O «Encomendas» do cabeçalho, que abre as secções
 *
 * Pedido da casa a 12/10 (#82): a página das encomendas é longa, e quem vem
 * buscar uma box tinha de entrar no topo e descer pelos kits de festa todos.
 *
 * ## ⚠️ Um *disclosure* e não um `role="menu"`
 *
 * É navegação — links para sítios —, e o padrão de menu do ARIA é o das
 * aplicações (setas obrigatórias, `Tab` a sair de uma vez, `menuitem` em vez de
 * link). Um botão com `aria-expanded` e uma lista de links por baixo é o que os
 * leitores de ecrã anunciam bem num site, e o `Tab` percorre as entradas como
 * percorre o resto da página. As setas ficam como extra, não como condição.
 *
 * ## ⚠️ Não é o «Encomendas» flutuante
 *
 * O do canto de baixo (`BotaoEncomendar`) troca de lugar com o carrinho (ver
 * `Cesto.tsx`, armadilha 17). Este vive no cabeçalho, nos dois estados, e abre
 * para baixo da barra: nunca chega perto daquele canto.
 *
 * ## ⚠️ No telemóvel não acrescenta nada à barra
 *
 * Armadilhas 15 e 21: a 320 px a barra não tem folga. Abaixo do `sm` o botão
 * tem exactamente a largura do link que substituiu — mesma palavra, mesmo
 * `py-3.5`, sem seta — e o painel abre a toda a largura por baixo do cabeçalho.
 * A seta só aparece a partir do `sm`, onde há espaço.
 */
export function MenuEncomendas({ actual }: { actual: boolean }) {
  const t = useTranslations("nav");
  const ti = useTranslations("encomendas.indice");
  const caminho = usePathname();
  /* ⚠️ **Guarda-se a página onde se abriu, e não um booleano.** Mudar de página
     — pelo «voltar» do browser, por um link de fora do menu — tem de o fechar,
     e um efeito a pôr o estado a `false` a cada mudança de caminho é um
     desenho a mais por navegação. Assim, aberto noutra página é fechado, sem
     código nenhum a fazê-lo. */
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const idPainel = useId();

  /* `pointerdown` e não `click`: fecha no instante em que o dedo toca fora, e
     não depois de o browser decidir que aquilo foi um clique — num telemóvel,
     quem começa a rolar a página com o menu aberto espera vê-lo fechar.

     O `Esc` escuta-se no documento e não só dentro do menu: no Safari um botão
     clicado com o rato **não recebe foco**, e quem abria assim e carregava em
     `Esc` ficava com o menu aberto, porque a tecla nunca lhe chegava.

     Os dois só se escutam com o menu aberto, para não haver ouvintes globais
     em todas as páginas por nada. */
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAbertoEm(null);
    };
    const esc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbertoEm(null);
      /* O foco volta ao botão só se estava no menu ou em lado nenhum: tirá-lo
         de um campo onde a pessoa está a escrever era pior do que deixá-lo. */
      const activo = document.activeElement;
      if (!activo || activo === document.body || raiz.current?.contains(activo)) {
        botao.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const links = () =>
    Array.from(lista.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  /* As setas: um extra para quem usa teclado, porque o `Tab` já percorre as
     entradas. O `Esc` está no efeito de cima. */
  const teclas = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;

    /* Seta para baixo no botão abre e entra na lista — é o gesto que quem usa
       teclado tenta primeiro num botão com seta. O foco só se move depois de o
       painel deixar de estar `hidden`, por isso vai num `requestAnimationFrame`. */
    if (evento.target === botao.current) {
      if (evento.key !== "ArrowDown") return;
      evento.preventDefault();
      setAbertoEm(caminho);
      requestAnimationFrame(() => links()[0]?.focus());
      return;
    }

    const todos = links();
    const i = todos.indexOf(document.activeElement as HTMLAnchorElement);
    if (i === -1) return;
    evento.preventDefault();
    const proximo = evento.key === "ArrowDown" ? i + 1 : i - 1;
    todos[(proximo + todos.length) % todos.length]?.focus();
  };

  return (
    /* ⚠️ **Sem `relative` abaixo do `sm`, de propósito.** Assim o painel
       posiciona-se em relação ao `<header>` (que é `sticky`, logo posicionado) e
       abre a toda a largura por baixo da barra. Um painel ancorado ao botão, a
       320 px, saía pela direita do ecrã e dava rolagem horizontal à página —
       um elemento `absolute` fora do ecrã conta para a largura do documento. */
    <div
      ref={raiz}
      onKeyDown={teclas}
      /* Sair do menu com o `Tab` fecha-o: um painel aberto atrás do foco tapa
         o conteúdo para onde a pessoa já seguiu.

         ⚠️ **Só quando o foco vai para outro elemento**, e não quando vai para
         lado nenhum (`relatedTarget` nulo). No Safari um link clicado com o
         rato não recebe foco: o botão perdia-o para o `<body>` no `mousedown`,
         o painel fechava, e o `click` chegava a um link que já não estava lá —
         a entrada não levava a sítio nenhum. Os cliques fora já os fecha o
         `pointerdown`. */
      onBlur={(evento) => {
        const destino = evento.relatedTarget;
        if (aberto && destino && !raiz.current?.contains(destino)) {
          setAbertoEm(null);
        }
      }}
      className="sm:relative"
    >
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        /* O link antigo dizia que esta era a página atual, e o `aria-current` é
           a metade disso que um leitor de ecrã ouve. ⚠️ Sem JavaScript o botão
           não abre nada: aceita-se, porque o cesto e a compra também precisam
           dele, e a página das encomendas continua a um link do rodapé. */
        aria-current={actual ? "page" : undefined}
        onClick={() => setAbertoEm(aberto ? null : caminho)}
        /* `py-3.5` como o link da ementa ao lado: 45 px de alvo dentro da barra
           de altura fixa, sem mexer num píxel do desenho. */
        className={`flex items-center gap-1.5 py-3.5 font-semibold uppercase ${
          actual || aberto
            ? "text-tijolo"
            : "hover:text-tijolo"
        } ${actual ? "underline decoration-tijolo decoration-2 underline-offset-[6px]" : ""}`}
      >
        {t("encomendas")}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`hidden size-2.5 transition-transform duration-200 sm:block ${
            aberto ? "rotate-180" : ""
          }`}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      {/* `hidden` e não renderização condicional: o `aria-controls` aponta
          para um elemento que tem de existir mesmo fechado. ⚠️ Nenhuma classe de
          `display` neste elemento — o `[hidden]` do Tailwind tem `!important`,
          mas a regra de não as misturar poupa a dúvida a quem vier depois. */}
      <div
        id={idPainel}
        hidden={!aberto}
        className="absolute inset-x-0 top-full border-b border-tinta/15 bg-papel shadow-lg shadow-tinta/10 sm:left-auto sm:right-0 sm:mt-2 sm:w-64 sm:rounded-2xl sm:border"
      >
        {/* ⚠️ **Sem `.envolvente` aqui**, apesar de ser a medida da página: é
            uma classe fora de camada e ganhava ao `sm:px-2` (armadilhas 6 e
            14), e o painel de 256 px do computador ficava com 40 px de margem
            de cada lado. O `clamp` é o mesmo da `.envolvente`, menos o `px-3`
            de cada entrada — o texto alinha com o logótipo, no telemóvel. */}
        <ul
          ref={lista}
          className="px-[calc(clamp(1.25rem,4vw,2.5rem)-0.75rem)] py-2 font-normal normal-case tracking-normal sm:px-2"
        >
          <li>
            <Link
              href="/encomendas"
              onClick={() => setAbertoEm(null)}
              aria-current={caminho === "/encomendas" ? "page" : undefined}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-papel-fundo hover:text-tijolo"
            >
              {t("todasEncomendas")}
            </Link>
          </li>
          {SECCOES.map((seccao) => (
            <li key={seccao}>
              <Link
                href={{ pathname: "/encomendas", hash: seccao }}
                onClick={() => setAbertoEm(null)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-papel-fundo hover:text-tijolo"
              >
                {ti(seccao)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

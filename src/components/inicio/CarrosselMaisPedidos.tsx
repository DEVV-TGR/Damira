"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { EtiquetaPao, SeloBestSeller } from "@/components/ementa/Etiquetas";

/**
 * As quatro faces de cartão, a rodar pela posição.
 *
 * Nenhuma é o magenta chapado: um cartão magenta com uma descrição de duas
 * linhas por cima dá 4,25:1 e não passa (ver a tabela em `globals.css`). O
 * magenta entra na mesma, no selo — que é onde o tom escuro o deixa passar.
 *
 * A face escura no meio da rotação não é enfeite: quatro cartões claros
 * seguidos achatam a fila toda, e é o contraste entre eles que dá a sensação de
 * profundidade que o desfoque sozinho não dá.
 */
const FACES = [
  "bg-turquesa text-tinta",
  "bg-papel text-tinta ring-1 ring-tinta/15",
  "bg-coral text-tinta",
  "bg-tinta text-papel",
] as const;

export function CarrosselMaisPedidos({
  artigos,
  locale,
}: {
  artigos: Artigo[];
  locale: Locale;
}) {
  const t = useTranslations("inicio.bestSellers");
  const pista = useRef<HTMLUListElement>(null);
  const [ativo, setAtivo] = useState(0);

  /**
   * Escreve em cada cartão a sua distância ao centro da pista, de 0 (ao centro)
   * a 1 (na borda), numa variável CSS.
   *
   * **É uma variável só a alimentar o desfoque, a escala e a opacidade.** Fazer
   * as três em JavaScript era garantir que um dia se dessincronizavam; assim o
   * CSS deriva as três do mesmo número e não há como ficarem a discordar.
   */
  const medir = useCallback(() => {
    const lista = pista.current;
    if (!lista) return;

    /*
      Medido por `getBoundingClientRect` e não por `offsetLeft`.
      `offsetLeft` conta a partir do ancestral posicionado, e no dia em que a
      pista passou a viver numa coluna de grelha passou a arrastar consigo a
      largura do título — o "centro" saltava várias centenas de pixéis e o
      primeiro cartão aparecia desfocado em repouso. O retângulo do próprio
      elemento não depende de onde ele está na árvore.

      A `scale` dos cartões não estraga a conta: o `transform-origin` é o centro,
      portanto encolhe a caixa e deixa o centro onde estava.
    */
    const caixa = lista.getBoundingClientRect();
    const meio = caixa.left + caixa.width / 2;

    /*
      A queda do desfoque mede-se em **cartões**, não em fração da pista.
      Normalizar por meia largura fazia o vizinho imediato saltar logo para o
      máximo — o cartão ao lado do foco ficava tão ilegível como o da ponta, e
      perdia-se a profundidade que é o ponto do efeito. Com o passo entre
      cartões, o vizinho fica a meio caminho e só o segundo é que chega ao fim.
    */
    const primeiro = lista.children[0] as HTMLElement | undefined;
    const segundo = lista.children[1] as HTMLElement | undefined;
    const passo =
      primeiro && segundo
        ? Math.abs(
            segundo.getBoundingClientRect().left -
              primeiro.getBoundingClientRect().left,
          )
        : caixa.width / 2;
    const alcance = Math.max(1, passo * 1.9);

    let maisPerto = 0;
    let menorDistancia = Infinity;

    for (const [indice, filho] of [...lista.children].entries()) {
      const cartao = filho as HTMLElement;
      const retangulo = cartao.getBoundingClientRect();
      const centro = retangulo.left + retangulo.width / 2;
      const bruta = Math.abs(centro - meio);
      const distancia = Math.min(1, bruta / alcance);
      cartao.style.setProperty("--d", distancia.toFixed(3));

      if (bruta < menorDistancia) {
        menorDistancia = bruta;
        maisPerto = indice;
      }
    }

    setAtivo(maisPerto);
  }, []);

  useEffect(() => {
    const lista = pista.current;
    if (!lista) return;

    let pedido = 0;
    const aoRolar = () => {
      /* Um `scroll` dispara dezenas de vezes por segundo; sem isto media-se o
         mesmo estado várias vezes no mesmo quadro, para nada. */
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        medir();
      });
    };

    medir();
    lista.addEventListener("scroll", aoRolar, { passive: true });
    /* A largura da pista entra no cálculo — rodar o telemóvel tem de remedir. */
    const observador = new ResizeObserver(aoRolar);
    observador.observe(lista);

    return () => {
      lista.removeEventListener("scroll", aoRolar);
      observador.disconnect();
      cancelAnimationFrame(pedido);
    };
  }, [medir]);

  const deslizar = (sentido: 1 | -1) => {
    const lista = pista.current;
    if (!lista) return;
    const cartao = lista.children[0] as HTMLElement | undefined;
    if (!cartao) return;
    /* Um cartão de cada vez, mais a goteira. O `scroll-snap` acerta o resto. */
    const passo = cartao.offsetWidth + 24;
    lista.scrollBy({ left: sentido * passo, behavior: "smooth" });
  };

  return (
    /*
      Duas colunas em ecrã largo, e não título por cima da pista.
      **É a correção de um vazio, não um capricho de composição.** Para o
      primeiro cartão poder chegar ao centro, a pista precisa de meia largura de
      espaço à esquerda — e com o título por cima isso deixava um retângulo
      branco de meio ecrã ao lado do primeiro cartão, que lia como página
      partida. Com o título nesse espaço, o mesmo vão passa a ser respiração
      entre dois blocos de conteúdo.
    */
    <div className="envolvente lg:grid lg:grid-cols-[26rem_1fr] lg:items-center lg:gap-12">
      <div>
        <p className="olho">{t("olho")}</p>
        <h2 className="titulo-display mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[42ch] text-tinta-suave">{t("texto")}</p>

        <div className="mt-8 flex gap-2">
          <BotaoDeslizar rotulo={t("anterior")} aoClicar={() => deslizar(-1)} sentido="anterior" />
          <BotaoDeslizar rotulo={t("seguinte")} aoClicar={() => deslizar(1)} sentido="seguinte" />
        </div>
      </div>

      {/*
        `tabIndex` e `role="group"` porque uma pista com scroll tem de ser
        alcançável por teclado — com foco, as setas do teclado rolam-na de
        origem, sem uma linha de JavaScript.
      */}
      <ul
        ref={pista}
        role="group"
        aria-label={t("titulo")}
        tabIndex={0}
        className="carrossel mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto py-10 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magenta-forte lg:mt-0"
      >
        {artigos.map((artigo, indice) => (
          <Cartao
            key={artigo.id}
            artigo={artigo}
            indice={indice}
            face={FACES[indice % FACES.length]}
            locale={locale}
          />
        ))}
      </ul>

      {/* Sem isto, quem navega por teclado ou com leitor de ecrã desliza a pista
          e nada lhe diz onde ficou. */}
      <p aria-live="polite" className="sr-only">
        {artigos[ativo]?.nome}
      </p>
    </div>
  );
}

function BotaoDeslizar({
  rotulo,
  aoClicar,
  sentido,
}: {
  rotulo: string;
  aoClicar: () => void;
  sentido: "anterior" | "seguinte";
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      className="grid size-12 place-items-center rounded-full border border-tinta/25 transition-colors hover:bg-tinta hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta-forte"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path
          d={sentido === "anterior" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Cartao({
  artigo,
  indice,
  face,
  locale,
}: {
  artigo: Artigo;
  indice: number;
  face: string;
  locale: Locale;
}) {
  return (
    <li
      className={`cartao-carrossel relative flex snap-center flex-col justify-between overflow-hidden rounded-2xl p-7 ${face}`}
    >
      {/*
        O hambúrguer desenhado do impresso, quase apagado. É o mesmo PNG de alfa
        usado como máscara, tingido pela cor do texto do cartão — ver `.traco`
        em `globals.css`.
      */}
      <span
        aria-hidden
        className="traco pointer-events-none absolute -right-10 -top-8 size-48 opacity-[0.07]"
        style={{
          maskImage: "url(/tracos/hamburguer.png)",
          WebkitMaskImage: "url(/tracos/hamburguer.png)",
        }}
      />

      {artigo.foto && (
        /* Hoje nenhum artigo tem `foto` e todos os cartões saem tipográficos.
           No dia em que o cliente mandar fotografia por prato, basta preencher o
           campo em `ementa.json` — o cartão passa a fotográfico sem tocar aqui. */
        <Image
          src={artigo.foto}
          alt=""
          fill
          className="absolute inset-0 -z-10 object-cover"
          sizes="(max-width: 640px) 80vw, 22rem"
        />
      )}

      <div className="relative">
        <span className="titulo-display text-sm opacity-50">
          {String(indice + 1).padStart(2, "0")}
        </span>
        <h3 className="titulo-display mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)]">
          {artigo.nome}
        </h3>
        {artigo.descricao && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed opacity-80">
            {artigo.descricao[locale]}
          </p>
        )}
      </div>

      <div className="relative mt-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeloBestSeller />
          {artigo.paes.map((pao) => (
            <EtiquetaPao key={pao} pao={pao} />
          ))}
        </div>
        <p className="titulo-display mt-4 text-3xl tabular-nums">
          {formatarPreco(artigo.preco, locale)}
        </p>
      </div>
    </li>
  );
}

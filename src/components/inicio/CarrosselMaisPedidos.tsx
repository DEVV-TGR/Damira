"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { fotoDoArtigo } from "@/lib/fotos-ilustrativas";
import { EtiquetaPao, SeloBestSeller } from "@/components/ementa/Etiquetas";

/** Píxeis por segundo. Devagar: é para ser notado de canto de olho, não seguido. */
const VELOCIDADE = 24;

export function CarrosselMaisPedidos({
  artigos,
  locale,
}: {
  artigos: Artigo[];
  locale: Locale;
}) {
  const t = useTranslations("inicio.bestSellers");
  const pista = useRef<HTMLUListElement>(null);
  const pausado = useRef(false);
  /**
   * A posição em vírgula flutuante, mantida à parte do DOM.
   *
   * ⚠️ **Não somar ao `lista.scrollLeft` e voltar a escrevê-lo.** A 60 quadros
   * por segundo cada passo vale menos de meio píxel, e o browser arredonda o
   * `scrollLeft` a inteiro: escrever `0.4` lê-se de volta como `0`, o passo
   * seguinte volta a somar a zero e **a pista fica parada para sempre**. Só
   * arrancava se alguém a empurrasse primeiro — que foi exactamente como o bug
   * quase passou despercebido.
   */
  const posicao = useRef(0);

  /**
   * Escreve em cada cartão a sua distância ao centro da pista, de 0 (ao centro)
   * a 1, numa variável CSS. **Uma variável só a alimentar o desfoque, a escala e
   * a opacidade** — o CSS deriva as três do mesmo número e não há como ficarem a
   * discordar.
   *
   * Medido por `getBoundingClientRect` e não por `offsetLeft`: aquele conta a
   * partir do ancestral posicionado e, quando a pista passou a viver numa coluna
   * de grelha, arrastou consigo a largura do título — o "centro" saltava
   * centenas de píxeis e o primeiro cartão nascia desfocado.
   */
  const medir = useCallback(() => {
    const lista = pista.current;
    if (!lista) return;

    const caixa = lista.getBoundingClientRect();
    const meio = caixa.left + caixa.width / 2;

    /* A queda mede-se em cartões, não em fração da pista: normalizar por meia
       largura fazia o vizinho imediato saltar logo para o desfoque máximo e
       perdia-se a profundidade, que é o ponto do efeito. */
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

    for (const filho of lista.children) {
      const cartao = filho as HTMLElement;
      const r = cartao.getBoundingClientRect();
      const distancia = Math.min(
        1,
        Math.abs(r.left + r.width / 2 - meio) / alcance,
      );
      cartao.style.setProperty("--d", distancia.toFixed(3));
    }
  }, []);

  /* Medir sempre que a pista se mexe, por qualquer motivo — dedo, roda, teclado
     ou o avanço automático. */
  useEffect(() => {
    const lista = pista.current;
    if (!lista) return;

    let quadro = 0;
    const aoRolar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        medir();
      });
    };

    medir();
    lista.addEventListener("scroll", aoRolar, { passive: true });
    const observador = new ResizeObserver(aoRolar);
    observador.observe(lista);

    return () => {
      lista.removeEventListener("scroll", aoRolar);
      observador.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [medir]);

  /**
   * O avanço automático, e sem fim.
   *
   * ## Porque não é a técnica da faixa "Da nossa cozinha"
   *
   * Aquela é um `transform` em CSS. É perfeito para uma tira decorativa e
   * péssimo para esta: com um `transform` a mexer o conteúdo, **deixava de se
   * poder arrastar com o dedo** — e num telemóvel arrastar é a única forma de ver
   * os doze.
   *
   * Aqui o avanço é feito a somar ao `scrollLeft`. A pista continua a ser um
   * contentor com scroll de verdade: dedo, roda do rato e setas do teclado
   * funcionam como sempre, e o efeito é o mesmo.
   *
   * O ciclo fecha porque os cartões estão **duplicados**: quando o scroll passa
   * a distância de uma série, subtrai-se essa distância. O salto cai exactamente
   * sobre um cartão igual ao que estava no lugar, e não se vê.
   *
   * ⚠️ **A distância mede-se entre o primeiro cartão e o primeiro da cópia**, e
   * não por `scrollWidth / 2`: o `scrollWidth` inclui o preenchimento lateral
   * que centra o primeiro cartão, e metade dele não é uma série.
   */
  useEffect(() => {
    const lista = pista.current;
    if (!lista) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let quadro = 0;
    let anterior = 0;

    const passo = (agora: number) => {
      const delta = anterior ? (agora - anterior) / 1000 : 0;
      anterior = agora;

      /* Se alguém mexeu na pista por fora — dedo, roda, setas, âncora — o DOM
         é a verdade e o acumulador vai atrás dele. */
      if (Math.abs(lista.scrollLeft - posicao.current) > 2) {
        posicao.current = lista.scrollLeft;
      }

      if (!pausado.current && delta > 0) {
        const a = lista.children[0] as HTMLElement | undefined;
        const b = lista.children[artigos.length] as HTMLElement | undefined;
        const ciclo =
          a && b
            ? b.getBoundingClientRect().left - a.getBoundingClientRect().left
            : 0;

        posicao.current += VELOCIDADE * delta;
        if (ciclo > 0 && posicao.current >= ciclo) posicao.current -= ciclo;
        lista.scrollLeft = posicao.current;
      }

      quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);

    /* Não gastar bateria a animar o que ninguém está a ver. */
    const aoMudarVisibilidade = () => {
      pausado.current = document.hidden;
      anterior = 0;
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [artigos.length]);

  const parar = () => {
    pausado.current = true;
  };
  const seguir = () => {
    pausado.current = false;
  };

  const deslizar = (sentido: 1 | -1) => {
    const lista = pista.current;
    if (!lista) return;
    const cartao = lista.children[0] as HTMLElement | undefined;
    if (!cartao) return;
    lista.scrollBy({ left: sentido * (cartao.offsetWidth + 24), behavior: "smooth" });
  };

  return (
    <div className="envolvente relative lg:grid lg:grid-cols-[26rem_1fr] lg:items-center lg:gap-12">
      <div className="relative">
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
        alcançável por teclado — com foco, as setas rolam-na de origem.

        Sem `aria-live`: com a pista a andar sozinha, anunciar o cartão ao centro
        punha o leitor de ecrã a falar sem parar. Os doze estão na lista para quem
        lê; o movimento é decoração.
      */}
      <ul
        ref={pista}
        role="group"
        aria-label={t("titulo")}
        tabIndex={0}
        onMouseEnter={parar}
        onMouseLeave={seguir}
        onFocusCapture={parar}
        onBlurCapture={seguir}
        onPointerDown={parar}
        onPointerUp={seguir}
        onPointerCancel={seguir}
        className="carrossel mt-12 flex gap-6 overflow-x-auto py-10 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magenta-forte lg:mt-0"
      >
        {/* Duas séries: a segunda é o que faz o ciclo fechar sem costura. */}
        {[...artigos, ...artigos].map((artigo, indice) => (
          <Cartao
            key={`${artigo.id}-${indice}`}
            artigo={artigo}
            numero={(indice % artigos.length) + 1}
            duplicado={indice >= artigos.length}
            locale={locale}
          />
        ))}
      </ul>
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
  numero,
  duplicado,
  locale,
}: {
  artigo: Artigo;
  numero: number;
  duplicado: boolean;
  locale: Locale;
}) {
  const t = useTranslations("ementa");
  const foto = fotoDoArtigo(artigo);

  return (
    <li
      className="cartao-carrossel relative flex flex-col justify-end overflow-hidden rounded-2xl bg-tinta text-papel"
      /* A cópia existe só para o ciclo fechar; quem usa leitor de ecrã ouve a
         lista uma vez. */
      aria-hidden={duplicado || undefined}
    >
      {foto && (
        <Image
          src={foto.src}
          /* Decorativa: **não descreve o prato**. Descrevê-la seria afirmar que a
             fotografia é daquele hambúrguer, que é exactamente o que não se sabe. */
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 80vw, 25rem"
          loading={duplicado ? "lazy" : undefined}
        />
      )}

      {/* Véu de baixo para cima: é o que dá contraste ao texto sobre fotografia. */}
      <div aria-hidden className="veu-cartao absolute inset-0" />

      {foto?.ilustrativa && (
        <p className="absolute right-3 top-3 rounded-full bg-tinta/70 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider">
          {t("ilustrativa")}
        </p>
      )}

      <div className="relative p-7">
        <span className="titulo-display text-sm opacity-60">
          {String(numero).padStart(2, "0")}
        </span>

        <h3 className="titulo-display mt-2 text-[clamp(1.75rem,3.5vw,2.35rem)]">
          {artigo.nome}
        </h3>

        {artigo.descricao && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-papel/80">
            {artigo.descricao[locale]}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
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

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type Ampliavel = { src: string; alt: string; largura: number; altura: number };

/**
 * A fotografia em grande. **Foto, duas setas, um X.** Mais nada.
 *
 * ## O que saiu, e porquê
 *
 * A primeira versão tinha legenda e contador por baixo da fotografia, e o
 * cliente viu-a «toda desformatada»: no telemóvel a legenda empurrava a imagem
 * para cima, a imagem encolhia para caber, e o conjunto lia-se como um cartão
 * mal alinhado. Uma fotografia em grande não precisa de dizer o que é — a
 * pessoa acabou de a ver com legenda na grelha.
 *
 * ## O fundo não rola — e no iPhone isso obriga a prender o `body`
 *
 * ⚠️ **`overflow: hidden` no `body` não trava o dedo no Safari do iOS.** A
 * primeira versão fazia só isso e o cliente continuava a rolar a página por
 * trás da fotografia. O que o iOS respeita é `position: fixed` no `body`:
 * enquanto a fotografia está aberta, o `body` fica preso com `top` negativo
 * igual à posição de rolagem, para a página não saltar para o topo; ao fechar,
 * solta-se e repõe-se a posição. É feio, é o que há, e é o que toda a gente
 * faz.
 *
 * ## Fecha-se com o X, com Escape, ou tocando fora da fotografia
 *
 * O `<dialog>` é o próprio fundo escuro. Um toque cujo alvo não é a imagem
 * nem um botão é um toque no fundo, e fecha. É o gesto que toda a gente já faz
 * em todas as aplicações de fotografias.
 */
export function Ampliar({
  itens,
  indice,
  aoFechar,
  aoMudar,
}: {
  itens: Ampliavel[];
  indice: number | null;
  aoFechar: () => void;
  aoMudar: (indice: number) => void;
}) {
  const t = useTranslations("cartaz.vitrine");
  const ref = useRef<HTMLDialogElement>(null);
  const aberto = indice !== null;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (indice !== null && !dialogo.open) dialogo.showModal();
    if (indice === null && dialogo.open) dialogo.close();
  }, [indice]);

  /* O bloqueio da rolagem, à maneira que o iOS respeita. */
  useEffect(() => {
    if (!aberto) return;
    const y = window.scrollY;
    const { style } = document.body;
    const anterior = { position: style.position, top: style.top, width: style.width };
    style.position = "fixed";
    style.top = `-${y}px`;
    style.width = "100%";
    return () => {
      style.position = anterior.position;
      style.top = anterior.top;
      style.width = anterior.width;
      /* «instant» e não suave: com `scroll-behavior: smooth` no `html`, o
         regresso à posição anda durante meio segundo e a página parece
         escorregar depois de a fotografia fechar. */
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }, [aberto]);

  useEffect(() => {
    if (indice === null) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") aoMudar((indice + 1) % itens.length);
      if (e.key === "ArrowLeft") aoMudar((indice - 1 + itens.length) % itens.length);
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [indice, itens.length, aoMudar]);

  const anterior = () => indice !== null && aoMudar((indice - 1 + itens.length) % itens.length);
  const seguinte = () => indice !== null && aoMudar((indice + 1) % itens.length);

  return (
    <dialog
      ref={ref}
      className="ampliar"
      onClose={aoFechar}
      onClick={(e) => {
        const alvo = e.target as HTMLElement;
        if (!alvo.closest("img, button")) aoFechar();
      }}
    >
      {indice !== null && (
        <Image
          key={itens[indice].src}
          className="ampliar__foto"
          src={itens[indice].src}
          alt={itens[indice].alt}
          width={itens[indice].largura}
          height={itens[indice].altura}
          sizes="100vw"
          priority
        />
      )}

      {itens.length > 1 && (
        <>
          <button type="button" className="ampliar__seta ampliar__seta--esq" aria-label={t("anterior")} onClick={anterior}>
            <Icone d="M15 5 8 12l7 7" />
          </button>
          <button type="button" className="ampliar__seta ampliar__seta--dir" aria-label={t("seguinte")} onClick={seguinte}>
            <Icone d="m9 5 7 7-7 7" />
          </button>
        </>
      )}

      <button type="button" className="ampliar__fechar" aria-label={t("fechar")} onClick={aoFechar}>
        <Icone d="M6 6l12 12M18 6 6 18" />
      </button>
    </dialog>
  );
}

/* ⚠️ SVG e não os glifos `‹ › ×`: no iPhone cada fonte os desenha a uma altura
   diferente e os botões saíam com o sinal fora do centro. Um traço de SVG é
   igual em todo o lado. */
function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

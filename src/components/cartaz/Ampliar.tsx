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
 * ## O fundo não rola
 *
 * O `showModal()` torna o resto da página inerte, mas em alguns browsers a
 * roda do rato e o dedo continuam a rolar o documento por trás. O
 * `body:has(dialog[open])` no CSS trava-o: enquanto a fotografia está aberta,
 * o que está por trás não se mexe.
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

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (indice !== null && !dialogo.open) dialogo.showModal();
    if (indice === null && dialogo.open) dialogo.close();
  }, [indice]);

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
          <button type="button" className="ampliar__seta ampliar__seta--esq" aria-label={t("anterior")} onClick={anterior}>‹</button>
          <button type="button" className="ampliar__seta ampliar__seta--dir" aria-label={t("seguinte")} onClick={seguinte}>›</button>
        </>
      )}

      <button type="button" className="ampliar__fechar" aria-label={t("fechar")} onClick={aoFechar}>×</button>
    </dialog>
  );
}

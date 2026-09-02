"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type Ampliavel = { src: string; alt: string; largura: number; altura: number };

/**
 * A fotografia em grande, num `<dialog>`.
 *
 * ## Porque `<dialog>` e não um `<div>` fixo
 *
 * O `showModal()` traz de graça o que um lightbox à mão demora uma tarde a
 * acertar e nunca acerta de todo: o foco fica preso lá dentro, o Escape fecha,
 * o resto da página deixa de ser alcançável por leitor de ecrã, e ao fechar o
 * foco volta ao botão que abriu. É por isso que não há aqui gestão de foco
 * nenhuma — é o browser a fazê-la.
 *
 * ## As setas
 *
 * Esquerda e direita mudam de fotografia; no telemóvel os dois botões estão nas
 * bermas e têm 44 px. O contador diz onde se está, porque catorze fotografias
 * sem contador são um ciclo de que não se sabe o fim.
 */
export function Ampliar({
  itens,
  indice,
  aoFechar,
  aoMudar,
}: {
  itens: Ampliavel[];
  /** `null` fechado. */
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
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  useEffect(() => {
    /* `indice === null` e não `!aberto`: o TypeScript não estreita `indice` a
       partir de um booleano derivado dele, e o `+ 1` lá em baixo ficava a
       somar a `number | null`. */
    if (indice === null) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") aoMudar((indice + 1) % itens.length);
      if (e.key === "ArrowLeft") aoMudar((indice - 1 + itens.length) % itens.length);
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [indice, itens.length, aoMudar]);

  return (
    <dialog
      ref={ref}
      className="ampliar"
      onClose={aoFechar}
      /* Carregar no fundo escuro fecha. O `<dialog>` é o próprio fundo, portanto
         um clique cujo alvo é o dialog e não um filho é um clique fora da
         fotografia. */
      onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      {indice !== null && (
        <figure className="ampliar__figura">
          <Image
            key={itens[indice].src}
            src={itens[indice].src}
            alt={itens[indice].alt}
            width={itens[indice].largura}
            height={itens[indice].altura}
            sizes="100vw"
            priority
          />
          <figcaption>
            <span>{itens[indice].alt}</span>
            <span className="ampliar__contador">
              {t("contador", { n: indice + 1, total: itens.length })}
            </span>
          </figcaption>
        </figure>
      )}

      {itens.length > 1 && (
        <>
          <button
            type="button"
            className="ampliar__seta ampliar__seta--esq"
            aria-label={t("anterior")}
            onClick={() => indice !== null && aoMudar((indice - 1 + itens.length) % itens.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="ampliar__seta ampliar__seta--dir"
            aria-label={t("seguinte")}
            onClick={() => indice !== null && aoMudar((indice + 1) % itens.length)}
          >
            ›
          </button>
        </>
      )}

      <button type="button" className="ampliar__fechar" aria-label={t("fechar")} onClick={aoFechar}>
        ×
      </button>
    </dialog>
  );
}

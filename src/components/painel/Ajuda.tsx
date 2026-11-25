"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * # O «?» ao lado de um parâmetro
 *
 * A explicação de um campo, curta e com um exemplo, para a ficha não ser um
 * texto corrido. O que é indispensável para não errar fica **à vista**, fora
 * daqui: a ajuda complementa, não esconde.
 *
 * Abre com clique, toque ou teclado (é um botão), e fecha com Escape, com um
 * toque fora ou com outro toque no «?». Nunca depende de passar o rato: num
 * tablet não há rato.
 *
 * ⚠️ **Vai num portal, em `position: fixed`.** Dentro da ficha ficava cortada
 * pelo `overflow` de quem a contém e por baixo do rodapé fixo; e a posição
 * calcula-se a partir do botão e prende-se aos limites do ecrã — a 320 px um
 * balão de 18 rem centrado no «?» saía pela direita.
 */
export function Ajuda({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number; largura: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const balao = useRef<HTMLDivElement>(null);
  const id = useId();

  const colocar = useCallback(() => {
    const alvo = botao.current?.getBoundingClientRect();
    if (!alvo) return;
    const margem = 12;
    const largura = Math.min(288, window.innerWidth - margem * 2);
    const left = Math.min(Math.max(alvo.left + alvo.width / 2 - largura / 2, margem), window.innerWidth - largura - margem);
    const altura = balao.current?.offsetHeight ?? 0;
    /* Por baixo do «?», a não ser que não caiba — aí por cima. */
    const top = alvo.bottom + 8 + altura > window.innerHeight - margem ? Math.max(margem, alvo.top - 8 - altura) : alvo.bottom + 8;
    setPosicao({ top, left, largura });
  }, []);

  /* Duas medições: a primeira põe o balão no sítio para se saber a altura dele;
     a segunda decide se vai por cima ou por baixo. */
  useLayoutEffect(() => {
    if (!aberta) return;
    colocar();
    const segunda = requestAnimationFrame(colocar);
    return () => cancelAnimationFrame(segunda);
  }, [aberta, colocar]);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* Só fecha a ajuda, e não a janela de baixo, se houver uma. */
      e.stopPropagation();
      setAberta(false);
      botao.current?.focus();
    };
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!botao.current?.contains(alvo) && !balao.current?.contains(alvo)) setAberta(false);
    };
    document.addEventListener("keydown", tecla, true);
    document.addEventListener("pointerdown", fora);
    window.addEventListener("resize", colocar);
    window.addEventListener("scroll", colocar, true);
    return () => {
      document.removeEventListener("keydown", tecla, true);
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("resize", colocar);
      window.removeEventListener("scroll", colocar, true);
    };
  }, [aberta, colocar]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={`Ajuda: ${titulo}`}
        aria-expanded={aberta}
        aria-controls={aberta ? id : undefined}
        onClick={(e) => {
          /* Dentro de um `<label>`, o clique não pode ir parar ao campo. */
          e.preventDefault();
          e.stopPropagation();
          setAberta((a) => !a);
        }}
        className={`alvo-toque relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border align-middle text-[0.7rem] font-bold leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo ${
          aberta ? "border-tijolo bg-tijolo/10 text-tijolo" : "border-tinta/30 text-tinta-suave"
        }`}
      >
        ?
      </button>
      {aberta &&
        createPortal(
          <div
            ref={balao}
            id={id}
            role="note"
            aria-label={titulo}
            style={{ top: posicao?.top ?? -9999, left: posicao?.left ?? 0, width: posicao?.largura }}
            className="fixed z-[70] rounded-xl border border-tinta/15 bg-papel p-4 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-tinta shadow-lg"
          >
            <p className="mb-1 text-xs font-semibold text-tijolo">{titulo}</p>
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Um rótulo de campo com o «?» ao lado — fora do `<label>`, para o toque não ir ao campo. */
export function Rotulo({
  htmlFor,
  children,
  ajuda,
  opcional = false,
}: {
  htmlFor: string;
  children: React.ReactNode;
  ajuda?: React.ReactNode;
  opcional?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold">
      <label htmlFor={htmlFor}>
        {children}
        {opcional && <span className="font-normal text-tinta-suave"> (opcional)</span>}
      </label>
      {ajuda && <Ajuda titulo={typeof children === "string" ? children : "Ajuda"}>{ajuda}</Ajuda>}
    </span>
  );
}

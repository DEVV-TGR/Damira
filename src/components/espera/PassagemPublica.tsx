"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const EVENTO_ENVIO = "damira:envio-do-pedido";
const TEMPO_VISIVEL = 600;

export function mostrarEnvioDoPedido() {
  window.dispatchEvent(new Event(EVENTO_ENVIO));
}

/** Até uma página já em memória mostra a marca. O temporizador só controla
 * a apresentação. A navegação e o envio começam logo. */
export function PassagemPublica() {
  const caminho = usePathname();
  const sinal = useRef<HTMLSpanElement>(null);
  const ultima = useRef({ destino: "", inicio: 0 });

  useLayoutEffect(() => {
    const elemento = sinal.current;
    if (!elemento) return;
    let temporizador: number;
    const destinoAtual = () => location.pathname + location.search;
    function mostrar(destino: string, renovar = false, aIniciar = false) {
      const agora = performance.now();
      if (renovar || destino !== ultima.current.destino) ultima.current = { destino, inicio: agora };
      const restante = TEMPO_VISIVEL - (agora - ultima.current.inicio);
      clearTimeout(temporizador);
      if (restante > 0) elemento?.setAttribute("data-passagem", aIniciar ? "inicio" : "pronta");
      else elemento?.removeAttribute("data-passagem");
      if (restante > 0) temporizador = window.setTimeout(() => elemento?.removeAttribute("data-passagem"), restante);
    }
    const clicar = (evento: MouseEvent) => {
      if (evento.button || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      const a = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || /^\/(?:painel|api)(?:\/|$)/.test(url.pathname)) return;
      const destino = url.pathname + url.search;
      if (destino !== destinoAtual()) mostrar(destino, true, true);
    };
    const voltar = () => mostrar(destinoAtual());
    const repor = (evento: PageTransitionEvent) => { if (evento.persisted) mostrar(destinoAtual(), true); };
    const enviar = () => mostrar(destinoAtual(), true);
    mostrar(destinoAtual());
    document.addEventListener("click", clicar, true);
    window.addEventListener("popstate", voltar);
    window.addEventListener("pageshow", repor);
    window.addEventListener(EVENTO_ENVIO, enviar);
    return () => {
      clearTimeout(temporizador);
      elemento.removeAttribute("data-passagem");
      document.removeEventListener("click", clicar, true);
      window.removeEventListener("popstate", voltar);
      window.removeEventListener("pageshow", repor);
      window.removeEventListener(EVENTO_ENVIO, enviar);
    };
  }, [caminho]);

  return <span hidden ref={sinal} />;
}

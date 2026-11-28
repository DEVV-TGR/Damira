"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** O resto da vitrine continua em lazy loading enquanto se usa o destino. */
export function ImagensDoDestino() {
  const caminho = usePathname();
  const anterior = useRef(caminho);
  const [pendentesEm, definirPendentes] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (anterior.current === caminho) return;
    anterior.current = caminho;
    const principal = document.querySelector("main");
    if (!principal) return;

    let atual = true;
    let observador: MutationObserver | undefined;
    let quadro = 0;
    function verificar() {
      if (!principal || principal.querySelector(".etapa-espera-rota")) return;
      observador?.disconnect();
      quadro = requestAnimationFrame(() => {
        const ancora = document.getElementById(location.hash.slice(1));
        const zona = ancora ?? principal;
        const inicio = ancora?.getBoundingClientRect().top ?? 0;
        const imagens = [...zona.querySelectorAll("img")].filter(imagem => {
          if (imagem.complete) return false;
          const caixa = imagem.getBoundingClientRect();
          return caixa.width > 0 && caixa.height > 0 && caixa.bottom > inicio && caixa.top < inicio + innerHeight;
        });
        if (imagens.length === 0) return;
        definirPendentes(caminho);
        void Promise.allSettled(imagens.map(imagem => imagem.decode())).then(() => {
          if (atual) definirPendentes(null);
        });
      });
    }
    if (principal.querySelector(".etapa-espera-rota")) {
      observador = new MutationObserver(verificar);
      observador.observe(principal, { childList: true, subtree: true });
    } else verificar();
    return () => {
      atual = false;
      definirPendentes(null);
      cancelAnimationFrame(quadro);
      observador?.disconnect();
    };
  }, [caminho]);

  return pendentesEm === caminho ? <span hidden className="etapa-espera-imagens" /> : null;
}

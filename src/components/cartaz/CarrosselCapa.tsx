"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function CarrosselCapa() {
  const [mostraMontra, definirMostraMontra] = useState(false);

  useEffect(() => {
    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const intervalo = window.setInterval(() => {
      if (movimentoReduzido.matches) return;
      definirMostraMontra((anterior) => !anterior);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <>
      <Image
        src="/fotos/capa-fachada.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        className="capa__foto"
      />
      <Image
        src="/fotos/capa-montra.webp"
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="low"
        className="capa__foto capa__foto--alternativa"
        data-visivel={mostraMontra ? "" : undefined}
      />
    </>
  );
}

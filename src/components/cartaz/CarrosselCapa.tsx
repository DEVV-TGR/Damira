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
      {/* ⚠️ **No Natal, a primeira é o boneco de gengibre** (pedido do Gonçalo,
          27/11); a fachada (`capa-fachada.webp`) fica em `public/fotos/` para
          voltar depois das festas. É a que fica com o movimento reduzido. */}
      <Image
        src="/fotos/capa-natal.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        className="capa__foto capa__foto--natal"
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

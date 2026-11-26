"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function CarrosselCapa({
  pausar,
  retomar,
}: {
  pausar: string;
  retomar: string;
}) {
  const [mostraMontra, definirMostraMontra] = useState(false);
  const [pausado, definirPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;

    const intervalo = window.setInterval(() => {
      definirMostraMontra((anterior) => !anterior);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [pausado]);

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
      <button
        type="button"
        className="capa__pausa"
        onClick={() => definirPausado((anterior) => !anterior)}
      >
        {pausado ? retomar : pausar}
      </button>
    </>
  );
}

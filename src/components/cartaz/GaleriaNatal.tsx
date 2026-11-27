"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { VitrineGrelha, type FotoDaVitrine } from "./VitrineGrelha";

export function GaleriaNatal({ fotos }: { fotos: FotoDaVitrine[] }) {
  const t = useTranslations("cartaz.natal");
  const dialogo = useRef<HTMLDialogElement>(null);
  const [indice, definirIndice] = useState<number | null>(null);
  const [aReproduzir, reproduzir] = useState(false);

  function abrir(posicao: number) {
    definirIndice(posicao);
    reproduzir(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    dialogo.current?.showModal();
  }

  function percorrer(passo: number) {
    reproduzir(false);
    definirIndice(atual => atual === null ? null : (atual + passo + fotos.length) % fotos.length);
  }

  useEffect(() => {
    if (!aReproduzir || indice === null) return;
    const tempo = window.setTimeout(() => definirIndice((indice + 1) % fotos.length), 5000);
    return () => window.clearTimeout(tempo);
  }, [aReproduzir, indice, fotos.length]);

  return (
    <>
      <VitrineGrelha id="natal-grelha" fotos={fotos} aoAbrirFoto={abrir} />
      <dialog
        ref={dialogo}
        className="natal__previa"
        aria-label={t("titulo")}
        onClose={() => { definirIndice(null); reproduzir(false); }}
        onClick={evento => { if (evento.target === dialogo.current) dialogo.current.close(); }}
        onKeyDown={evento => {
          if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
          evento.preventDefault();
          percorrer(evento.key === "ArrowLeft" ? -1 : 1);
        }}
      >
        <div className="natal__painel">
          <header>
            <strong>{t("titulo")}</strong>
            <button type="button" aria-label={t("fechar")} onClick={() => dialogo.current?.close()}>×</button>
          </header>
          {indice !== null && (
            <>
              <div className="natal__fotografia">
                <Image src={fotos[indice].src} alt={fotos[indice].alt} fill sizes="(max-width: 60rem) 96vw, 56rem" />
              </div>
              <div className="natal__controlos">
                <span>{indice + 1} / {fotos.length}</span>
                <button type="button" aria-label={t("anterior")} onClick={() => percorrer(-1)}>←</button>
                <button type="button" onClick={() => reproduzir(!aReproduzir)}>
                  {aReproduzir ? t("pausar") : t("reproduzir")}
                </button>
                <button type="button" aria-label={t("seguinte")} onClick={() => percorrer(1)}>→</button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

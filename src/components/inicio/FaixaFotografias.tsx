import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Faixa de fotografia a correr, de lado a lado.
 *
 * **As fotografias são de marca e não de um prato**, e é por isso que a faixa
 * não tem legendas. São as mesmas imagens que o negócio publica nas duas casas —
 * pôr-lhes o nome de um santo por baixo era afirmar o que não se sabe.
 *
 * Estar em movimento e pequenas também lhes assenta melhor do que estar paradas
 * e grandes: são fotografias medianas, e uma fila estática convidava a olhar
 * para cada uma o tempo suficiente para lhes ver os defeitos.
 */
const FOTOS = [
  "/comida/02.webp",
  "/comida/03.webp",
  "/comida/05.webp",
  "/comida/06.webp",
  "/comida/07.webp",
  "/comida/08.webp",
  "/comida/09.webp",
  "/comida/01.webp",
];

export function FaixaFotografias() {
  const t = useTranslations("inicio.cozinha");

  return (
    <section className="seccao bg-papel-fundo">
      <div className="envolvente">
        <p className="olho">{t("olho")}</p>
        <h2 className="titulo-display mt-4 max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)]">
          {t("titulo")}
        </h2>
      </div>

      <div className="fita mt-12" aria-label={t("titulo")}>
        <div className="fita-conteudo" style={{ "--duracao": "60s" } as React.CSSProperties}>
          <Serie />
          <Serie duplicada />
        </div>
      </div>

      <p className="envolvente mt-6 text-xs text-tinta-suave">{t("credito")}</p>
    </section>
  );
}

function Serie({ duplicada = false }: { duplicada?: boolean }) {
  return (
    <ul className="flex shrink-0" aria-hidden={duplicada || undefined}>
      {FOTOS.map((src, indice) => (
        <li
          key={src}
          /* Alturas alternadas para a fila não ficar a régua e esquadro — o olho
             segue uma linha irregular e pára; numa fila perfeita passa por cima
             sem ver nada. */
          className={`relative mx-2 shrink-0 overflow-hidden rounded-2xl ${
            indice % 2 === 0
              ? "h-[clamp(11rem,22vw,15rem)] w-[clamp(14rem,28vw,19rem)]"
              : "mt-[clamp(1rem,3vw,2.5rem)] h-[clamp(13rem,26vw,17rem)] w-[clamp(11rem,21vw,14rem)]"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 60vw, 20rem"
            loading={duplicada || indice > 2 ? "lazy" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Faixa editorial de fotografia, a sangrar de lado a lado.
 *
 * **As fotografias são de marca e não de um prato**, e é por isso que esta faixa
 * não tem legendas. São as mesmas imagens que o negócio publica nas duas casas —
 * pôr-lhes o nome de um santo por baixo era afirmar o que não se sabe. Aqui
 * dizem só o que são: comida do Santo Burga.
 *
 * Alturas alternadas para a fila não ficar a régua e esquadro. É o mesmo truque
 * de uma revista: o olho segue uma linha irregular e pára; numa fila perfeita
 * passa por cima sem ver nada.
 */
const FOTOS = [
  { src: "/comida/02.webp", alto: true },
  { src: "/comida/03.webp", alto: false },
  { src: "/comida/04.webp", alto: true },
  { src: "/comida/05.webp", alto: false },
  { src: "/comida/06.webp", alto: true },
  { src: "/comida/07.webp", alto: false },
  { src: "/comida/08.webp", alto: true },
  { src: "/comida/09.webp", alto: false },
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

      <ul
        className="mt-12 flex gap-4 overflow-x-auto px-[clamp(1.25rem,4vw,2.5rem)] pb-4 [scrollbar-width:none]"
        aria-label={t("titulo")}
      >
        {FOTOS.map((foto, indice) => (
          <li
            key={foto.src}
            className={`relative shrink-0 overflow-hidden rounded-2xl ${
              foto.alto
                ? "h-[clamp(16rem,34vw,22rem)] w-[clamp(12rem,26vw,17rem)]"
                : "mt-[clamp(1.5rem,4vw,3rem)] h-[clamp(13rem,28vw,18rem)] w-[clamp(15rem,32vw,21rem)]"
            }`}
          >
            <Image
              src={foto.src}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 60vw, 25vw"
              loading={indice < 3 ? undefined : "lazy"}
            />
          </li>
        ))}
      </ul>

      <p className="envolvente mt-6 text-xs text-tinta-suave">{t("credito")}</p>
    </section>
  );
}

import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Faixa de fotografia a correr, de lado a lado.
 *
 * **As fotografias são de marca e não de um prato**, e é por isso que a faixa
 * não tem legendas. São as mesmas imagens que o negócio publica nas duas casas —
 * pôr-lhes o nome de um santo por baixo era afirmar o que não se sabe.
 *
 * São as do Instagram, que têm 356 px de largura. Em ladrilhos desta dimensão
 * chegam — e é aqui que a gente a comer com as mãos funciona melhor do que um
 * prato fotografado em estúdio. Ver `scripts/importar-instagram.mjs`.
 */
const FOTOS = [
  "/instagram/06.webp",
  "/instagram/02.webp",
  "/instagram/08.webp",
  "/instagram/11.webp",
  "/instagram/07.webp",
  "/instagram/03.webp",
  "/instagram/12.webp",
  "/instagram/09.webp",
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
              ? "h-[clamp(9rem,18vw,12rem)] w-[clamp(11rem,22vw,15rem)]"
              : "mt-[clamp(1rem,3vw,2.5rem)] h-[clamp(10.5rem,21vw,14rem)] w-[clamp(9rem,17vw,11.5rem)]"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            /* Nunca acima da origem: estas imagens têm 356 px e pedir mais era
               servir uma ampliação a fingir de nitidez. */
            sizes="(max-width: 640px) 45vw, 15rem"
            loading={duplicada || indice > 2 ? "lazy" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

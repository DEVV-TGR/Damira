import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Capítulo III: **as mãos**.
 *
 * Vem logo a seguir ao pico e é de propósito que **desce de registo**: volta ao
 * documento, com a imagem na sua coluna e o texto ao lado. O `feel.md` diz que
 * cada emoção se define pelo que vem antes dela, e a intimidade precisa de
 * escala à frente — se este capítulo tentasse competir com o pão, tinha dois
 * picos, e uma página com dois picos não tem nenhum.
 *
 * É a única fotografia das cinco com uma pessoa dentro, e é a mais difícil de
 * substituir por outra qualquer: mostra que aquilo é feito ali.
 *
 * A coluna é invertida em relação à do capítulo I — lá a imagem estava à
 * direita, aqui está à esquerda. O `taste.md` proíbe mais de dois ziguezagues
 * seguidos, e estes são dois, com o pico de permeio.
 */
export function Maos() {
  const t = useTranslations("cartaz.maos");

  return (
    <section
      id="cap-maos"
      className="cap cap--maos"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="maos"
    >
      <div className="cap__duas cap__duas--invertida">
        <figure className="cap__estampa" data-sc-reveal="left" data-sc-reveal-at="0.05 0.5">
          <Image
            src="/fotos/02.webp"
            alt={t("legenda")}
            width={1400}
            height={875}
            sizes="(max-width: 60rem) 100vw, 42rem"
          />
          <figcaption>{t("legenda")}</figcaption>
        </figure>

        <div className="cap__caixa" data-sc-in data-sc-stagger="60">
          <p className="cap__olho">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>
          <h2 id="maos" className="cap__titulo">
            {t("titulo")}
          </h2>
          <p className="cap__texto">{t("texto")}</p>
        </div>
      </div>
    </section>
  );
}

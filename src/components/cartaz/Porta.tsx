import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Capítulo I: **a porta**.
 *
 * A primeira imagem da página, e entra por uma limpeza (`reveal`) e não por um
 * desvanecer: uma limpeza lê-se como mudança de estado, e chegar à porta é
 * exactamente isso.
 *
 * ⚠️ **A imagem vive na sua coluna, com legenda por baixo.** É o que a
 * gramática de capítulos exige, e é também o que salva o contraste sem véu
 * nenhum: não há uma letra por cima da fotografia, portanto não há nada para
 * proteger. O texto está ao lado, no papel.
 *
 * O `parallax` é de rácio baixo de propósito. O motor escreve
 * `rate * (p - 0.5) * 100` píxeis, por isso 0,9 são noventa píxeis de curso ao
 * longo do capítulo inteiro: o suficiente para a coluna ter profundidade,
 * pouco para alguém dar por ela — que é o ponto.
 */
export function Porta() {
  const t = useTranslations("cartaz.porta");

  return (
    <section
      id="cap-porta"
      className="cap cap--porta"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="porta"
    >
      <div className="cap__duas">
        <div className="cap__caixa" data-sc-in data-sc-stagger="60">
          <p className="cap__olho">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>
          <h2 id="porta" className="cap__titulo">
            {t("titulo")}
          </h2>
          <p className="cap__texto">{t("texto")}</p>
        </div>

        <figure className="cap__estampa" data-sc-reveal="up" data-sc-reveal-at="0.05 0.5">
          <div data-sc-parallax="0.9">
            <Image
              src="/fotos/06.webp"
              alt={t("legenda")}
              width={1920}
              height={1080}
              sizes="(max-width: 60rem) 100vw, 46rem"
              priority
            />
          </div>
          <figcaption>{t("legenda")}</figcaption>
        </figure>
      </div>
    </section>
  );
}

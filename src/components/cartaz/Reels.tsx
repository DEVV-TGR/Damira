import { useTranslations } from "next-intl";
import { redes } from "@/data/redes";
import { marca } from "@/data/marca";

export function Reels() {
  const t = useTranslations("cartaz.reels");
  const conta = marca.instagram;

  return (
    <section
      id="cap-reels"
      className="cap cap--reels"
      data-capitulo
      data-sc-act="pan"
      data-sc-span="4"
      aria-labelledby="reels"
    >
      <div data-sc-stage>
        <div className="reels__carril" data-sc-pan="0.06">
          <div className="reels__abertura">
            <h2 id="reels" className="cap__titulo">{t("titulo")}</h2>
          </div>
          <ul className="reels__fila">
            {redes.reels.map((reel) => (
              <li key={reel.id} className="reels__cela">
                <a href={reel.url} target="_blank" rel="noopener noreferrer">
                  <span className="reels__play" aria-hidden="true">▶</span>
                  <span className="reels__titulo">{t(`videos.${reel.id}`)}</span>
                  <span className="reels__rotulo">{t("verNoInstagram")}</span>
                </a>
              </li>
            ))}
          </ul>
          {conta && (
            <div className="reels__instagram">
              <a className="cap__accao cap__accao--claro" href={conta} target="_blank" rel="noopener noreferrer">
                {t("seguir", { utilizador: marca.instagramUtilizador ?? "" })}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

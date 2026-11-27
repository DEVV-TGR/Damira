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
      aria-labelledby="reels"
    >
      <div data-sc-act="pan" data-sc-span="4">
        {/* ⚠️ **O título fica parado e só os cartões deslizam** (27/11). Dentro do
            carril, o título saía pela borda logo no início do curso: no
            telemóvel, onde ocupa quase o ecrã, nunca chegava a estar inteiro e
            quieto, e lia-se «ira em / imento». Por cima do carril, lê-se o
            acto todo. */}
        <div data-sc-stage className="reels__palco">
          <div className="reels__abertura">
            <h2 id="reels" className="cap__titulo">{t("titulo")}</h2>
          </div>
          <div className="reels__carril" data-sc-pan="0.06">
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
          </div>
        </div>
      </div>
      {conta && (
        <div className="reels__instagram">
          <a className="cap__accao cap__accao--claro" href={conta} target="_blank" rel="noopener noreferrer">
            {t("seguir", { utilizador: marca.instagramUtilizador ?? "" })}
          </a>
        </div>
      )}
    </section>
  );
}

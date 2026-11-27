import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Raro() {
  const t = useTranslations("cartaz.raro");

  return (
    <section
      id="cap-raro"
      className="cap cap--raro"
      data-capitulo
      data-sc-act="pin"
      data-sc-span="2.5"
      aria-labelledby="raro"
    >
      <div data-sc-stage className="raro__palco">
        <div className="raro__caixa">
          <h2 id="raro" className="cap__titulo" aria-label={t("titulo")}>
            {t.rich("tituloAnimado", {
              percentagem: () => (
                <span className="raro__conta" aria-hidden="true">
                  <span data-sc-count="0 100" data-sc-count-at="0 0.9">100</span>
                  <span className="raro__valor-final">100</span>%
                </span>
              ),
            })}
          </h2>
          <p className="cap__texto">{t("texto")}</p>
          <p className="cap__texto">{t("exemplo")}</p>
          <p>
            <Link href="/encomendas#carta-vegan" className="cap__ligacao">
              {t("ligacao")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

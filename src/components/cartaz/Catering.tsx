import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Catering() {
  const t = useTranslations("cartaz.catering");

  return (
    <section id="cap-catering" className="cap cap--festa" data-capitulo data-sc-act="flow" aria-labelledby="catering">
      <div className="cap__caixa" data-sc-in data-sc-stagger="60">
        <h2 id="catering" className="cap__titulo">{t("titulo")}</h2>
        <p className="cap__texto">{t("texto")}</p>
        <p className="capa__atalhos">
          <Link href="/encomendas#festas" className="cap__accao cap__accao--claro">
            {t("ligacao")}
          </Link>
        </p>
      </div>
    </section>
  );
}

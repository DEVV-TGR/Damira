import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";
import { CarrosselCapa } from "./CarrosselCapa";

/** A capa alterna as duas fotografias entregues pela Damira. */
export function FolhaDeRosto() {
  const t = useTranslations("cartaz.capa");
  const marca = useTranslations("marca");

  return (
    <section className="cap cap--capa" data-sc-act="flow" aria-labelledby="capa">
      <CarrosselCapa />
      <div className="cap__caixa" data-sc-in data-sc-stagger="70">
        <p className="cap__olho">
          {t("olho")}, {marca("desde", { ano: casa.desde })}
        </p>

        {/* O ponto final faz parte da assinatura pintada na montra. */}
        <h1 id="capa" className="capa__titulo">
          {marca("assinatura")}.
        </h1>

        <p className="cap__lede">{t("lede")}</p>

        {/* O catálogo reúne toda a oferta num só destino, incluindo a carta. */}
        <p className="capa__atalhos">
          <Link className="cap__accao cap__accao--claro" href="/encomendas">
            {t("encomendar")}
          </Link>
        </p>

        <p className="cap__nota">{t("credito")}</p>
      </div>
    </section>
  );
}

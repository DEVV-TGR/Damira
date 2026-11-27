import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

/**
 * A capa tem uma fotografia só. ⚠️ **No Natal é o boneco de gengibre**, e só ele
 * (pedido do Gonçalo, 27/11): a troca a cada cinco segundos com a montra saiu,
 * e com ela o `CarrosselCapa`. A fachada e a montra (`capa-fachada.webp`,
 * `capa-montra.webp`) ficam em `public/fotos/` para voltarem depois das festas.
 */
export function FolhaDeRosto() {
  const t = useTranslations("cartaz.capa");
  const marca = useTranslations("marca");

  return (
    <section className="cap cap--capa" data-sc-act="flow" aria-labelledby="capa">
      <Image
        src="/fotos/capa-natal.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        className="capa__foto capa__foto--natal"
      />
      <div className="cap__caixa" data-sc-in data-sc-stagger="70">
        <p className="cap__olho">
          {t("olho")}
        </p>

        {/* O ponto final faz parte da assinatura pintada na montra. */}
        <h1 id="capa" className="capa__titulo">
          {marca("assinatura")}.
        </h1>

        <div className="cap__lede">
          <p><strong>{t("lede")}</strong></p>
          <ul className="capa__oferta">
            <li>{t("refeicoes")}</li>
            <li>{t("padaria")}</li>
            <li>{t("vegan")}</li>
          </ul>
        </div>

        {/* O catálogo reúne toda a oferta num só destino, incluindo a carta. */}
        <p className="capa__atalhos">
          <Link className="cap__accao cap__accao--claro" href="/encomendas">
            {t("encomendar")}
          </Link>
        </p>
      </div>
    </section>
  );
}

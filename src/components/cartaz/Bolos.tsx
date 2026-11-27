import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Bolos() {
  const t = useTranslations("cartaz.bolos");
  const tVitrine = useTranslations("cartaz.vitrine.legendas");

  return (
    <section id="cap-bolos" className="cap cap--porta" data-capitulo data-sc-act="flow" aria-labelledby="bolos">
      <div className="cap__duas">
        <div className="cap__caixa" data-sc-in data-sc-stagger="60">
          <h2 id="bolos" className="cap__titulo">{t("titulo")}</h2>
          <p className="cap__texto">
            {t.rich("texto", {
              ligacao: (texto) => <Link className="cap__ligacao cap__ligacao--em-linha" href="/encomendas#kits-bolo">{texto}</Link>,
            })}
          </p>
        </div>

        <div className="cap__estampa" data-sc-reveal="up" data-sc-reveal-at="0.05 0.5">
          <Image
            src="/vitrine/bolo-frutos-vermelhos.webp"
            alt={tVitrine("boloFrutosVermelhos")}
            width={1200}
            height={900}
            sizes="(max-width: 62rem) 90vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}

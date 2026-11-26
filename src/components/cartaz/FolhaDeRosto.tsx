import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";

/** A capa usa a fachada da remessa da Damira. O título vem da montra. */
export function FolhaDeRosto() {
  const t = useTranslations("cartaz.capa");
  const marca = useTranslations("marca");

  return (
    <section className="cap cap--capa" data-sc-act="flow" aria-labelledby="capa">
      <Image
        src="/fotos/capa-fachada.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        className="capa__foto"
      />
      <div className="cap__caixa" data-sc-in data-sc-stagger="70">
        <p className="cap__olho">
          {t("olho")}, {marca("desde", { ano: casa.desde })}
        </p>

        {/* O ponto final faz parte da assinatura pintada na montra. */}
        <h1 id="capa" className="capa__titulo">
          {marca("assinatura")}.
        </h1>

        <p className="cap__lede">{t("lede")}</p>

        {/* ⚠️ **Os dois atalhos vivem aqui, no primeiro ecrã.** A gramática de
            capítulos abre em folha de rosto e o instinto é deixá-la só com o
            título — mas a maior parte das visitas chega de telemóvel e a
            pergunta que traz é *o que têm* ou *como encomendo*. Obrigá-la a
            rolar catorze ecrãs até à secção IX para descobrir que se pode
            encomendar é fazer o sítio parecer um cartaz e não uma casa aberta.

            São dois e não quatro: o `taste.md` limita o primeiro ecrã a quatro
            elementos de texto, e já lá estão o olho, o título e a linha de
            abertura. */}
        <p className="capa__atalhos">
          <Link className="cap__accao cap__accao--claro" href="/encomendas#da-ementa">
            {t("verEmenta")}
          </Link>
          <Link className="cap__accao cap__accao--contorno" href="/encomendas">
            {t("encomendar")}
          </Link>
        </p>

        <p className="cap__nota">{t("credito")}</p>
      </div>
    </section>
  );
}

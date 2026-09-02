import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";

/**
 * Capítulo zero: a **folha de rosto**.
 *
 * A gramática editorial em capítulos (`uniqueness.md` §2.2) é explícita: o
 * primeiro ecrã é uma folha de rosto, com tipografia no papel e **sem imagem
 * acima da dobra**. A imagem começa no capítulo I.
 *
 * ⚠️ **É uma mudança em relação ao que aqui estava**, e é deliberada. O herói
 * anterior punha a fachada em cheio com o título por cima e um véu de tijolo a
 * 55% a segurar o contraste. Aquilo era a gramática filmica, e esta página não
 * é essa: aqui a fachada é o capítulo I, com a sua legenda, e o primeiro ecrã é
 * a frase da casa sozinha, à escala a que uma capa a poria.
 *
 * A frase continua a ser a da montra, e continua a não ser nossa.
 */
export function FolhaDeRosto() {
  const t = useTranslations("cartaz.capa");
  const marca = useTranslations("marca");

  return (
    <section className="cap cap--capa" data-sc-act="flow" aria-labelledby="capa">
      <div className="cap__caixa" data-sc-in data-sc-stagger="70">
        <p className="cap__olho">
          {t("olho")}, {marca("desde", { ano: casa.desde })}
        </p>

        {/* A assinatura da casa, em caixa alta e muito condensada: é o registo
            dos impressos, e a Bricolage tem eixo de largura para lá chegar sem
            trocar de família. O ponto final é da montra e fica. */}
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
          <Link className="cap__accao cap__accao--claro" href="/ementa">
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

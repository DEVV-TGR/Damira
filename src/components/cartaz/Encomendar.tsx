import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa, moradaCompleta, telefoneMarcavel, urlDirecoes } from "@/data/casa";

/**
 * # Encomendar: as três maneiras, lado a lado
 *
 * ## Porque é que isto é uma secção e não um botão
 *
 * A casa recebe encomendas por três vias — ao balcão, por telefone e pelo
 * formulário — e não são equivalentes para quem chega. Quem mora ao lado passa
 * lá; quem quer falar com uma pessoa telefona; quem está a decidir às onze da
 * noite escreve. Um botão só oferece uma delas e obriga as outras duas a
 * procurar.
 *
 * ## O desenho é feito para quem não gosta de sítios
 *
 * O cliente pediu que **tanto um jovem como uma pessoa mais velha** usassem
 * isto sem esforço, e isso tem consequências concretas neste bloco:
 *
 * - **os três alvos são blocos inteiros e não palavras sublinhadas.** Um alvo
 *   grande acerta-se com o dedo trémulo, com o rato impreciso e no autocarro;
 * - **cada um diz o que vai acontecer a seguir** — "abre o mapa", "liga
 *   agora", "abre o formulário" — em vez de dizer "saber mais", que não diz
 *   nada a ninguém;
 * - **o número de telefone está escrito por extenso** e não escondido atrás de
 *   um ícone: quem prefere marcar à mão no telefone fixo consegue lê-lo;
 * - **nada aqui depende de passar o rato por cima.** Num telemóvel não há rato,
 *   e para muita gente num computador também não há paciência.
 *
 * ⚠️ **O rótulo é o mesmo em todo o sítio.** "Encomendar" aqui, no cabeçalho e
 * no capítulo da festa. Dois nomes para o mesmo botão são dois botões aos olhos
 * de quem lê, e é assim que se perde alguém a meio.
 */
export function Encomendar() {
  const t = useTranslations("cartaz.encomendar");

  return (
    <section
      id="cap-encomendar"
      className="cap cap--encomendar"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="encomendar"
    >
      <div className="cap__caixa" data-sc-in data-sc-stagger="50">
        <p className="cap__olho">
          <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
        </p>
        <h2 id="encomendar" className="cap__titulo">
          {t("titulo")}
        </h2>
        <p className="cap__texto">{t("texto")}</p>
      </div>

      <ul className="encomendar__vias" data-sc-in data-sc-stagger="60">
        <li>
          <Link className="via" href="/encomendas">
            <span className="via__ordem">1</span>
            <span className="via__nome">{t("formulario.nome")}</span>
            <span className="via__detalhe">{t("formulario.detalhe")}</span>
            <span className="via__accao">{t("formulario.accao")}</span>
          </Link>
        </li>

        {casa.telefone && (
          <li>
            <a className="via" href={`tel:${telefoneMarcavel()}`}>
              <span className="via__ordem">2</span>
              <span className="via__nome">{t("telefone.nome")}</span>
              {/* Por extenso, e não só no `href`: quem marca à mão precisa de o
                  ver. */}
              <span className="via__detalhe">{casa.telefone}</span>
              <span className="via__accao">{t("telefone.accao")}</span>
            </a>
          </li>
        )}

        <li>
          <a
            className="via"
            href={urlDirecoes()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="via__ordem">3</span>
            <span className="via__nome">{t("balcao.nome")}</span>
            <span className="via__detalhe">{moradaCompleta()}</span>
            <span className="via__accao">{t("balcao.accao")}</span>
          </a>
        </li>
      </ul>

      <p className="cap__nota">{t("nota")}</p>
    </section>
  );
}

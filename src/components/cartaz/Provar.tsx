import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ementa, CARTAS, daCarta, type Carta } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/* As cartas com artigos, contadas. ⚠️ **Contado e não escrito**: no dia em que
   a casa deixar de fazer a carta de chocolate, esta secção desaparece sozinha
   em vez de anunciar uma carta que já não existe. */
const CARTAS_COM_ARTIGOS = CARTAS.filter((carta) => daCarta(carta).length > 0);

/* Um artigo de cada carta, para dar a ver o preço a par do nome. É o primeiro
   de cada uma e não um escolhido a dedo: escolher seis à mão seria uma lista de
   mais vendidos, que é justamente a coisa que este sítio não afirma porque os
   impressos da casa não a marcam. */
const AMOSTRA = CARTAS_COM_ARTIGOS.map((carta) => daCarta(carta)[0]);

/**
 * # Provar: a ementa vista da página inicial
 *
 * ## Porque não chega uma ligação
 *
 * A página inicial tinha uma ligação para a ementa e mais nada. Quem chega ao
 * sítio pela primeira vez faz uma pergunta antes de todas as outras — *o que é
 * que eles têm, e quanto custa?* — e uma ligação responde-lhe com outro clique.
 *
 * Aqui a resposta está à vista: **as quatro cartas, quantos artigos tem cada
 * uma, e um preço a sério de cada uma delas.** Quem quiser os noventa e cinco
 * carrega uma vez.
 *
 * ⚠️ **Não é uma segunda ementa.** Se esta secção crescer para vinte artigos
 * passa a competir com a página que existe para isso, e a página inicial fica
 * com uma lista a meio de uma narrativa. Quatro linhas e um botão.
 *
 * ## O preço mostra-se com a unidade
 *
 * ⚠️ Um bolo vegan são 17 € **ao quilo** e um bolo inteiro pesa dois. Escrever
 * "17,00 €" ao lado dele anuncia metade do preço. O `formatarPreco` trata do
 * número; a unidade vem do artigo e escreve-se sempre.
 */
export function Provar({ locale }: { locale: Locale }) {
  const t = useTranslations("cartaz.provar");
  const cartas = useTranslations("ementa.cartas");

  return (
    <section
      id="cap-provar"
      className="cap cap--provar"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="provar"
    >
      <div className="cap__caixa" data-sc-in data-sc-stagger="50">
        <p className="cap__olho">
          <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
        </p>
        <h2 id="provar" className="cap__titulo">
          {t("titulo")}
        </h2>
        <p className="cap__texto">{t("texto", { total: ementa.length })}</p>
      </div>

      <ul className="provar__cartas" data-sc-in data-sc-stagger="60">
        {CARTAS_COM_ARTIGOS.map((carta: Carta, indice) => {
          const artigo = AMOSTRA[indice];
          return (
            <li key={carta} className="provar__carta">
              <h3>{cartas(`${carta}.curto`)}</h3>
              <p className="provar__quantos">
                {t("quantos", { n: daCarta(carta).length })}
              </p>
              <p className="provar__exemplo">
                <span>{locale === "en" ? artigo.nomeEn : artigo.nome}</span>
                <span className="provar__preco">
                  {artigo.preco === null
                    ? t("semPreco")
                    : `${formatarPreco(artigo.preco, locale)}${
                        artigo.unidade === "kg" ? ` / ${t("quilo")}` : ""
                      }`}
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="provar__accao" data-sc-in>
        <Link className="cap__accao cap__accao--principal" href="/ementa">
          {t("verEmenta")}
        </Link>
      </p>
    </section>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { encomendas, desdeQuanto, escaloesDisponiveis } from "@/data/encomendas";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/**
 * Capítulo V: **a festa**. É o argumento que muda o valor de uma encomenda de
 * três euros para mil.
 *
 * ## Porque atravessa de lado
 *
 * O `devices.md` §3 diz a razão numa linha: **o movimento lateral lê-se como
 * amplitude e o vertical lê-se como argumento.** Os três kits não são uma
 * hierarquia — o Básico não é pior do que o Premium, é outra mesa — e uma
 * lista vertical faz o primeiro parecer o principal. De lado, são três opções
 * a passar.
 *
 * ## ⚠️ O carril tem de transbordar, e isto não se adivinha
 *
 * O motor percorre exactamente `scrollWidth - innerWidth`. Um carril mais
 * estreito do que o ecrã percorre **zero**, e o acto vira um palco preso a
 * segurar um ecrã imóvel durante o vão inteiro. Pior: depende da largura,
 * portanto pode andar no telemóvel e estar morto no computador ao mesmo tempo,
 * e a folha de contacto do telemóvel passa. **A verificação não apanha isto** —
 * é medição à mão, no browser:
 *
 * ```js
 * const c = document.querySelector(".festa__carril");
 * c.scrollWidth - innerWidth   // tem de ser bem positivo
 * ```
 *
 * É também por isso que o título entra **como primeiro item do carril** e a
 * nota como último, em vez de estarem por fora: os dois ganham o lugar por
 * mérito (o título deixa de competir com o resto do ecrã, a nota dá resolução
 * ao carril em vez de ele simplesmente acabar) e de caminho dão a largura de
 * que o curso precisa.
 */
export function Festa({ locale }: { locale: Locale }) {
  const t = useTranslations("cartaz.festa");
  const escaloes = escaloesDisponiveis();
  const maximo = escaloes[escaloes.length - 1];

  return (
    <section
      id="cap-festa"
      className="cap cap--festa"
      data-capitulo
      data-sc-act="pan"
      data-sc-span="3"
      aria-labelledby="festa"
    >
      <div data-sc-stage>
        <div className="festa__carril" data-sc-pan="0.06">
          <div className="festa__abertura">
            <p className="cap__olho">
              <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
            </p>
            <h2 id="festa" className="cap__titulo">
              {t("titulo")}
            </h2>
            <p className="cap__texto">{t("texto")}</p>
          </div>

          {encomendas.kitsFesta.map((kit) => (
            <article key={kit.id} className="festa__kit">
              {/* ⚠️ Uma palavra ou duas por título, e nunca mais. Um item de
                  carril passa metade da vida cortado pela berma do ecrã, e dois
                  meios títulos lado a lado leem-se como uma terceira palavra
                  que ninguém escreveu. */}
              <h3>{kit.nome[locale]}</h3>
              <p className="festa__desde">
                {t("desde", { preco: formatarPreco(desdeQuanto(kit), locale) })}
              </p>
              <ul className="festa__escaloes">
                {kit.escaloes.map((e) => (
                  <li key={e.pessoas}>
                    {t("pessoas", { n: e.pessoas })}
                    <span>{formatarPreco(e.preco, locale)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="festa__fecho">
            <p className="festa__ate">{t("pessoas", { n: maximo })}</p>
            <p className="cap__texto">{t("nota")}</p>
            <Link href="/encomendas" className="cap__ligacao">
              {t("ligacao")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

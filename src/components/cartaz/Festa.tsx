import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { quantasOpcoes } from "@/data/bolos";
import type { Locale } from "@/i18n/routing";
import type { Produto } from "@/lib/dados/tipos";
import { formatarCent } from "@/lib/preco";
import { precoMinimoCent } from "@/lib/vista";

/* O mais barato de uma família, em cêntimos. */
const desdeDe = (produtos: readonly Produto[]): number =>
  Math.min(...produtos.map((p) => precoMinimoCent(p) ?? Infinity));

/**
 * Capítulo VIII: **o que se encomenda**. É o argumento que muda o valor de uma
 * encomenda de três euros para mil.
 *
 * ## ⚠️ Isto mostrava só os três kits de festa, e passou a mostrar a oferta toda
 *
 * O capítulo era um catálogo de uma família: três cartões, um por kit, com a
 * escada de preços de cada um. Quem só passasse pela homepage saía a saber que
 * a casa faz festas — e a não saber que faz **bolos por medida, boxes, e setenta
 * artigos da carta à dúzia ou ao quilo**. A `/encomendas` cobria isso; a
 * homepage, que é o que a maior parte das pessoas vê, não.
 *
 * ⚠️ **E foi uma troca, não um acréscimo.** A página já mede dezanove alturas de
 * ecrã, contra o tecto de catorze que a skill fixa (ver o BRIEF, «A homepage tem
 * de cobrir isso tudo»). Acrescentar quatro cartões aos três que cá estavam
 * levava o capítulo a nove itens e a página a vinte e três alturas. Os três kits
 * saíram e entraram **quatro famílias**: um item a mais, não cinco.
 *
 * O que se perde é a comparação lado a lado dos três kits — que era boa, e que
 * agora vive onde tem espaço para ser boa: em `/encomendas`, com uma página por
 * kit e a tabela dos três escalões. O que se ganha é a homepage deixar de
 * anunciar um terço do que a casa faz.
 *
 * ## Porque atravessa de lado
 *
 * O `devices.md` §3 diz a razão numa linha: **o movimento lateral lê-se como
 * amplitude e o vertical lê-se como argumento.** As quatro famílias não são uma
 * hierarquia — uma box para dois não é pior do que um kit para setenta, é outra
 * ocasião — e uma lista vertical faz a primeira parecer a principal.
 *
 * ## ⚠️ O carril tem de transbordar, e isto não se adivinha
 *
 * O motor percorre exactamente `scrollWidth - innerWidth`. Um carril mais
 * estreito do que o ecrã percorre **zero**, e o acto vira um palco preso a
 * segurar um ecrã imóvel durante o vão inteiro. Pior: depende da largura,
 * portanto pode andar no telemóvel e estar morto no computador ao mesmo tempo.
 * **A verificação não apanha isto** — é medição à mão, no browser:
 *
 * ```js
 * const c = document.querySelector(".festa__carril");
 * c.scrollWidth - innerWidth   // tem de ser bem positivo
 * ```
 *
 * É também por isso que o título entra **como primeiro item do carril** e a nota
 * como último, em vez de estarem por fora: os dois ganham o lugar por mérito e
 * de caminho dão a largura de que o curso precisa.
 */
export function Festa({
  ementa,
  encomendas,
  locale,
}: {
  ementa: Produto[];
  encomendas: Produto[];
  locale: Locale;
}) {
  const t = useTranslations("cartaz.festa");
  const kitsFesta = encomendas.filter((p) => p.familia === "festa");
  const kitsBolo = encomendas.filter((p) => p.familia === "bolo");
  const boxes = encomendas.filter((p) => p.familia === "box");
  const escaloes = [
    ...new Set(kitsFesta.flatMap((kit) => kit.variantes.map((v) => v.pessoas!))),
  ].sort((a, b) => a - b);
  const maximo = escaloes[escaloes.length - 1];

  /**
   * ⚠️ **Todos estes números são contados dos dados, nenhum é escrito à mão.**
   * É a regra do BRIEF, «Números, e só os verdadeiros»: um número escrito à mão
   * numa homepage sobrevive a três alterações da carta antes de alguém reparar
   * que está errado — e quem repara é o cliente ao balcão.
   */
  const familias = [
    {
      chave: "festas",
      href: "/encomendas#festas",
      desde: desdeDe(kitsFesta),
      detalhe: t("familias.festas.detalhe", {
        kits: kitsFesta.length,
        escaloes: escaloes.join(" · "),
      }),
    },
    {
      chave: "bolos",
      href: "/encomendas#kits-bolo",
      desde: desdeDe(kitsBolo),
      detalhe: t("familias.bolos.detalhe", {
        kits: kitsBolo.length,
        opcoes: quantasOpcoes("classica") + quantasOpcoes("vegan"),
      }),
    },
    {
      chave: "boxes",
      href: "/encomendas#boxes",
      desde: desdeDe(boxes),
      detalhe: t("familias.boxes.detalhe", { n: boxes.length }),
    },
    {
      chave: "carta",
      href: "/encomendas#da-ementa",
      /* ⚠️ **Sem «desde».** Os artigos da carta vendem-se à dúzia e ao quilo, e
         um «desde 1,20 €» ao lado de um mínimo de doze anuncia um doze avos do
         preço. O cartão diz a regra em vez do número. */
      desde: null,
      detalhe: t("familias.carta.detalhe", {
        n: ementa.filter((artigo) => artigo.aVendaOnline).length,
      }),
    },
  ] as const;

  return (
    <section
      id="cap-festa"
      className="cap cap--festa"
      data-capitulo
      data-sc-act="pan"
      /* ⚠️ **5,5 e não 4,5.** O curso de um `pan` é o vão menos um ecrã, e o
         carril passou de cinco itens para seis. A regra do `devices.md` é um
         ecrã por item mais um — e o cliente já se queixou uma vez de ver os kits
         a fugir quando isto estava curto de mais. */
      data-sc-span="5.5"
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

          {familias.map((familia) => (
            /* ⚠️ **Cada família é uma ligação para a sua secção**, e não para o
               topo de `/encomendas`. Quem carrega em «boxes» na homepage quer
               ver boxes, e a página é longa: deixá-lo no topo é fazê-lo procurar
               outra vez o que já escolheu. As âncoras existem — ver o índice do
               herói das encomendas. */
            <Link
              key={familia.chave}
              href={familia.href}
              className="festa__familia"
            >
              {/* ⚠️ Uma palavra ou duas por título, e nunca mais. Um item de
                  carril passa metade da vida cortado pela berma do ecrã, e dois
                  meios títulos lado a lado leem-se como uma terceira palavra que
                  ninguém escreveu. */}
              <h3>{t(`familias.${familia.chave}.nome`)}</h3>
              {familia.desde !== null && (
                <p className="festa__desde">
                  {t("desde", { preco: formatarCent(familia.desde, locale) })}
                </p>
              )}
              <p className="festa__detalhe">{familia.detalhe}</p>
              <span className="festa__ir">{t("verFamilia")}</span>
            </Link>
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

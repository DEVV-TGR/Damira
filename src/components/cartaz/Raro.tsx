import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ementa } from "@/data/ementa";

/* ⚠️ **Contados, não escritos.** O `taste.md` e o `AGENTS.md` proíbem os dois
   um número inventado, e um número escrito à mão é um número inventado assim
   que alguém acrescentar um artigo ao JSON sem se lembrar disto. Estes saem do
   próprio `ementa.json` no `build`, portanto ou estão certos ou não há build. */
const VEGAN = ementa.filter((artigo) => artigo.vegan).length;
const TOTAL = ementa.length;

/**
 * Capítulo IV: **o raro**. É o argumento que faz alguém atravessar Ermesinde.
 *
 * ## O verde entra aqui, e só aqui
 *
 * ⚠️ O `AGENTS.md` é taxativo: o verde é da carta vegan e **não é uma cor de
 * acento disponível**. Usá-lo como decoração numa secção de leitão ensina o
 * olho a ignorá-lo justamente onde ele conta. Nesta página há seis fundos e
 * este é o único verde, o que faz dele o corte mais forte da sequência sem que
 * ninguém tenha de inventar cor nenhuma.
 *
 * ⚠️ **Papel sobre o verde da marca dá 3,89:1** e só passa em títulos grandes.
 * Por isso o corpo de texto deste capítulo assenta no `verde-forte`, que existe
 * no `globals.css` exactamente para isto e dá 4,67:1. Ver a tabela lá.
 *
 * ## Os avisos do contrato de deixas que este acto podia apanhar
 *
 * É um acto preso, e um palco preso fica visível cerca de um ecrã **antes** de
 * o seu progresso sair do zero. Um primeiro conteúdo com deixa de duas
 * posições mostrava palco vazio esse tempo todo, por isso o olho abre em forma
 * de saudação (`"0 1 0 0"`: cheio a p = 0, sem rampa nas duas pontas).
 *
 * E nenhuma deixa daqui pode segurar até ao fim: só o último acto da página o
 * pode fazer. Uma deixa de um valor num acto do meio fica acesa durante toda a
 * saída do palco, sobe um ecrã inteiro e sobrepõe-se ao capítulo seguinte.
 * Todas fecham a 1.
 */
export function Raro() {
  const t = useTranslations("cartaz.raro");

  return (
    <section
      id="cap-raro"
      className="cap cap--raro"
      data-capitulo
      data-sc-act="pin"
      /* ⚠️ **3 e não 1,7, e com `dwell`.** O curso de um acto preso é o vão
         menos um ecrã: com 1,7 sobravam 0,7 ecrãs para cinco deixas e a
         contagem, e o cliente viu a secção passar a correr — o 49 nem chegava
         a contar. Com 3 são dois ecrãs de curso, e o `dwell` de 0,35 faz a
         rolagem assentar a meio, onde o número e o título estão. */
      data-sc-span="3"
      data-sc-dwell="0.35"
      aria-labelledby="raro"
    >
      <div data-sc-stage className="raro__palco">
        <div className="raro__caixa">
          <p className="cap__olho" data-sc-cue="0 1 0 0">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>

          <p className="raro__conta" data-sc-cue="0.05 1">
            <span className="raro__numero" data-sc-count={`0 ${VEGAN}`} data-sc-count-at="0.12 0.55">
              0
            </span>
            <span className="raro__de">{t("de", { total: TOTAL })}</span>
          </p>

          <h2 id="raro" className="cap__titulo" data-sc-cue="0.22 1" data-sc-kinetic="lines">
            {t("titulo")}
          </h2>

          <p className="cap__texto" data-sc-cue="0.4 1">
            {t("texto")}
          </p>

          <p data-sc-cue="0.52 1">
            <Link href="/ementa" className="cap__ligacao">
              {t("ligacao")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

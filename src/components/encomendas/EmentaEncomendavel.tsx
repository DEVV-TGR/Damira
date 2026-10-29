import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Produto } from "@/lib/dados/tipos";
import { porCategoria, regraDe } from "@/lib/vista";
import { CartaoArtigo } from "./CartaoArtigo";
import { SetaMinimizar } from "./SetaMinimizar";
import { TituloDaSeccao } from "./TituloDaSeccao";

/**
 * # A carta, por encomenda
 *
 * ## ⚠️ Isto encosta ao aviso do AGENTS.md, e encosta com regras
 *
 * O aviso diz para **não juntar a encomenda à ementa**, porque um kit para
 * setenta pessoas ao lado de um croissant leva alguém a aparecer ao sábado à
 * espera de o levar debaixo do braço. Continua a valer, e as duas páginas
 * continuam separadas: isto vive em `/encomendas` e não em `/ementa`.
 *
 * O que evita o mal-entendido é a **quantidade mínima escrita no cabeçalho de
 * cada categoria**. Um artigo que só se pede à dúzia, com antecedência, nunca se
 * confunde com um que se tira da vitrine — e quem quiser um pastel continua a
 * entrar na loja e a pedi-lo.
 *
 * ## ⚠️ Era uma lista e passou a ser uma grelha de cartões
 *
 * A lista era compacta e lia-se bem, mas **não tinha onde pôr uma fotografia** —
 * e era a única secção da página que destoava das outras, que já eram cartões.
 * A grelha resolve as duas coisas.
 *
 * O que a impede de ocupar a página inteira é o cartão ser **deliberadamente
 * mais pequeno** do que o dos produtos de encomenda: fotografia quadrada, sem
 * resumo, e cinco colunas em ecrã largo contra três. São setenta contra doze.
 * Ver `CartaoArtigo`.
 *
 * ⚠️ **A ordem é a das cartas e a do impresso**, e não alfabética nem por preço:
 * é a mesma ordem da página da ementa, e quem vem de lá encontra as coisas onde
 * as deixou.
 *
 * Os artigos chegam já filtrados — os da ementa que estão à venda online — e
 * pela ordem do catálogo. As cartas e as categorias saem da ordem em que
 * aparecem nessa lista, que é a ordem do impresso.
 */
export function EmentaEncomendavel({
  artigos,
  locale,
}: {
  artigos: Produto[];
  locale: Locale;
}) {
  const t = useTranslations("encomendas.daEmenta");
  const te = useTranslations("ementa");

  return (
    /* ⚠️ **O `id="da-ementa"` passou do `<h2>` para a `<section>`**, com o
       mesmo valor: o índice do herói e o menu do cabeçalho continuam a saltar
       para `#da-ementa`. O `<h2>` passou a viver num título colado, e um salto
       para um elemento colado aterra onde ele está colado — que, com a secção já
       passada, é o fundo dela. */
    <section
      id="da-ementa"
      aria-labelledby="da-ementa-titulo"
      className="ancora-rente seccao seccao-minimizavel"
    >
      <details open data-seccao className="group/seccao">
        <TituloDaSeccao id="da-ementa-titulo" titulo={t("titulo")} fundo="bg-papel" />

        <div className="envolvente">
          <p className="mt-1 max-w-[52ch] text-tinta-suave">{t("texto")}</p>

          {/* ⚠️ **O aviso do mínimo vem antes da grelha e não depois.** Depois
              chega tarde: nessa altura a pessoa já juntou, já se enganou na
              expectativa, e o que lê parece letra pequena a desdizer o que acabou
              de fazer. */}
          <p className="mt-5 max-w-[52ch] rounded-xl border border-tijolo/30 bg-tijolo/5 px-5 py-4 text-sm">
            {t("aviso")}
          </p>

          <div className="mt-12 space-y-14">
            {porOrdemDeAparecer(artigos.map((a) => a.carta!)).map((carta) => (
              <div key={carta}>
                <h3 className="titulo-display titulo-gama text-tijolo">
                  {te(`cartas.${carta}.curto`)}
                </h3>

                <div className="mt-6 space-y-8">
                  {porOrdemDeAparecer(
                    artigos.filter((a) => a.carta === carta).map((a) => a.categoria!),
                  ).map((categoria) => (
                    <details key={categoria} open className="group/categoria">
                      {/* O título da categoria cola-se por baixo do da secção
                          (`.titulo-fixo-categoria`) e abre e fecha a categoria,
                          como o da secção abre e fecha a secção.

                          ⚠️ **Leva o nome da carta à frente**: há «Doces» na
                          carta da casa e na vegan, e colado no topo, com o
                          título da carta já fora do ecrã, «Doces» não dizia
                          quais (é a armadilha 8 vista de cima). */}
                      <summary className="titulo-fixo-categoria group/sumario flex cursor-pointer list-none items-center justify-between gap-3 border-b border-tinta/15 bg-papel py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">
                            <span className="text-tijolo">
                              {te(`cartas.${carta}.curto`)}
                            </span>
                            {/* O ponto é para os olhos; o leitor de ecrã ouve
                                uma vírgula, que é uma pausa, em vez de «ponto». */}
                            <span aria-hidden> · </span>
                            <span className="sr-only">, </span>
                            {te(`categorias.${categoria}`)}
                          </h4>
                          {/* ⚠️ **A regra vive aqui e não em cada cartão.**
                              Escrita artigo a artigo, «mínimo 12 unidades»
                              aparecia setenta vezes na mesma página — e um aviso
                              repetido setenta vezes deixa de se ler ao fim da
                              terceira. A regra é **da categoria** (ver
                              `encomendavel.ts`), portanto é no título da
                              categoria que ela é verdadeira uma só vez — e,
                              colada, continua à vista enquanto se escolhe. */}
                          <p className="mt-1 text-sm text-tinta-suave">
                            {regraDaCategoria(artigos, categoria, t)}
                          </p>
                        </div>
                        <SetaMinimizar grupo="categoria" pequena />
                      </summary>

                      {/* Duas colunas no telemóvel e seis num monitor: o cartão
                          é estreito de propósito, e a secção tem setenta deles. */}
                      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {porCategoria(artigos, carta, categoria).map((artigo) => (
                          <CartaoArtigo
                            key={artigo.id}
                            artigo={artigo}
                            locale={locale}
                          />
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

/**
 * A regra de uma categoria, escrita.
 *
 * Lê a regra do **primeiro artigo** da categoria em vez de a ir buscar à tabela
 * directamente: assim, se um dia a regra passar a depender do artigo e não só da
 * categoria, isto deixa de estar certo por acaso e passa a estar errado de forma
 * visível — que é melhor do que continuar a mostrar uma regra desactualizada com
 * ar de verdade.
 */
function regraDaCategoria(
  artigos: readonly Produto[],
  categoria: string,
  t: (chave: string, valores?: Record<string, string | number>) => string,
): string {
  const artigo = artigos.find((a) => a.categoria === categoria);
  const regra = artigo ? regraDe(artigo) : null;
  if (!artigo || !regra) return "";
  return artigo.unidade === "kg"
    ? t("regraKg", { minimo: regra.minimo })
    : t("regraUn", { minimo: regra.minimo, passo: regra.passo });
}

/** Cada valor uma vez, pela ordem em que aparece. */
const porOrdemDeAparecer = (valores: readonly string[]): string[] => [...new Set(valores)];

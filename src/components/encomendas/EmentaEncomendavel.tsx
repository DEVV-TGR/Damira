import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { cartasComArtigos, categoriasDaCarta, porCategoria, regraDe } from "@/lib/vista";
import { CartaoArtigo } from "./CartaoArtigo";
import { SetaMinimizar } from "./SetaMinimizar";
import { TituloDaSeccao, TituloParaLeitores } from "./TituloDaSeccao";

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
 * ⚠️ **A ordem é a mesma da página da ementa**, e quem vem de lá encontra as
 * coisas onde as deixou.
 *
 * Os artigos chegam já filtrados — os da ementa que estão à venda online — e já
 * ordenados pelo `listarProdutos` (#87): dentro de cada categoria, por ordem
 * alfabética. ⚠️ **As cartas e as categorias saem da `ordem` da gerente, pelas
 * mesmas funções da `/ementa`** (`cartasComArtigos`, `categoriasDaCarta`), e não
 * da sequência em que os artigos chegaram. As duas davam o mesmo, mas só porque
 * o `listarProdutos` ordena hoje como ordena; com a mesma função nos dois sítios
 * é garantido. E uma categoria que não esteja na ordem fica de fora nas duas
 * páginas, e não só numa — a entrada já a recusa (`json-painel.ts`).
 */
export function EmentaEncomendavel({
  artigos,
  ordem,
  locale,
}: {
  artigos: Produto[];
  ordem: OrdemEmenta;
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
      <TituloParaLeitores id="da-ementa-titulo" nivel={2}>
        {t("titulo")}
      </TituloParaLeitores>
      <details open data-seccao className="group/seccao">
        <TituloDaSeccao titulo={t("titulo")} fundo="bg-papel" />

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
            {cartasComArtigos(artigos, ordem).map((carta) => (
              <div key={carta}>
                <h3 className="titulo-display titulo-gama text-tijolo">
                  {te(`cartas.${carta}.curto`)}
                </h3>

                <div className="mt-6 space-y-8">
                  {categoriasDaCarta(artigos, ordem, carta).map((categoria) => (
                    <div key={categoria}>
                      <TituloParaLeitores nivel={4}>
                        {te(`cartas.${carta}.curto`)}, {te(`categorias.${categoria}`)}
                      </TituloParaLeitores>
                      <details open data-categoria className="group/categoria">
                        {/* O título da categoria cola-se por baixo do da secção
                            (`.titulo-fixo-categoria`) e abre e fecha a categoria,
                            como o da secção abre e fecha a secção.

                            ⚠️ **Leva o nome da carta à frente**: há «Doces» na
                            carta da casa e na vegan, e colado no topo, com o
                            título da carta já fora do ecrã, «Doces» não dizia
                            quais (é a armadilha 8 vista de cima). */}
                        <summary className="titulo-fixo-categoria group/sumario flex cursor-pointer list-none items-center justify-between gap-3 border-b border-tinta/15 bg-papel py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0">
                            {/* Um `<p>` e não um `<h4>`: dentro do `<summary>`
                                o título saía da lista de títulos (ver o
                                `TituloDaSeccao`). O `<h4>` está antes do
                                `<details>`, para os leitores de ecrã. */}
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">
                              <span className="text-tijolo">
                                {te(`cartas.${carta}.curto`)}
                              </span>
                              {/* O ponto é para os olhos; o leitor de ecrã ouve
                                  uma vírgula, que é uma pausa, em vez de «ponto». */}
                              <span aria-hidden> · </span>
                              <span className="sr-only">, </span>
                              {te(`categorias.${categoria}`)}
                            </p>
                            {/* ⚠️ **A regra vive aqui e não em cada cartão.**
                                Escrita artigo a artigo, «mínimo 12 unidades»
                                aparecia setenta vezes na mesma página — e um aviso
                                repetido setenta vezes deixa de se ler ao fim da
                                terceira. A regra é **da categoria** (ver
                                `encomendavel.ts`), portanto é no título da
                                categoria que ela é verdadeira uma só vez — e,
                                colada, continua à vista enquanto se escolhe. */}
                            <p className="mt-1 text-sm text-tinta-suave">
                              {regraDaCategoria(porCategoria(artigos, carta, categoria), t)}
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
                    </div>
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
  /** Os artigos da categoria **nesta carta**: há «doces» na da casa e na vegan,
      e o mínimo é de cada artigo desde #40 — o primeiro doce da casa não diz o
      mínimo dos doces vegan. */
  artigosDaCategoria: readonly Produto[],
  t: (chave: string, valores?: Record<string, string | number>) => string,
): string {
  const artigo = artigosDaCategoria[0];
  const regra = artigo ? regraDe(artigo) : null;
  if (!artigo || !regra) return "";
  return artigo.unidade === "kg"
    ? t("regraKg", { minimo: regra.minimo })
    : t("regraUn", { minimo: regra.minimo, passo: regra.passo });
}

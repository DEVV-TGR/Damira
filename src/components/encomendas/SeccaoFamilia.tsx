import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Produto } from "@/lib/dados/tipos";
import { emLingua, GRELHA_CARTOES, porOrdemAlfabetica, regraDe, type FamiliaComProdutos } from "@/lib/vista";
import { CartaoArtigo } from "./CartaoArtigo";
import { CartaoProduto } from "./CartaoProduto";
import { SetaMinimizar } from "./SetaMinimizar";
import { TituloDaSeccao, TituloParaLeitores } from "./TituloDaSeccao";

/**
 * # Uma família da `/encomendas` (pedido de 26/11)
 *
 * Desde 26/11 as secções da página **são as famílias da gerente**, pela ordem
 * dela — Kit Festas, Bolo e mesa decorada, Boxes, Da carta, Natal… —, e dentro
 * de cada uma as categorias dela. Antes eram quatro blocos escritos no código
 * (três `Familia` e a `EmentaEncomendavel`), e o Natal não tinha onde entrar.
 * Juntou as duas: o mesmo cartão e a mesma grelha já eram de todos desde 25/11.
 *
 * - **O `id` da família é a âncora**, e as de partida são as de antes
 *   (`#festas`, `#da-ementa`…): o cabeçalho, o rodapé e a página inicial
 *   continuam a saltar para o mesmo sítio. As categorias não têm `id` (a
 *   armadilha 8: duas com o mesmo nome em famílias diferentes).
 * - **O cartão é o do produto**: um artigo da carta (`familia: "ementa"`) leva
 *   o `CartaoArtigo`, com o botão compacto; um kit, um bolo ou uma box, o
 *   `CartaoProduto`, que leva à página dele. Os dois cabem na mesma grelha.
 * - **O título da categoria só aparece se disser alguma coisa**: com mais de uma
 *   categoria, ou quando leva a quantidade mínima. Um «Kit Festas» debaixo de
 *   «Kit Festas» era a mesma palavra duas vezes.
 * - **O texto de cada família vem de `messages/*.json`** só para as quatro de
 *   partida. Uma família nova não tem texto — o nome chega; inventar uma frase
 *   para o Natal era pôr o site a falar pela casa.
 */

/* Os textos das famílias de partida, pelo id (`messages/*.json` › `encomendas`). */
const TEXTOS: Record<string, string> = {
  festas: "festas.texto",
  "kits-bolo": "kitsBolo.texto",
  boxes: "boxes.texto",
  "da-ementa": "daEmenta.texto",
};

export function SeccaoFamilia({
  dados,
  locale,
  fundo,
}: {
  dados: FamiliaComProdutos;
  locale: Locale;
  fundo: "papel" | "claro";
}) {
  const t = useTranslations("encomendas");
  const { familia, categorias } = dados;
  const titulo = emLingua(familia.nome, locale);
  const texto = TEXTOS[familia.id];
  const fundoDoTitulo = fundo === "claro" ? "bg-papel-fundo" : "bg-papel";
  const comTitulos = categorias.length > 1;

  return (
    /* ⚠️ O `id` vive na `<section>` e não no título, que é colado (armadilha 22). */
    <section
      id={familia.id}
      aria-labelledby={`${familia.id}-titulo`}
      className={`ancora-rente seccao seccao-minimizavel ${fundo === "claro" ? "bg-papel-fundo" : ""}`}
      data-grupo-procura
    >
      <TituloParaLeitores id={`${familia.id}-titulo`} nivel={2}>
        {titulo}
      </TituloParaLeitores>
      <details open data-seccao className="group/seccao">
        <TituloDaSeccao titulo={titulo} fundo={fundoDoTitulo} />

        <div className="envolvente">
          {texto && <p className="mt-1 max-w-[52ch] text-tinta-suave">{t(texto)}</p>}

          {/* ⚠️ **O aviso do mínimo vem antes da grelha e não depois** (era da
              «Da carta», e continua a ser dela). Depois chega tarde: a pessoa
              já juntou, e o que lê parece letra pequena a desdizer o que fez. */}
          {familia.id === "da-ementa" && (
            <p className="mt-5 max-w-[52ch] rounded-xl border border-tijolo/30 bg-tijolo/5 px-5 py-4 text-sm">
              {t("daEmenta.aviso")}
            </p>
          )}

          <div className="mt-12 space-y-8">
            {categorias.map(({ categoria, produtos }) => {
              const ordenados = porOrdemAlfabetica(produtos, locale);
              const regra = regraDaCategoria(ordenados, t);
              const grelha = (
                <ul className={`${comTitulos || regra ? "mt-4" : ""} ${GRELHA_CARTOES}`}>
                  {ordenados.map((produto) =>
                    produto.familia === "ementa" ? (
                      <CartaoArtigo key={produto.id} artigo={produto} locale={locale} />
                    ) : (
                      <CartaoProduto key={produto.id} produto={produto} locale={locale} />
                    ),
                  )}
                </ul>
              );
              const nome = emLingua(categoria.nome, locale);
              if (!comTitulos && !regra) return <div key={categoria.id} data-grupo-procura>{grelha}</div>;
              return (
                <div key={categoria.id} data-grupo-procura>
                  {/* O `<h3>` vai antes do `<details>`: dentro do `<summary>` saía
                      da lista de títulos (armadilha 23). */}
                  <TituloParaLeitores nivel={3}>
                    {titulo}, {nome}
                  </TituloParaLeitores>
                  <details open data-categoria className="group/categoria">
                    {/* Colado por baixo do da família, e leva-a à frente: colado
                        no topo, com o título da família já fora do ecrã, «Doces»
                        não dizia de onde (a armadilha 8 vista de cima). */}
                    <summary
                      className={`titulo-fixo-categoria group/sumario flex cursor-pointer list-none items-center justify-between gap-3 border-b border-tinta/15 ${fundoDoTitulo} py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo [&::-webkit-details-marker]:hidden`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">
                          <span className="text-tijolo">{titulo}</span>
                          {/* O ponto é para os olhos; o leitor de ecrã ouve uma vírgula. */}
                          <span aria-hidden> · </span>
                          <span className="sr-only">, </span>
                          {nome}
                        </p>
                        {/* ⚠️ **A regra vive aqui e não em cada cartão**: setenta
                            «mínimo 12 unidades» deixam de se ler à terceira. E,
                            colada, continua à vista enquanto se escolhe. */}
                        {regra && <p className="mt-1 text-sm text-tinta-suave">{regra}</p>}
                      </div>
                      <SetaMinimizar grupo="categoria" pequena />
                    </summary>
                    {grelha}
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}

/**
 * A quantidade mínima de uma categoria, escrita — **só se for a mesma em todos
 * os artigos dela, e todos forem da carta**. Antes lia-se do primeiro artigo; com
 * a gerente a pôr o que quiser em cada categoria, um mínimo lido de um só era
 * dizer «à dúzia» por cima de um bolo que se vende inteiro. Sem regra comum,
 * não se escreve nada: o botão de cada cartão já junta o mínimo dele, e o
 * cesto não deixa descer abaixo. ⚠️ É uma perda de informação à vista, e não
 * um erro — se a casa misturar mínimos numa categoria, o mínimo passa a só se
 * ver no cesto.
 */
function regraDaCategoria(
  produtos: readonly Produto[],
  t: (chave: string, valores?: Record<string, string | number>) => string,
): string | null {
  if (produtos.length === 0 || produtos.some((p) => p.familia !== "ementa")) return null;
  const regras = produtos.map((p) => ({ regra: regraDe(p), unidade: p.unidade }));
  const [primeira] = regras;
  if (!primeira.regra) return null;
  const igual = regras.every(
    (r) =>
      r.unidade === primeira.unidade &&
      r.regra?.minimo === primeira.regra!.minimo &&
      r.regra?.passo === primeira.regra!.passo,
  );
  if (!igual) return null;
  return primeira.unidade === "kg"
    ? t("daEmenta.regraKg", { minimo: primeira.regra.minimo })
    : t("daEmenta.regraUn", { minimo: primeira.regra.minimo, passo: primeira.regra.passo });
}

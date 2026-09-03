import { useTranslations } from "next-intl";
import type { Carta, Categoria } from "@/data/ementa";
import {
  artigosEncomendaveis,
  cartasEncomendaveis,
  categoriasEncomendaveis,
  daCartaECategoria,
  regraDe,
} from "@/lib/encomendavel";
import type { Locale } from "@/i18n/routing";
import { CartaoArtigo } from "./CartaoArtigo";

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
 */
export function EmentaEncomendavel({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.daEmenta");
  const te = useTranslations("ementa");

  return (
    <section aria-labelledby="da-ementa" className="seccao">
      <div className="envolvente">
        <h2
          id="da-ementa"
          className="scroll-mt-24 titulo-display titulo-beta max-w-[18ch]"
        >
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[52ch] text-tinta-suave">{t("texto")}</p>

        {/* ⚠️ **O aviso do mínimo vem antes da grelha e não depois.** Depois
            chega tarde: nessa altura a pessoa já juntou, já se enganou na
            expectativa, e o que lê parece letra pequena a desdizer o que acabou
            de fazer. */}
        <p className="mt-5 max-w-[52ch] rounded-xl border border-tijolo/30 bg-tijolo/5 px-5 py-4 text-sm">
          {t("aviso")}
        </p>

        <div className="mt-12 space-y-14">
          {cartasEncomendaveis().map((carta) => (
            <div key={carta}>
              <h3 className="titulo-display titulo-gama text-tijolo">
                {te(`cartas.${carta as Carta}.curto`)}
              </h3>

              <div className="mt-6 space-y-10">
                {categoriasEncomendaveis(carta).map((categoria) => (
                  <div key={categoria}>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">
                      {te(`categorias.${categoria as Categoria}`)}
                    </h4>
                    {/* ⚠️ **A regra vive aqui e não em cada cartão.** Escrita
                        artigo a artigo, «mínimo 12 unidades» aparecia setenta
                        vezes na mesma página — e um aviso repetido setenta vezes
                        deixa de se ler ao fim da terceira. A regra é **da
                        categoria** (ver `encomendavel.ts`), portanto é no título
                        da categoria que ela é verdadeira uma só vez. */}
                    <p className="mt-1 text-sm text-tinta-suave">
                      {regraDaCategoria(categoria, t)}
                    </p>

                    {/* Duas colunas no telemóvel e seis num monitor: o cartão é
                        estreito de propósito, e a secção tem setenta deles. */}
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {daCartaECategoria(carta, categoria).map((artigo) => (
                        <CartaoArtigo
                          key={artigo.id}
                          artigo={artigo}
                          locale={locale}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
  categoria: Categoria,
  t: (chave: string, valores?: Record<string, string | number>) => string,
): string {
  const artigo = artigosEncomendaveis().find((a) => a.categoria === categoria);
  const regra = artigo ? regraDe(artigo) : null;
  if (!artigo || !regra) return "";
  return artigo.unidade === "kg"
    ? t("regraKg", { minimo: regra.minimo })
    : t("regraUn", { minimo: regra.minimo, passo: regra.passo });
}

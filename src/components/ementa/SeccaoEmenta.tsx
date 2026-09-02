import { useTranslations } from "next-intl";
import {
  SUBCATEGORIAS,
  type Artigo,
  type Carta,
  type Categoria,
} from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { ArtigoCompacto, ArtigoEmenta } from "./ArtigoEmenta";

/**
 * As categorias que se leem como lista de preços, e não como descrição de prato.
 *
 * São as que no impresso são só nome e preço: as bebidas, os doces vegan (que
 * são vinte e três linhas de nome e número) e os bolos inteiros.
 */
const COMPACTAS: readonly Categoria[] = ["bebidas", "bolos-inteiros"];

export function SeccaoEmenta({
  carta,
  categoria,
  artigos,
  locale,
  aoAbrir,
}: {
  carta: Carta;
  categoria: Categoria;
  /* ⚠️ **Já vêm filtrados de cima.** A secção não sabe se há procura activa e
     não tem de saber: recebe a lista que lhe cabe mostrar. Filtrar aqui dentro
     fazia catorze secções repetirem o mesmo trabalho e obrigava cada uma a
     descobrir que estava vazia **depois** de já ter escrito o título. */
  artigos: Artigo[];
  locale: Locale;
  aoAbrir: (artigo: Artigo) => void;
}) {
  const t = useTranslations("ementa");

  /* Os doces vegan são 23 linhas de nome e preço, sem descrição nenhuma; os
     doces da casa têm todos frase. A mesma categoria em duas cartas pede
     tratamentos diferentes, e o que decide é o que os artigos têm — não uma
     lista de exceções escrita à mão. */
  const compacta =
    COMPACTAS.includes(categoria) || artigos.every((a) => a.descricao === null);

  /* A âncora tem de incluir a carta: `doces` existe na carta da casa **e** na
     vegan, e duas âncoras iguais deixavam uma delas inalcançável. */
  const ancora = `${carta}-${categoria}`;

  return (
    <section
      id={ancora}
      aria-labelledby={`titulo-${ancora}`}
      className="relative scroll-mt-[13.5rem] py-[clamp(2rem,4vw,3.5rem)]"
    >
      <div className="envolvente relative">
        {/* ⚠️ **Aqui esteve um "01", "02", "03" antes do título**, e saiu porque
            não numerava nada: a contagem reinicia em cada carta, por isso a
            mesma página mostrava quatro secções "02" — uma por carta. Um número
            que se repete não serve para referir ("vê no 02" não diz qual), e
            estava `aria-hidden`, ou seja, já assumido como não-informação.

            O que ancora a secção é o filete por baixo do título. Passou a
            **tijolo** e ganhou a contagem ao lado: são duas coisas pequenas que
            dão à página o que ela não tinha — cor no corpo, e a dimensão de cada
            secção antes de se começar a ler. */}
        <div className="flex items-baseline gap-4 border-b-2 border-tijolo pb-3">
          <h2
            id={`titulo-${ancora}`}
            className="titulo-display titulo-gama uppercase"
            style={{ fontVariationSettings: '"wdth" 70, "opsz" 40' }}
          >
            {t(`categorias.${categoria}`)}
          </h2>
          <span className="ml-auto shrink-0 text-xs tabular-nums uppercase tracking-widest text-tinta-suave">
            {t("quantosArtigos", { n: artigos.length })}
          </span>
        </div>

        {categoria === "bebidas" ? (
          /* Vinte e cinco bebidas em quatro grupos. Numa lista corrida ia-se do
             café ao milkshake sem perceber onde acabou um e começou o outro.

             ⚠️ Os grupos saem **dos artigos que chegaram**, e não do catálogo
             inteiro: com uma procura activa, ir buscar `porSubcategoria()` ao
             conjunto todo voltava a mostrar as bebidas que o filtro tinha
             acabado de excluir. */
          <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {SUBCATEGORIAS.filter((sub) =>
              artigos.some((a) => a.subcategoria === sub),
            ).map((sub) => (
              <div key={sub}>
                <h3 className="titulo-display text-xs uppercase tracking-[0.2em] text-tijolo">
                  {t(`subcategorias.${sub}`)}
                </h3>
                <ul className="mt-2">
                  {artigos
                    .filter((a) => a.subcategoria === sub)
                    .map((artigo) => (
                      <ArtigoCompacto
                        key={artigo.id}
                        artigo={artigo}
                        locale={locale}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : compacta ? (
          <ul className="mt-8 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {artigos.map((artigo) => (
              <ArtigoCompacto key={artigo.id} artigo={artigo} locale={locale} />
            ))}
          </ul>
        ) : (
          <ul className="mt-4 grid gap-x-14 sm:grid-cols-2">
            {artigos.map((artigo) => (
              <ArtigoEmenta
                key={artigo.id}
                artigo={artigo}
                locale={locale}
                aoAbrir={aoAbrir}
              />
            ))}
          </ul>
        )}

        {/* Notas coladas à secção a que dizem respeito, e não perdidas no rodapé
            da página. As duas são do impresso: a das palhinhas está no cabeçalho
            das bebidas, a dos sabores no rodapé dos doces. */}
        {categoria === "bebidas" && (
          <p className="mt-7 max-w-[60ch] text-sm opacity-75">{t("notas.palhinhas")}</p>
        )}
        {carta === "casa" && categoria === "doces" && (
          <p className="mt-7 max-w-[60ch] text-sm opacity-75">{t("notas.sabores")}</p>
        )}
        {carta === "casa" && categoria === "salgados" && (
          <p className="mt-7 max-w-[60ch] text-sm opacity-75">{t("notas.batata")}</p>
        )}
      </div>
    </section>
  );
}

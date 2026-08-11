import { useTranslations } from "next-intl";
import {
  porCategoria,
  porSubcategoria,
  subcategoriasComArtigos,
  type Categoria,
} from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { ArtigoCompacto, ArtigoEmenta } from "./ArtigoEmenta";

/**
 * As categorias que se leem como lista de preços, e não como descrição de prato.
 * São as mesmas do `SEM_DESCRICAO` em `src/data/ementa.ts`, pela mesma razão.
 */
const COMPACTAS: readonly Categoria[] = ["aperitivos", "extras", "bebidas"];

/**
 * Os fundos alternam pelas cores da marca, como as duas páginas A3 do impresso.
 *
 * Nenhum deles é o magenta: o magenta chapado com parágrafos de descrição em
 * cima não chega ao contraste mínimo (4,25:1 — ver `globals.css`), e num sítio
 * onde a informação **é** o produto isso não se negoceia. O magenta fica para os
 * títulos e para os selos, onde o tamanho o permite.
 */
const FUNDOS = ["bg-papel", "bloco-turquesa", "bg-papel", "bloco-coral"] as const;

export function SeccaoEmenta({
  categoria,
  indice,
  locale,
}: {
  categoria: Categoria;
  indice: number;
  locale: Locale;
}) {
  const t = useTranslations("ementa");
  const artigos = porCategoria(categoria);
  const compacta = COMPACTAS.includes(categoria);

  return (
    <section
      id={categoria}
      aria-labelledby={`titulo-${categoria}`}
      className={`${FUNDOS[indice % FUNDOS.length]} scroll-mt-32 py-14`}
    >
      <div className="mx-auto max-w-6xl px-5">
        <h2
          id={`titulo-${categoria}`}
          className="titulo-display text-4xl sm:text-5xl"
        >
          {t(`categorias.${categoria}`)}
        </h2>
        <div className="mt-3 h-1 w-24 bg-magenta" />

        {categoria === "bebidas" ? (
          /* As bebidas são 47 artigos em onze grupos. Numa lista corrida ia-se
             do café à sangria sem perceber onde acabou um e começou o outro. */
          <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {subcategoriasComArtigos().map((sub) => (
              <div key={sub} className="break-inside-avoid">
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  {t(`subcategorias.${sub}`)}
                </h3>
                <ul className="mt-2">
                  {porSubcategoria(sub).map((artigo) => (
                    <ArtigoCompacto key={artigo.id} artigo={artigo} locale={locale} />
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
          <ul className="mt-6 grid gap-x-12 divide-y divide-current/15 sm:grid-cols-2 sm:divide-y-0">
            {artigos.map((artigo) => (
              <ArtigoEmenta key={artigo.id} artigo={artigo} locale={locale} />
            ))}
          </ul>
        )}

        {/* A nota do menu infantil é um compromisso com o cliente e vive colada
            à secção a que diz respeito, não perdida no rodapé da página. */}
        {categoria === "menu-infantil" && (
          <p className="mt-6 max-w-[60ch] text-sm opacity-80">
            {t("notas.infantil")}
          </p>
        )}
      </div>
    </section>
  );
}

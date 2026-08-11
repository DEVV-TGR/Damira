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
 * **A única secção escura da ementa**, e faz sentido que seja esta: chama-se
 * "Para os Corajosos" e são os hambúrgueres de 320, 480 e 640 gramas. Uma
 * página inteira de listas em papel precisa de um momento que a quebre, e o
 * sítio certo para o pôr é aquele onde a carta já está a levantar a voz.
 */
const SECCAO_DRAMATICA: Categoria = "para-os-corajosos";

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
  const escura = categoria === SECCAO_DRAMATICA;

  /* Fundo alternado para separar secções sem lhes pôr uma linha entre elas —
     duas variações de papel chegam, e é o que mantém a leitura calma ao longo
     de cento e vinte e dois artigos. */
  const fundo = escura
    ? "bg-tinta text-papel"
    : indice % 2 === 0
      ? "bg-papel"
      : "bg-papel-fundo";

  return (
    <section
      id={categoria}
      aria-labelledby={`titulo-${categoria}`}
      className={`${fundo} scroll-mt-32 py-[clamp(3.5rem,7vw,6rem)]`}
    >
      <div className="envolvente">
        <div className="flex items-baseline gap-5">
          <span
            aria-hidden
            className={`titulo-display text-sm tabular-nums ${escura ? "text-papel/40" : "text-magenta-forte"}`}
          >
            {String(indice + 1).padStart(2, "0")}
          </span>
          <h2
            id={`titulo-${categoria}`}
            className="titulo-display text-[clamp(2rem,4.5vw,3.25rem)]"
          >
            {t(`categorias.${categoria}`)}
          </h2>
        </div>

        {categoria === "bebidas" ? (
          /* As bebidas são 47 artigos em onze grupos. Numa lista corrida ia-se
             do café à sangria sem perceber onde acabou um e começou o outro. */
          <div className="mt-10 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {subcategoriasComArtigos().map((sub) => (
              <div key={sub}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                  {t(`subcategorias.${sub}`)}
                </h3>
                <ul className="mt-3">
                  {porSubcategoria(sub).map((artigo) => (
                    <ArtigoCompacto key={artigo.id} artigo={artigo} locale={locale} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : compacta ? (
          <ul className="mt-10 grid gap-x-14 sm:grid-cols-2 lg:grid-cols-3">
            {artigos.map((artigo) => (
              <ArtigoCompacto key={artigo.id} artigo={artigo} locale={locale} />
            ))}
          </ul>
        ) : (
          <ul className="mt-8 grid gap-x-16 sm:grid-cols-2">
            {artigos.map((artigo) => (
              <ArtigoEmenta key={artigo.id} artigo={artigo} locale={locale} />
            ))}
          </ul>
        )}

        {/* A nota do menu infantil é um compromisso com o cliente e vive colada
            à secção a que diz respeito, não perdida no rodapé da página. */}
        {categoria === "menu-infantil" && (
          <p className="mt-8 max-w-[60ch] text-sm text-tinta-suave">
            {t("notas.infantil")}
          </p>
        )}
      </div>
    </section>
  );
}

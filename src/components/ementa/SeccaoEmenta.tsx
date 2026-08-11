import { useTranslations } from "next-intl";
import {
  porCategoria,
  porSubcategoria,
  subcategoriasComArtigos,
  type Artigo,
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
 * Os fundos chapados a alternar, como as duas páginas A3 do impresso.
 *
 * ⚠️ **O pastiche copia as cores e a densidade do impresso, não as combinações
 * de texto.** No papel, o menu escreve branco sobre coral; no ecrã isso dá 2,17:1
 * e é ilegível. Por isso sobre coral e turquesa vai tinta, e o "magenta" aqui é
 * o tom escuro — o da marca não chega aos 4,5:1 para texto pequeno, e uma secção
 * inteira de artigos é texto pequeno. A tabela está em `globals.css`.
 */
const FACES = [
  "bloco-turquesa",
  "bg-papel text-tinta",
  "bloco-magenta-texto",
  "bloco-coral",
] as const;

/** Um traço do impresso por secção, a decorar a margem, como no A3. */
const TRACOS = ["hamburguer", "taca", "logotipo"] as const;

export function SeccaoEmenta({
  categoria,
  indice,
  locale,
  aoAbrir,
}: {
  categoria: Categoria;
  indice: number;
  locale: Locale;
  aoAbrir: (artigo: Artigo) => void;
}) {
  const t = useTranslations("ementa");
  const artigos = porCategoria(categoria);
  const compacta = COMPACTAS.includes(categoria);
  const traco = TRACOS[indice % TRACOS.length];

  return (
    <section
      id={categoria}
      aria-labelledby={`titulo-${categoria}`}
      className={`relative scroll-mt-32 overflow-hidden py-[clamp(3rem,6vw,5rem)] ${FACES[indice % FACES.length]}`}
    >
      <span
        aria-hidden
        className="traco pointer-events-none absolute -right-16 top-8 hidden size-72 opacity-[0.09] lg:block"
        style={{
          maskImage: `url(/tracos/${traco}.png)`,
          WebkitMaskImage: `url(/tracos/${traco}.png)`,
        }}
      />

      <div className="envolvente relative">
        <div className="flex items-baseline gap-4 border-b-2 border-current pb-3">
          <span aria-hidden className="titulo-display text-sm tabular-nums opacity-60">
            {String(indice + 1).padStart(2, "0")}
          </span>
          <h2
            id={`titulo-${categoria}`}
            className="titulo-display text-[clamp(1.75rem,4vw,2.75rem)] uppercase"
            style={{ fontVariationSettings: '"wdth" 70, "opsz" 40' }}
          >
            {t(`categorias.${categoria}`)}
          </h2>
        </div>

        {categoria === "bebidas" ? (
          /* As bebidas são 47 artigos em onze grupos. Numa lista corrida ia-se
             do café à sangria sem perceber onde acabou um e começou o outro. */
          <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {subcategoriasComArtigos().map((sub) => (
              <div key={sub}>
                <h3 className="titulo-display text-xs uppercase tracking-[0.2em]">
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

        {/* A nota do menu infantil é um compromisso com o cliente e vive colada
            à secção a que diz respeito, não perdida no rodapé da página. */}
        {categoria === "menu-infantil" && (
          <p className="mt-7 max-w-[60ch] text-sm opacity-80">{t("notas.infantil")}</p>
        )}
      </div>
    </section>
  );
}

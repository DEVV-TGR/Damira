import { useTranslations } from "next-intl";
import type { Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { EtiquetaPao, EtiquetaVegetariano, SeloBestSeller } from "./Etiquetas";

/**
 * O nome a mostrar. Os santos ficam como estão nas duas línguas; só os artigos
 * de nome comum (extras, bebidas, aperitivos) têm versão inglesa. Ver o
 * `superRefine` em `src/data/ementa.ts`.
 */
const nomeVisivel = (artigo: Artigo, locale: Locale) =>
  locale === "en" && artigo.nomeEn ? artigo.nomeEn : artigo.nome;

/**
 * Artigo com descrição — os santos, as saladas, as sobremesas.
 */
export function ArtigoEmenta({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  const t = useTranslations("ementa.variantes");

  return (
    <li id={artigo.id} className="scroll-mt-40 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-bold uppercase tracking-wide">
          {nomeVisivel(artigo, locale)}
        </h3>
        <span className="font-bold tabular-nums">
          {formatarPreco(artigo.preco, locale)}
        </span>
        {artigo.variantes?.map((variante) => (
          <span key={variante.chave} className="text-sm tabular-nums opacity-80">
            {t(variante.chave)} {formatarPreco(variante.preco, locale)}
          </span>
        ))}
      </div>

      {(artigo.bestSeller || artigo.vegetariano || artigo.paes.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {artigo.bestSeller && <SeloBestSeller />}
          {artigo.paes.map((pao) => (
            <EtiquetaPao key={pao} pao={pao} />
          ))}
          {artigo.vegetariano && <EtiquetaVegetariano />}
        </div>
      )}

      {artigo.descricao && (
        <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed opacity-90">
          {artigo.descricao[locale]}
        </p>
      )}
    </li>
  );
}

/**
 * Artigo sem descrição — extras, bebidas, aperitivos. Nome à esquerda, preço à
 * direita, e uma linha pontilhada a ligar os dois, que é como um menu se lê há
 * cem anos: o olho segue a linha e não salta de preço.
 */
export function ArtigoCompacto({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  return (
    <li id={artigo.id} className="flex scroll-mt-40 items-baseline gap-2 py-1">
      <span className="font-medium">{nomeVisivel(artigo, locale)}</span>
      {artigo.bestSeller && <SeloBestSeller />}
      <span
        aria-hidden
        className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-40"
      />
      <span className="font-bold tabular-nums">
        {formatarPreco(artigo.preco, locale)}
      </span>
    </li>
  );
}

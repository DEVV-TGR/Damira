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

/** Artigo com descrição — os santos, as saladas, as sobremesas. */
export function ArtigoEmenta({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  const t = useTranslations("ementa.variantes");

  return (
    <li id={artigo.id} className="scroll-mt-40 border-b border-current/10 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="titulo-display text-xl">{nomeVisivel(artigo, locale)}</h3>
        <span className="titulo-display shrink-0 text-xl tabular-nums">
          {formatarPreco(artigo.preco, locale)}
        </span>
      </div>

      {artigo.variantes && (
        <p className="mt-1 text-sm tabular-nums opacity-70">
          {artigo.variantes
            .map((v) => `${t(v.chave)} ${formatarPreco(v.preco, locale)}`)
            .join(" · ")}
        </p>
      )}

      {artigo.descricao && (
        <p className="mt-2.5 max-w-[54ch] text-sm leading-relaxed opacity-75">
          {artigo.descricao[locale]}
        </p>
      )}

      {(artigo.bestSeller || artigo.vegetariano || artigo.paes.length > 0) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {artigo.bestSeller && <SeloBestSeller />}
          {artigo.paes.map((pao) => (
            <EtiquetaPao key={pao} pao={pao} />
          ))}
          {artigo.vegetariano && <EtiquetaVegetariano />}
        </div>
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
    <li className="flex scroll-mt-40 items-baseline gap-2 py-1.5" id={artigo.id}>
      <span className="text-sm">{nomeVisivel(artigo, locale)}</span>
      {artigo.bestSeller && <SeloBestSeller />}
      <span
        aria-hidden
        className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-30"
      />
      <span className="text-sm font-semibold tabular-nums">
        {formatarPreco(artigo.preco, locale)}
      </span>
    </li>
  );
}

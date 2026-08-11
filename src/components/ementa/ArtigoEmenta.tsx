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
 *
 * É um `<button>` e não uma `<div>` com `onClick`: abre o painel de detalhe, e
 * isso faz dele um controlo. Assim entra na ordem de tabulação, responde ao
 * `Enter` e ao espaço e é anunciado como botão, sem `role` nem `tabIndex`
 * postiços.
 */
export function ArtigoEmenta({
  artigo,
  locale,
  aoAbrir,
}: {
  artigo: Artigo;
  locale: Locale;
  aoAbrir: (artigo: Artigo) => void;
}) {
  const t = useTranslations("ementa");

  return (
    <li id={artigo.id} className="scroll-mt-40 border-b border-current/15">
      <button
        type="button"
        onClick={() => aoAbrir(artigo)}
        aria-label={`${nomeVisivel(artigo, locale)} — ${t("abrir")}`}
        className="w-full cursor-pointer py-5 text-left transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <div className="flex items-baseline gap-2">
          <h3 className="titulo-display text-lg uppercase tracking-wide">
            {nomeVisivel(artigo, locale)}
          </h3>
          <span
            aria-hidden
            className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-40"
          />
          <span className="titulo-display shrink-0 tabular-nums">
            {formatarPreco(artigo.preco, locale)}
          </span>
        </div>

        {artigo.variantes && (
          <p className="mt-1 text-xs tabular-nums opacity-70">
            {artigo.variantes
              .map((v) => `${t(`variantes.${v.chave}`)} ${formatarPreco(v.preco, locale)}`)
              .join(" · ")}
          </p>
        )}

        {artigo.descricao && (
          <p className="mt-1.5 max-w-[46ch] text-sm leading-snug opacity-80">
            {artigo.descricao[locale]}
          </p>
        )}

        {(artigo.bestSeller || artigo.vegetariano || artigo.paes.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {artigo.bestSeller && <SeloBestSeller />}
            {artigo.paes.map((pao) => (
              <EtiquetaPao key={pao} pao={pao} />
            ))}
            {artigo.vegetariano && <EtiquetaVegetariano />}
          </div>
        )}
      </button>
    </li>
  );
}

/**
 * Artigo sem descrição — extras, bebidas, aperitivos. Nome à esquerda, preço à
 * direita, e uma linha pontilhada a ligar os dois, que é como um menu se lê há
 * cem anos: o olho segue a linha e não salta de preço.
 *
 * Não abre painel: não há o que mostrar além do que já ali está.
 */
export function ArtigoCompacto({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  return (
    <li className="flex scroll-mt-40 items-baseline gap-2 py-1" id={artigo.id}>
      <span className="text-sm">{nomeVisivel(artigo, locale)}</span>
      {artigo.bestSeller && <SeloBestSeller />}
      <span
        aria-hidden
        className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-40"
      />
      <span className="text-sm font-semibold tabular-nums">
        {formatarPreco(artigo.preco, locale)}
      </span>
    </li>
  );
}

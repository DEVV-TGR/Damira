import { useTranslations } from "next-intl";
import type { Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { EtiquetaVegan } from "./Etiquetas";

/**
 * O nome a mostrar. **Todos os artigos têm versão inglesa** — ao contrário do
 * Santo Burga, onde metade eram nomes de santos e não se traduziam. Ver o
 * `ementa.ts`.
 */
const nomeVisivel = (artigo: Artigo, locale: Locale) =>
  locale === "en" ? artigo.nomeEn : artigo.nome;

/**
 * O preço escrito por extenso, já com a unidade quando ela existe.
 *
 * ⚠️ **O `/kg` não é decoração.** Um bolo de bolacha da carta vegan são 17 € ao
 * quilo e um bolo inteiro pesa dois: escrever "17,00 €" ao lado dele anuncia
 * metade do preço, e o erro só aparece ao balcão, com o cliente à frente. Ver
 * `UNIDADES` em `ementa.ts`.
 */
function Preco({ artigo, locale }: { artigo: Artigo; locale: Locale }) {
  const t = useTranslations("ementa");

  if (artigo.preco === null) return null;

  return (
    <>
      {formatarPreco(artigo.preco, locale)}
      {artigo.unidade === "kg" && (
        <span className="text-xs font-normal opacity-70">
          {t("porQuilo")}
        </span>
      )}
    </>
  );
}

/**
 * Artigo com descrição — os salgados, os pratos, os doces da casa.
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
        /* O `active:` responde ao **carregar** e não ao largar. Num telemóvel
           não há `hover` nenhum (o Tailwind v4 já o fecha atrás de
           `@media (hover: hover)`), e entre o dedo tocar e a folha começar a
           subir passava um terço de segundo sem a linha dar sinal de ter
           ouvido. Não é uma animação: é a confirmação de que se acertou na
           linha certa. */
        className="w-full cursor-pointer py-5 text-left transition-opacity hover:opacity-70 active:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <div className="flex items-baseline gap-2">
          <h3 className="titulo-display text-lg uppercase tracking-wide">
            {nomeVisivel(artigo, locale)}
          </h3>
          <span
            aria-hidden
            className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-40"
          />
          {/* ⚠️ **O preço é a única coisa colorida do corpo da página.** Antes
              era tinta como tudo o resto, e numa lista de noventa e cinco linhas
              iguais o olho não tinha onde pousar: quem procura o preço lia o
              nome primeiro, linha a linha. O tijolo sobre papel dá 6,87:1 e
              passa a qualquer tamanho — não é decoração, é o índice da lista. */}
          <span className="titulo-display shrink-0 tabular-nums text-tijolo">
            <Preco artigo={artigo} locale={locale} />
          </span>
        </div>

        {artigo.variantes && (
          <p className="mt-1 text-xs tabular-nums opacity-70">
            {artigo.variantes
              .map((v) => `${v.chave} · ${formatarPreco(v.preco, locale)}`)
              .join("   ")}
          </p>
        )}

        {artigo.descricao && (
          <p className="mt-1.5 max-w-[46ch] text-sm leading-snug opacity-80">
            {artigo.descricao[locale]}
          </p>
        )}

        {artigo.sabores.length > 0 && (
          <p className="mt-1.5 max-w-[46ch] text-sm leading-snug opacity-70">
            {artigo.sabores.join(" · ")}
          </p>
        )}

        {artigo.vegan && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <EtiquetaVegan />
          </div>
        )}
      </button>
    </li>
  );
}

/**
 * Artigo sem descrição — as bebidas, os doces vegan à unidade. Nome à esquerda,
 * preço à direita, e uma linha pontilhada a ligar os dois, que é como um menu se
 * lê há cem anos: o olho segue a linha e não salta de preço.
 *
 * Não abre painel: não há o que mostrar além do que já ali está.
 *
 * ⚠️ **Os sabores continuam a aparecer aqui**, em linha por baixo. São a única
 * coisa que uma lista compacta não pode esconder: oito sabores de batido é a
 * informação toda daquele artigo, e escondê-los atrás de um clique que não
 * existe deixava-os invisíveis.
 */
export function ArtigoCompacto({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  return (
    <li className="scroll-mt-40 py-1" id={artigo.id}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm">{nomeVisivel(artigo, locale)}</span>
        <span
          aria-hidden
          className="min-w-4 flex-1 translate-y-[-0.25em] border-b border-dotted border-current opacity-40"
        />
        <span className="shrink-0 text-sm font-semibold tabular-nums text-tijolo">
          <Preco artigo={artigo} locale={locale} />
        </span>
      </div>
      {artigo.sabores.length > 0 && (
        <p className="max-w-[40ch] text-xs leading-snug opacity-65">
          {artigo.sabores.join(" · ")}
        </p>
      )}
    </li>
  );
}

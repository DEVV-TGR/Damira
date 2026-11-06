import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Produto } from "@/lib/dados/tipos";
import { formatarCent } from "@/lib/preco";
import { caminhoDoProduto, descricaoDe, fotoDe, nomeDe, precoMinimoCent } from "@/lib/vista";
import type { Locale } from "@/i18n/routing";
import { FotoProduto } from "./FotoProduto";

/**
 * Um produto numa grelha.
 *
 * ## ⚠️ O cartão inteiro é a ligação, e o botão de juntar saiu daqui
 *
 * Antes cada cartão trazia a lista de tudo o que o kit leva **e** um botão de
 * juntar ao pedido. Com onze produtos isso dava uma página de cinco ecrãs onde a
 * única coisa que distinguia dois cartões era um preço no meio de vinte linhas
 * de miudezas.
 *
 * Agora o cartão diz o mínimo — nome, preço, e o que é numa frase — e quem
 * quiser saber mais **abre o produto**. Juntar ao pedido acontece na página do
 * produto, que é onde se escolhe o escalão e se escreve a mensagem do bolo. Um
 * botão de juntar num cartão sem essas escolhas punha no cesto uma versão do
 * produto que ninguém configurou.
 *
 * ## ⚠️ Todos os cartões de uma linha têm a mesma altura (#83)
 *
 * Um nome de duas linhas ao lado de um de uma, ou um kit com frase ao lado de
 * uma box sem ela, davam cartões em degrau, com o preço a uma altura diferente
 * em cada um — e a comparação que a grelha existe para facilitar passava a ser
 * um exercício de leitura. Três peças, e as três fazem falta:
 *
 * 1. **o cartão estica**: o `<li>` estica até à altura da linha (é o que a
 *    grelha faz de origem) e a ligação enche-o com `h-full`;
 * 2. **a fotografia tem proporção fixa**, 4/3 — ⚠️ e não quadrada: num cartão, a
 *    altura de uma imagem quadrada **é** a largura da coluna (armadilha 18);
 * 3. **o nome e a frase têm um máximo de linhas** (`line-clamp`), e o preço e o
 *    «ver» encostam-se ao fundo com `mt-auto`. O texto cortado continua inteiro
 *    na página do produto, que é para onde o cartão leva, e inteiro para o
 *    leitor de ecrã, que lê o DOM e não o recorte.
 *
 * ## `desde` nos kits de festa
 *
 * ⚠️ Um kit de festa não tem um preço, tem três — 20, 40 ou 70 pessoas. Escrever
 * «180 €» ao lado do Kit Básico é anunciar o preço de vinte pessoas a quem
 * precisa de setenta e paga o triplo. Ver `precoMinimo`.
 */
export function CartaoProduto({
  produto,
  locale,
}: {
  produto: Produto;
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const preco = precoMinimoCent(produto);
  const nome = nomeDe(produto, locale);
  const resumo = descricaoDe(produto, locale);

  return (
    <li className="group h-full">
      <Link
        href={caminhoDoProduto(produto.id)}
        className="flex h-full flex-col rounded-2xl border border-tinta/15 bg-papel p-4 transition-colors hover:border-tijolo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      >
        <FotoProduto foto={fotoDe(produto)} alt="" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <h3 className="titulo-display titulo-gama line-clamp-2 min-w-0 group-hover:text-tijolo">
            {nome}
          </h3>
          {produto.vegan && (
            <span className="bloco-verde-texto shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
              {t("vegan")}
            </span>
          )}
        </div>

        {resumo && (
          <p className="mt-2 line-clamp-3 text-sm text-tinta-suave">{resumo}</p>
        )}

        {/* O preço e o «ver» num bloco só, encostado ao fundo: com o `mt-auto`
            no preço e o «ver» solto por baixo, os dois iam juntos por acaso. */}
        <div className="mt-auto pt-5">
          <p className="titulo-display text-2xl tabular-nums text-tijolo">
            {preco === null ? (
              <span className="text-base normal-case tracking-normal">
                {t("sobOrcamento")}
              </span>
            ) : (
              <>
                {produto.familia === "festa" && (
                  <span className="mr-1.5 text-sm text-tinta-suave">
                    {t("desde")}
                  </span>
                )}
                {formatarCent(preco, locale)}
              </>
            )}
          </p>

          <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4">
            {t("ver")}
          </span>
        </div>
      </Link>
    </li>
  );
}

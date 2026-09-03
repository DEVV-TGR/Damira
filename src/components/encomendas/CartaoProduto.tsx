import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatarPreco } from "@/lib/preco";
import { caminhoDoProduto, precoMinimo, type Produto } from "@/lib/produtos";
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
  const preco = precoMinimo(produto);
  const nome = produto.familia === "medida" ? t("medida.nome") : produto.nome(locale);
  const resumo =
    produto.familia === "medida" ? t("medida.resumo") : produto.resumo?.(locale);

  return (
    <li className="group">
      <Link
        href={caminhoDoProduto(produto.id)}
        className="flex h-full flex-col rounded-2xl border border-tinta/15 bg-papel p-4 transition-colors hover:border-tijolo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      >
        <FotoProduto foto={produto.foto} alt="" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <h3 className="titulo-display titulo-gama group-hover:text-tijolo">
            {nome}
          </h3>
          {produto.vegan && (
            <span className="bloco-verde-texto shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
              {t("vegan")}
            </span>
          )}
        </div>

        {resumo && (
          <p className="mt-2 text-sm text-tinta-suave">{resumo}</p>
        )}

        <p className="titulo-display mt-auto pt-5 text-2xl tabular-nums text-tijolo">
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
              {formatarPreco(preco, locale)}
            </>
          )}
        </p>

        <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4">
          {t("ver")}
        </span>
      </Link>
    </li>
  );
}

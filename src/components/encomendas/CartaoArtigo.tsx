import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Artigo } from "@/data/ementa";
import { regraDe } from "@/lib/encomendavel";
import { caminhoDoArtigo } from "@/lib/produtos";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";
import { FotoProduto } from "./FotoProduto";
import { BotaoJuntar } from "./BotaoJuntar";

/**
 * Um artigo da carta, em cartão.
 *
 * ## ⚠️ É deliberadamente mais pequeno do que o `CartaoProduto`
 *
 * São **setenta**, contra doze produtos de encomenda. Um cartão do mesmo tamanho
 * dava uma secção de vinte ecrãs onde os kits ocupam dois — e a carta por
 * encomenda passava a ser a página inteira, em vez de ser o que é: a cauda longa
 * do catálogo, para quem já sabe o que quer.
 *
 * O que encolhe, e porquê:
 *
 * - **a fotografia é 3/2 e não quadrada.** ⚠️ Começou quadrada por parecer «a
 *   forma pequena», e é o contrário: num cartão, a altura da fotografia **é** a
 *   largura da coluna quando ela é quadrada. A 3/2 gasta dois terços disso, e a
 *   secção passou de sete mil píxeis para pouco mais de quatro mil;
 * - **não há resumo** — os artigos da carta não têm um, e inventá-lo era escrever
 *   descrições que a casa não deu;
 * - **cinco colunas em ecrã largo** contra três dos produtos de encomenda;
 * - **o botão é o compacto**, com o sinal e a quantidade, e não «juntar ao
 *   pedido» escrito setenta vezes.
 *
 * ## ⚠️ Um artigo com variantes não tem botão aqui
 *
 * O chocolate do Dubai tem quatro pesos com quatro preços. Um botão só teria de
 * escolher um por ela, e escolher o mais barato — ou o mais caro — é decidir uma
 * coisa que é da pessoa. O cartão diz «desde» e leva à página, onde os quatro
 * estão lado a lado com um botão cada.
 */
export function CartaoArtigo({
  artigo,
  locale,
}: {
  artigo: Artigo;
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const te = useTranslations("ementa");
  const regra = regraDe(artigo);

  const nome = locale === "pt" ? artigo.nome : artigo.nomeEn;
  const precoMostrado =
    artigo.preco ??
    (artigo.variantes ? Math.min(...artigo.variantes.map((v) => v.preco)) : null);

  return (
    <li className="group flex flex-col rounded-xl border border-tinta/15 bg-papel p-2.5 transition-colors hover:border-tijolo">
      <Link
        href={caminhoDoArtigo(artigo.id)}
        className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      >
        <FotoProduto foto={artigo.foto} alt="" proporcao="3 / 2" discreta />
        <h4 className="mt-2.5 text-sm font-semibold leading-snug group-hover:text-tijolo">
          {nome}
        </h4>
      </Link>

      {artigo.vegan && (
        <span className="bloco-verde-texto mt-1.5 self-start rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider">
          {te("vegan")}
        </span>
      )}

      {/* `mt-auto` empurra o preço e o botão para o fundo: com nomes de uma e de
          três linhas na mesma fila, três botões a alturas diferentes leem-se
          como três coisas diferentes. */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
        <p className="text-sm tabular-nums">
          {precoMostrado !== null && (
            <>
              {artigo.variantes && (
                <span className="mr-1 text-xs text-tinta-suave">{t("desde")}</span>
              )}
              {formatarPreco(precoMostrado, locale)}
              <span className="text-xs text-tinta-suave">
                {artigo.unidade === "kg" ? te("porQuilo") : ` ${t("cadaCurto")}`}
              </span>
            </>
          )}
        </p>

        {regra && !artigo.variantes && (
          <BotaoJuntar
            variante="compacta"
            locale={locale}
            item={{
              id: `ementa:${artigo.id}`,
              tipo: "ementa",
              nome,
              variante: null,
              preco: artigo.preco,
              pessoas: null,
              notas: null,
              unidade: artigo.unidade,
              minimo: regra.minimo,
              passo: regra.passo,
            }}
          />
        )}
      </div>
    </li>
  );
}

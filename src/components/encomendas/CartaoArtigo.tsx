import { useTranslations } from "next-intl";
import type { Produto } from "@/lib/dados/tipos";
import { formatarCent } from "@/lib/preco";
import {
  fotoDe,
  nomeDe,
  paraPersonalizar,
  precoUnicoCent,
  emLingua,
  regraDe,
  textoDeProcura,
  variantesVisiveis,
} from "@/lib/vista";
import type { Locale } from "@/i18n/routing";
import { FotoProduto } from "./FotoProduto";
import { BotaoJuntar } from "./BotaoJuntar";

/**
 * Um artigo do dia a dia, em cartão.
 *
 * ## ⚠️ É deliberadamente mais pequeno do que o `CartaoProduto`
 *
 * São **setenta**, contra doze produtos de encomenda. Um cartão do mesmo tamanho
 * dava uma secção de vinte ecrãs onde os kits ocupam dois — e o dia a dia por
 * encomenda passava a ser a página inteira, em vez de ser o que é: a cauda longa
 * do catálogo, para quem já sabe o que quer.
 *
 * O que encolhe, e porquê:
 *
 * - **a fotografia é 3/2 e não quadrada.** ⚠️ Começou quadrada por parecer «a
 *   forma pequena», e é o contrário: num cartão, a altura da fotografia **é** a
 *   largura da coluna quando ela é quadrada. A 3/2 gasta dois terços disso, e a
 *   secção passou de sete mil píxeis para pouco mais de quatro mil;
 * - **não há resumo** — os artigos do dia a dia não têm um, e inventá-lo era escrever
 *   descrições que a casa não deu;
 * - **cinco colunas em ecrã largo** contra três dos produtos de encomenda;
 * - **o botão é o compacto**, com o sinal e a quantidade, e não «juntar ao
 *   pedido» escrito setenta vezes.
 *
 * ## ⚠️ O cartão é tudo o que o artigo tem
 *
 * Até 12/11 o nome levava à página do artigo, em `/ementa/<id>`. A `/ementa`
 * saiu (#123) e as páginas com ela: **o cartão deixou de ser um link**, porque
 * um link para uma página que já não existe é um 404 em cada um dos setenta.
 *
 * ## ⚠️ Um artigo com variantes tem um botão por variante
 *
 * O chocolate do Dubai tem quatro pesos com quatro preços. Um botão só teria de
 * escolher um por ela, e escolher o mais barato — ou o mais caro — é decidir uma
 * coisa que é da pessoa. Antes o cartão dizia «desde» e mandava para a página do
 * artigo, onde estavam os quatro; sem página, os quatro vêm para aqui, cada um
 * com o seu preço e o seu botão.
 */
export function CartaoArtigo({
  artigo,
  locale,
}: {
  artigo: Produto;
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const te = useTranslations("ementa");
  const regra = regraDe(artigo);

  const nome = nomeDe(artigo, locale);
  /* Um artigo da carta é simples: não leva produtos, e as peças são as dele. */
  const personalizavel = paraPersonalizar(artigo, []);
  const variantes = variantesVisiveis(artigo);
  const precoUnico = precoUnicoCent(artigo);
  const porUnidade = artigo.unidade === "kg" ? te("porQuilo") : ` ${t("cadaCurto")}`;

  return (
    <li className="flex flex-col rounded-xl border border-tinta/15 bg-papel p-2.5" data-procura={textoDeProcura(artigo)}>
      <FotoProduto foto={fotoDe(artigo)} alt="" proporcao="3 / 2" discreta />
      <h4 className="mt-2.5 text-sm font-semibold leading-snug">{nome}</h4>

      {artigo.vegan && (
        <span className="bloco-verde-texto mt-1.5 self-start rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider">
          {te("vegan")}
        </span>
      )}

      {/* `mt-auto` empurra o preço e o botão para o fundo: com nomes de uma e de
          três linhas na mesma fila, três botões a alturas diferentes leem-se
          como três coisas diferentes. */}
      {variantes.length > 0 ? (
        <ul className="mt-auto divide-y divide-tinta/10 pt-1.5">
          {variantes.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 py-1.5">
              {/* O peso por cima do preço, e não ao lado: a 320 px o cartão tem
                  140 px, e «470g 30,00 €» numa linha encostava ao botão. */}
              <p className="flex min-w-0 flex-col text-sm leading-tight tabular-nums">
                <span className="text-xs text-tinta-suave">
                  {v.rotulo ? emLingua(v.rotulo, locale) : v.id}
                </span>
                {v.precoCent !== null && formatarCent(v.precoCent, locale)}
              </p>
              {regra && (
                <BotaoJuntar
                  variante="compacta"
                  locale={locale}
                  personalizavel={personalizavel}
                  item={{
                    id: `ementa:${artigo.id}:${v.id}`,
                    produtoId: artigo.id,
                    varianteId: v.id,
                    tipo: "ementa",
                    /* ⚠️ O nome **sem** a variante: o texto do pedido junta-a
                       entre parênteses, e com ela também no nome saía
                       «Chocolate do Dubai (470g) (470g)». */
                    nome,
                    variante: v.id,
                    precoCent: v.precoCent,
                    pessoas: null,
                    notas: null,
                    unidade: artigo.unidade,
                    minimo: regra.minimo,
                    passo: regra.passo,
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <p className="text-sm tabular-nums">
            {precoUnico !== null && (
              <>
                {formatarCent(precoUnico, locale)}
                <span className="text-xs text-tinta-suave">{porUnidade}</span>
              </>
            )}
          </p>

          {regra && (
            <BotaoJuntar
              variante="compacta"
              locale={locale}
              personalizavel={personalizavel}
              item={{
                id: `ementa:${artigo.id}`,
                produtoId: artigo.id,
                varianteId: "unica",
                tipo: "ementa",
                nome,
                variante: null,
                precoCent: precoUnico,
                pessoas: null,
                notas: null,
                unidade: artigo.unidade,
                minimo: regra.minimo,
                passo: regra.passo,
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

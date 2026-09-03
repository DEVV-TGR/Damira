import { useTranslations } from "next-intl";
import type { Artigo, Carta, Categoria } from "@/data/ementa";
import {
  artigosEncomendaveis,
  cartasEncomendaveis,
  categoriasEncomendaveis,
  daCartaECategoria,
  regraDe,
} from "@/lib/encomendavel";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";
import { BotaoJuntar } from "./BotaoJuntar";

/**
 * # A carta, por encomenda
 *
 * ## ⚠️ Isto encosta ao aviso do AGENTS.md, e encosta com regras
 *
 * O aviso diz para **não juntar a encomenda à ementa**, porque um kit para
 * setenta pessoas ao lado de um croissant leva alguém a aparecer ao sábado à
 * espera de o levar debaixo do braço. Continua a valer, e as duas páginas
 * continuam separadas: isto vive em `/encomendas` e não em `/ementa`.
 *
 * O que evita o mal-entendido é a **quantidade mínima escrita ao lado de cada
 * linha**. Um artigo que só se pede à dúzia, com antecedência, nunca se confunde
 * com um artigo que se tira da vitrine — e quem quiser um pastel continua a
 * entrar na loja e a pedi-lo, como sempre.
 *
 * ## Porque é uma lista e não cartões
 *
 * São setenta artigos. Setenta cartões com fotografia que não existe são vinte
 * ecrãs de rolagem para encontrar os pastéis de nata; setenta linhas com o preço
 * à direita são a folha de encomenda que a casa já usa em papel — e essa lê-se
 * de cima a baixo em segundos.
 *
 * ⚠️ **A ordem é a das cartas e a do impresso**, e não alfabética nem por preço:
 * é a mesma ordem da página da ementa, e quem vem de lá encontra as coisas onde
 * as deixou.
 */
export function EmentaEncomendavel({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.daEmenta");
  const te = useTranslations("ementa");

  return (
    <section aria-labelledby="da-ementa" className="seccao">
      <div className="envolvente">
        <h2 id="da-ementa" className="titulo-display titulo-beta max-w-[18ch]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[52ch] text-tinta-suave">{t("texto")}</p>

        {/* ⚠️ **O aviso do mínimo vem antes da lista e não depois.** Depois da
            lista chega tarde: nessa altura a pessoa já juntou, já se enganou na
            expectativa, e o que lê parece letra pequena a desdizer o que ela
            acabou de fazer. */}
        <p className="mt-5 max-w-[52ch] rounded-xl border border-tijolo/30 bg-tijolo/5 px-5 py-4 text-sm">
          {t("aviso")}
        </p>

        <div className="mt-12 space-y-14">
          {cartasEncomendaveis().map((carta) => (
            <div key={carta}>
              <h3 className="titulo-display titulo-gama text-tijolo">
                {te(`cartas.${carta as Carta}.curto`)}
              </h3>

              <div className="mt-6 grid gap-x-14 gap-y-10 lg:grid-cols-2">
                {categoriasEncomendaveis(carta).map((categoria) => (
                  <div key={categoria}>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">
                      {te(`categorias.${categoria as Categoria}`)}
                    </h4>
                    {/* ⚠️ **A regra vive aqui e não em cada linha.**
                        Escrita artigo a artigo, «mínimo 12 unidades» aparecia
                        setenta vezes na mesma página — e um aviso repetido
                        setenta vezes deixa de se ler ao fim da terceira. A regra
                        é **da categoria** (ver `encomendavel.ts`), portanto é no
                        título da categoria que ela é verdadeira uma só vez. */}
                    <p className="mt-1 text-sm text-tinta-suave">
                      {regraDaCategoria(categoria, t)}
                    </p>
                    <ul className="mt-4 divide-y divide-tinta/12">
                      {daCartaECategoria(carta, categoria).map((artigo) => (
                        <Linha key={artigo.id} artigo={artigo} locale={locale} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * A regra de uma categoria, escrita.
 *
 * Lê a regra do **primeiro artigo** da categoria em vez de a ir buscar à tabela
 * directamente: assim, se um dia a regra passar a depender do artigo e não só da
 * categoria, isto deixa de estar certo por acaso e passa a estar errado de forma
 * visível — que é melhor do que continuar a mostrar uma regra desactualizada com
 * ar de verdade.
 */
function regraDaCategoria(
  categoria: Categoria,
  t: (chave: string, valores?: Record<string, string | number>) => string,
): string {
  const artigo = artigosEncomendaveis().find((a) => a.categoria === categoria);
  const regra = artigo ? regraDe(artigo) : null;
  if (!artigo || !regra) return "";
  return artigo.unidade === "kg"
    ? t("regraKg", { minimo: regra.minimo })
    : t("regraUn", { minimo: regra.minimo, passo: regra.passo });
}

/**
 * Uma linha da folha de encomenda.
 *
 * ⚠️ **Um artigo com variantes dá uma linha por variante**, e não uma linha com
 * um seletor. O chocolate do Dubai tem quatro pesos com quatro preços: escondê-
 * los atrás de um menu obrigava a abrir quatro vezes para comparar, e o que a
 * pessoa quer comparar é justamente o preço dos quatro.
 */
function Linha({ artigo, locale }: { artigo: Artigo; locale: Locale }) {
  const t = useTranslations("encomendas.daEmenta");
  const te = useTranslations("ementa");
  const regra = regraDe(artigo);
  if (!regra) return null;

  const nome = locale === "pt" ? artigo.nome : artigo.nomeEn;

  const comum = {
    tipo: "ementa" as const,
    nome,
    pessoas: null,
    unidade: artigo.unidade,
    minimo: regra.minimo,
    passo: regra.passo,
  };

  if (artigo.variantes) {
    return (
      <li className="py-3">
        <p className="font-semibold">{nome}</p>
        <ul className="mt-2 space-y-2">
          {artigo.variantes.map((v) => (
            <li key={v.chave} className="flex items-center justify-between gap-3">
              <span className="text-sm text-tinta-suave">{v.chave}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm tabular-nums">
                  {formatarPreco(v.preco, locale)}
                </span>
                <BotaoJuntar
                  variante="compacta"
                  locale={locale}
                  item={{
                    ...comum,
                    id: `ementa:${artigo.id}:${v.chave}`,
                    nome: `${nome} (${v.chave})`,
                    variante: v.chave,
                    preco: v.preco,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold">
          {nome}
          {artigo.vegan && (
            <span className="bloco-verde-texto ml-2 rounded-full px-2 py-0.5 align-middle text-[0.6rem] font-bold uppercase tracking-wider">
              {te("vegan")}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* ⚠️ **O preço diz sempre de que unidade é.** Um «1,20 €» solto ao lado
            de um artigo que só se pede à dúzia lê-se como o preço da dúzia — e
            quem contava com 1,20 € recebe uma resposta de 14,40 €. É a mesma
            armadilha do preço ao quilo, do outro lado. */}
        <span className="whitespace-nowrap text-sm tabular-nums">
          {artigo.preco !== null && formatarPreco(artigo.preco, locale)}
          <span className="text-tinta-suave">
            {artigo.unidade === "kg" ? te("porQuilo") : ` ${t("cada")}`}
          </span>
        </span>
        <BotaoJuntar
          variante="compacta"
          locale={locale}
          item={{
            ...comum,
            id: `ementa:${artigo.id}`,
            variante: null,
            preco: artigo.preco,
          }}
        />
      </div>
    </li>
  );
}

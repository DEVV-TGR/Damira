import { useTranslations } from "next-intl";
import { CATEGORIAS, bestSellers, type Categoria } from "@/data/ementa";
import { Link } from "@/i18n/navigation";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/**
 * Os doze do selo, servidos por ordem de chegada à mesa.
 *
 * ## A ideia: doze não é um top, é uma refeição
 *
 * Isto era um carrossel de doze cartões iguais, e o problema não era o efeito —
 * era a premissa. **Doze cartões do mesmo tamanho não deixam nada sobressair**,
 * e "os mais pedidos" com doze entradas deixa de significar alguma coisa.
 *
 * Mas os doze não são uma lista: caem em **sete tempos** — entradas, novilho,
 * maturadas, corajosos, frango, sobremesas, bebidas. Vistos assim são uma
 * refeição do princípio ao fim, e cada nome fica com espaço para respirar
 * porque nenhum grupo tem mais de três.
 *
 * A ordem sai do enum `CATEGORIAS`, que é a ordem da carta impressa — e essa,
 * como diz o comentário lá, é a ordem por que se come. Marcar um artigo novo
 * como `bestSeller` põe-no no tempo certo sem tocar aqui.
 *
 * ## Porque não há fotografia
 *
 * Os cartões do carrossel iam buscar imagens a `fotos-ilustrativas.ts` e traziam
 * **doze selos "imagem ilustrativa"** — uma fotografia genérica ao lado de um
 * santo e de um preço, com um aviso a dizer que não é aquele prato. Doze avisos
 * numa secção que devia dar vontade de comer.
 *
 * Sem fotografia o problema desaparece, e a secção passa a ser a única
 * puramente tipográfica da página — que é o contraste de que a página precisa,
 * entalada entre o mural e a fotografia grande dos pães.
 */
export function MesaPosta({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio.mesa");
  const nomeCategoria = useTranslations("ementa.categorias");

  const doze = bestSellers();
  /* Agrupar pela ordem do enum e não pela ordem em que aparecem no JSON: são a
     mesma coisa hoje, e deixam de ser no dia em que alguém arrastar um artigo
     dentro do ficheiro. */
  const tempos = CATEGORIAS.map((categoria) => ({
    categoria,
    artigos: doze.filter((artigo) => artigo.categoria === categoria),
  })).filter((tempo) => tempo.artigos.length > 0);

  return (
    <section aria-labelledby="mesa" className="seccao">
      <div className="envolvente">
        {/*
          Centrado e numa medida estreita, ao contrário de todas as outras
          secções — é a única forma de uma lista de nomes e preços se ler como
          uma carta e não como uma tabela. Também é o que quebra a aresta
          vertical única que a página tinha do topo ao fundo.
        */}
        <div className="mx-auto max-w-[42rem]">
          <h2 id="mesa" className="titulo-display titulo-beta text-balance text-center">
            {t("titulo")}
          </h2>
          <p className="mx-auto mt-5 max-w-[38ch] text-center text-tinta-suave">
            {t("texto")}
          </p>

          <div className="surgir mt-14 space-y-11">
            {tempos.map(({ categoria, artigos }) => (
              <div key={categoria}>
                <h3 className="olho justify-center">
                  {nomeCategoria(categoria as Categoria)}
                </h3>

                {/*
                  ⚠️ **O nome não leva `shrink-0`.** Com o nome e o preço ambos
                  rígidos, «Copo de sangria da casa (espumante)» mais «6,00 €»
                  não cabem num ecrã de 320 px e **empurravam a largura do
                  documento** — a página inteira ganhava scroll horizontal por
                  causa de uma linha. Assim o nome quebra, e se ainda não couber,
                  o preço desce para a linha seguinte encostado à direita pelo
                  `ml-auto`.
                */}
                <ul className="mt-5 space-y-3.5">
                  {artigos.map((artigo) => (
                    <li
                      key={artigo.id}
                      className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.15rem,2.4vw,1.6rem)]"
                    >
                      <Link
                        href={`/ementa#${artigo.id}`}
                        className="titulo-display transition-colors duration-200 hover:text-magenta-forte"
                      >
                        {artigo.nome}
                      </Link>

                      {/*
                        Os pontinhos de condução do impresso. Um filete a
                        tracejado e não uma cadeia de "." escritos: assim
                        acompanha qualquer largura sem contas, e o leitor de ecrã
                        não lê quarenta pontos entre o nome e o preço.

                        Somem abaixo dos 640 px: num ecrã estreito não sobra
                        filete nenhum para conduzir, e um traço de seis pixéis
                        entre duas palavras é sujidade, não tipografia.
                      */}
                      <span
                        aria-hidden
                        className="mb-[0.3em] hidden min-w-6 flex-1 border-b border-dotted border-tinta/35 sm:block"
                      />

                      <span className="titulo-display ml-auto shrink-0 tabular-nums">
                        {formatarPreco(artigo.preco, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

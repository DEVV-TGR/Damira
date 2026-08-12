import { useTranslations } from "next-intl";
import { santoral } from "@/data/ementa";
import { Link } from "@/i18n/navigation";

/**
 * O santoral: os quarenta nomes, em corpo grande, parados.
 *
 * ## O que isto substitui, e porquê
 *
 * Baptizar cada hambúrguer com um santo é a marca inteira. Isso vivia numa fita
 * a passar a **catorze pixéis**, colada ao herói e no mesmo magenta — sem
 * fronteira entre os dois blocos.
 *
 * ⚠️ **Era a fita que estragava o herói.** A ideia do herói é um título entalado
 * entre duas filas de fotografias; para isso resultar, a fila de baixo tem de ser
 * uma **aresta**. Com uma terceira tira logo a seguir, no mesmo fundo e também a
 * andar, deixava de fechar coisa nenhuma e passava a ser a primeira de três
 * riscas. Tirar a fita daqui conserta duas secções de uma vez.
 *
 * Aqui os nomes estão parados e em tamanho de título. A fita sobrevive uma vez,
 * no fundo da página, a costurar para o rodapé — ver `FitaSantos`.
 *
 * ## Porque é navegação e não decoração
 *
 * Cada nome liga ao seu artigo na ementa. São **quarenta ligações verdadeiras**,
 * e é isso que justifica o tamanho: um mural que não vai a lado nenhum é um
 * enfeite grande, e um enfeite grande é pior do que um pequeno.
 *
 * Os que têm selo saem a magenta-forte (4,57:1 sobre papel) e o resto a tinta
 * (15,4:1). A distinção sai do `bestSeller` do JSON e é ela que apresenta a
 * secção seguinte — que por isso não precisa de etiqueta nem de parágrafo a
 * explicar o que são os mais pedidos.
 */
export function Mural() {
  const t = useTranslations("inicio.mural");
  const artigos = santoral();

  return (
    <section aria-labelledby="santoral" className="seccao">
      <div className="envolvente">
        <h2 id="santoral" className="sr-only">
          {t("titulo")}
        </h2>

        {/*
          Uma lista, não um parágrafo de ligações: são quarenta itens e quem usa
          leitor de ecrã tem direito a saber quantos são e a saltá-los de uma vez.

          `text-wrap: pretty` fica de fora de propósito — o `titulo-display` traz
          `balance`, que num bloco desta altura o browser desiste de calcular. O
          que interessa aqui é o bloco encher, não as linhas ficarem iguais.
        */}
        <ul className="surgir flex flex-wrap items-baseline gap-x-[0.45em] gap-y-1">
          {artigos.map((artigo, indice) => (
            <li key={artigo.id}>
              <Link
                href={`/ementa#${artigo.id}`}
                className={`titulo-display titulo-beta transition-colors duration-200 ${
                  artigo.bestSeller
                    ? "text-magenta-forte hover:text-tinta"
                    : "text-tinta hover:text-magenta-forte"
                }`}
              >
                {artigo.nome}
              </Link>
              {/*
                O ponto é do mural e não do nome — fica fora da ligação para não
                entrar na área de clique nem ser lido em voz alta. E não há ponto
                depois do último: um separador pendurado no fim de uma lista é a
                marca de quem o colou a todos os itens sem olhar.
              */}
              {indice < artigos.length - 1 && (
                <span aria-hidden className="titulo-display titulo-beta text-magenta/40">
                  {" ·"}
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-[46ch] text-tinta-suave">
          {t("nota", { total: artigos.length })}
        </p>
      </div>
    </section>
  );
}

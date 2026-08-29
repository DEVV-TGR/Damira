import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ementa, daCarta, porCategoria } from "@/data/ementa";
import { quantasOpcoes } from "@/data/bolos";

/**
 * A carta vegan, contada por números.
 *
 * ## Porque é uma secção inteira e não uma etiqueta na ementa
 *
 * Porque **quase metade da carta da Damira é vegan** — 49 dos 95 artigos — e
 * isso não é um pormenor de uma pastelaria em Ermesinde: é a coisa mais
 * invulgar que esta casa tem. Uma folha verde ao lado de dezassete linhas da
 * ementa dizia o mesmo facto sem que ninguém desse por ele.
 *
 * Os números saem do `ementa.json` e do `bolos.json` em vez de estarem escritos
 * nas mensagens. É a diferença entre uma página que se corrige sozinha e uma que
 * anuncia "23 doces" durante um ano depois de a casa ter passado a fazer 25 —
 * e, pior, em duas línguas, com uma delas sempre a ficar para trás.
 *
 * ⚠️ **O verde aparece aqui e praticamente em mais lado nenhum.** É o sinal do
 * vegan; usá-lo como acento decorativo numa secção de leitão ensina o olho a
 * ignorá-lo justamente onde ele conta. Ver o cabeçalho do `globals.css`.
 */
export function Vegan() {
  const t = useTranslations("inicio.vegan");

  const doces = porCategoria("vegan", "doces").length;
  const bolos = porCategoria("vegan", "bolos-inteiros").length;
  const salgados = porCategoria("vegan", "salgados").length;
  const total = daCarta("vegan").length;

  const numeros = [
    { valor: doces, rotulo: t("doces") },
    { valor: salgados, rotulo: t("salgados") },
    { valor: bolos, rotulo: t("bolos") },
    { valor: quantasOpcoes("vegan"), rotulo: t("opcoesBolo") },
  ];

  return (
    <section aria-labelledby="vegan" className="bloco-verde">
      <div className="envolvente py-[clamp(3.5rem,8vw,6rem)]">
        {/* Sobre o verde da marca só entram títulos: tinta sobre verde dá
            4,16:1, que passa a partir de 24 px e reprova abaixo disso. O
            parágrafo e as etiquetas vão em tinta sobre o cartão de papel, mais
            abaixo. */}
        <h2
          id="vegan"
          className="titulo-display titulo-alfa max-w-[16ch]"
          style={{ fontVariationSettings: '"wdth" 72, "opsz" 48' }}
        >
          {t("titulo")}
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-tinta/15 sm:grid-cols-2 lg:grid-cols-4">
          {numeros.map((n) => (
            <div key={n.rotulo} className="bg-papel px-6 py-8">
              <p
                className="titulo-display text-[clamp(2.75rem,6vw,4rem)] leading-none text-verde-forte"
                style={{ fontVariationSettings: '"wdth" 70, "opsz" 40' }}
              >
                {n.valor}
              </p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-tinta-suave">
                {n.rotulo}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/ementa"
            className="premivel rounded-full bg-tinta px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
          >
            {t("verCarta")}
          </Link>
          {/* O total é o argumento todo, e por isso é a última coisa que se lê:
              não é "temos opções vegan", é metade da carta. */}
          <p className="max-w-[34ch] text-sm font-semibold">
            {t("proporcao", { vegan: total, total: ementa.length })}
          </p>
        </div>
      </div>
    </section>
  );
}

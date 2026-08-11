import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { restaurantes } from "@/data/restaurantes";

/**
 * O primeiro ecrã: fotografia a sangrar, título por cima.
 *
 * ## Porque não ocupa o ecrã todo
 *
 * `min(88vh, 46rem)` e não `100vh`, por duas razões que apontam para o mesmo
 * lado. A primeira é honesta: **a fotografia não tem resolução para isto** —
 * 919 × 1059 px, de retrato, esticada num ecrã largo. Quanto menor a altura,
 * menor a ampliação. A segunda é de leitura: um herói que ocupa o ecrã todo não
 * deixa ver que há página a seguir, e quem chega aqui vem ver a ementa.
 *
 * O véu e o grão fazem o resto — ver `.veu-heroi` em `globals.css`.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="relative flex h-[min(88vh,46rem)] min-h-[32rem] flex-col justify-end overflow-hidden text-papel">
      <Image
        src="/comida/04.webp"
        alt=""
        fill
        priority
        /* Centrado, e **não** `object-top`. A fotografia é de retrato (919 ×
           1059) e o herói é largo: a cobrir, só se vêem 44% da altura. Cortada
           pelo topo, esses 44% eram o fundo desfocado e o hambúrguer ficava de
           fora do ecrã — o herói mostrava uma mancha cinzenta. */
        className="object-cover object-center"
        sizes="100vw"
      />
      <div aria-hidden className="veu-heroi absolute inset-0" />
      <div aria-hidden className="grao-heroi pointer-events-none absolute inset-0" />

      <div className="envolvente relative pb-14 pt-24">
        <h1 className="titulo-display max-w-[16ch] text-[clamp(2.75rem,8vw,6rem)]">
          {marca("assinatura")}
        </h1>

        <p className="mt-5 max-w-[38ch] text-base leading-relaxed text-papel/85 sm:text-lg">
          {t("heroTexto")}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/ementa"
            className="rounded-full bg-papel px-7 py-4 text-sm font-semibold uppercase tracking-widest text-tinta transition-transform hover:-translate-y-0.5"
          >
            {t("verEmenta")}
          </Link>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-papel/80">
            {restaurantes.map((casa) => casa.cidade).join(" · ")}
          </p>
        </div>
      </div>

      {/* O traço do logótipo, encostado ao canto. Discreto porque o título já
          está a fazer o trabalho — aqui é assinatura, não protagonista. */}
      <span
        aria-hidden
        className="traco absolute right-[clamp(1.25rem,4vw,2.5rem)] top-[clamp(5rem,10vw,7rem)] hidden h-40 text-papel/40 sm:block"
        style={{
          /* Largura explícita a partir da altura e da proporção do desenho
             (358 × 760). Um elemento absoluto sem conteúdo colapsa a zero antes
             de o `aspect-ratio` chegar a aplicar-se. */
          width: "calc(10rem * 358 / 760)",
          maskImage: "url(/tracos/logotipo.png)",
          WebkitMaskImage: "url(/tracos/logotipo.png)",
        }}
      />
    </section>
  );
}

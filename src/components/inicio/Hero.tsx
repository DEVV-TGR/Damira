import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { restaurantes } from "@/data/restaurantes";

/**
 * O primeiro ecrã. Assimétrico de propósito: o texto ocupa cinco colunas de
 * doze e a fotografia sangra pela direita.
 *
 * Uma grelha simétrica com texto à esquerda e imagem à direita é o que qualquer
 * site faz; deixar a fotografia passar a margem e o título entrar-lhe por cima
 * é o que faz a página parecer composta em vez de preenchida.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="relative overflow-hidden">
      <div className="envolvente grid items-center gap-12 pb-[var(--espaco-seccao)] pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-24">
        <div className="relative z-10 lg:col-span-6">
          <p className="olho">
            {restaurantes.map((casa) => casa.cidade).join(" · ")}
          </p>

          <h1 className="titulo-display mt-6 text-[clamp(3rem,8.5vw,6.5rem)]">
            {marca("assinatura")}
          </h1>

          <p className="mt-7 max-w-[42ch] text-lg leading-relaxed text-tinta-suave">
            {t("heroTexto")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/ementa"
              className="bloco-magenta-texto rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-widest transition-transform hover:-translate-y-0.5"
            >
              {t("verEmenta")}
            </Link>
            <p className="text-sm font-medium uppercase tracking-widest text-tinta-suave">
              {marca("quadrado")}
            </p>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          {/* Sangra pela direita até à borda do ecrã em vez de parar na margem —
              é o que impede o herói de parecer uma caixa dentro de uma caixa. */}
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl lg:-mr-[max(0px,calc((100vw-78rem)/2+2.5rem))]">
            <Image
              src="/comida/01.webp"
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* A taça do impresso, encostada à esquina da fotografia. */}
          <span
            aria-hidden
            /* Largura explícita, e não `w-auto` com `aspect-ratio`: um elemento
               absoluto sem conteúdo colapsa a zero antes de a proporção chegar a
               aplicar-se, e o traço saía do tamanho de uma migalha. */
            className="traco absolute -bottom-8 -left-6 hidden h-44 w-[4.7rem] text-magenta lg:block"
            style={{
              maskImage: "url(/tracos/taca.png)",
              WebkitMaskImage: "url(/tracos/taca.png)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

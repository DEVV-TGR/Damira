import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { restaurantes } from "@/data/restaurantes";

/**
 * As doze fotografias, repartidas pelas duas filas.
 *
 * A de cima leva as que têm gente — mãos, risos, o pão cor-de-rosa, a esplanada.
 * A de baixo leva os planos de comida. Não é arrumação: é o que faz a primeira
 * fila dizer "vem cá" e a segunda dizer "come isto".
 */
const CIMA = [
  "/instagram/01.webp",
  "/instagram/02.webp",
  "/instagram/03.webp",
  "/instagram/04.webp",
  "/instagram/11.webp",
  "/instagram/05.webp",
];
const BAIXO = [
  "/instagram/12.webp",
  "/instagram/06.webp",
  "/instagram/09.webp",
  "/instagram/07.webp",
  "/instagram/10.webp",
  "/instagram/08.webp",
];

/**
 * O primeiro ecrã: **campo de magenta chapado, com o título entre duas filas de
 * fotografias do Instagram a andar em sentidos opostos.**
 *
 * ## Porque são ladrilhos e não uma fotografia grande
 *
 * As imagens do Instagram têm 356 px de largura — são recortes das miniaturas da
 * grelha, e o perfil está atrás de login (ver `scripts/importar-instagram.mjs`).
 * Num herói a sangrar isso seria uma ampliação de quase quatro vezes e via-se.
 * Em ladrilhos pequenos, chega.
 *
 * ⚠️ **A largura do ladrilho é uma decisão de nitidez, não de composição.** Está
 * medida: com este `clamp`, a ampliação máxima fica em 1,35× num ecrã de dupla
 * densidade e 1,48× num telemóvel de tripla. Alargá-los é começar a ver o grão
 * da compressão do Instagram.
 *
 * ## Porque o magenta é o tom escuro
 *
 * `bloco-magenta-texto` e não `bloco-magenta`: o parágrafo é texto de tamanho
 * normal, e branco sobre o magenta da marca dá 4,25:1 — abaixo dos 4,5:1. O tom
 * sete por cento mais escuro passa e, lado a lado, ninguém os distingue.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="bloco-magenta-texto overflow-hidden">
      <FitaDeFotos fotos={CIMA} duracao="70s" />

      <div className="envolvente py-[clamp(2.5rem,6vw,4.5rem)]">
        <h1
          className="titulo-display text-[clamp(2.75rem,9vw,7rem)] uppercase"
          style={{
            /* Muito condensado e em caixa alta: é o registo do menu impresso, e
               a Bricolage tem eixo de largura para lá chegar sem trocar de
               fonte. */
            fontVariationSettings: '"wdth" 62, "opsz" 48',
            /* A entrelinha global é 0,95, que a este corpo faz a cauda do **Q**
               bater na linha de cima. */
            lineHeight: "1.02",
          }}
        >
          {marca("assinatura")}
        </h1>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em]">
          {marca("quadrado")}
        </p>

        <p className="mt-5 max-w-[42ch] leading-relaxed text-papel/90">
          {t("heroTexto")}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/ementa"
            className="rounded-full bg-papel px-7 py-4 text-sm font-semibold uppercase tracking-widest text-tinta transition-transform hover:-translate-y-0.5"
          >
            {t("verEmenta")}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-papel/85">
            {restaurantes.map((casa) => casa.cidade).join(" · ")}
          </p>
        </div>
      </div>

      {/* Ao contrário da de cima, e mais devagar: o desencontro é o que dá
          profundidade. */}
      <FitaDeFotos fotos={BAIXO} duracao="85s" inversa />
    </section>
  );
}

/**
 * Uma fila a correr, no motor de fita que já existe (ver `.fita` em
 * `globals.css`): conteúdo duplicado e deslocado metade da largura, para o ciclo
 * fechar sem costura. A cópia é `aria-hidden`; as fotografias são decorativas e
 * não descrevem prato nenhum.
 *
 * Pára com o rato por cima e desaparece com `prefers-reduced-motion` — imagem em
 * movimento contínuo é dos piores gatilhos para quem tem sensibilidade a
 * movimento.
 */
function FitaDeFotos({
  fotos,
  duracao,
  inversa = false,
}: {
  fotos: string[];
  duracao: string;
  inversa?: boolean;
}) {
  return (
    <div className={`fita ${inversa ? "fita-inversa" : ""}`}>
      <div
        className="fita-conteudo"
        style={{ "--duracao": duracao } as React.CSSProperties}
      >
        <Serie fotos={fotos} />
        <Serie fotos={fotos} duplicada />
      </div>
    </div>
  );
}

function Serie({ fotos, duplicada = false }: { fotos: string[]; duplicada?: boolean }) {
  return (
    <ul className="flex shrink-0 gap-1 pr-1" aria-hidden={duplicada || undefined}>
      {fotos.map((src, indice) => (
        <li
          key={src}
          className="relative aspect-square w-[clamp(8.5rem,22vw,15rem)] shrink-0 overflow-hidden"
        >
          <Image
            src={src}
            /* Decorativas: são momentos da casa, não descrevem um prato. */
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, 15rem"
            priority={!duplicada && indice < 4}
          />
        </li>
      ))}
    </ul>
  );
}

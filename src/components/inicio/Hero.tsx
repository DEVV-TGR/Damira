import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { restaurantes } from "@/data/restaurantes";

/**
 * As fotografias do mosaico, escolhidas à mão de `public/instagram/`.
 *
 * São as que têm gente: mãos, risos, o pão cor-de-rosa, a esplanada. Um prato
 * sozinho num mosaico destes lê como catálogo; uma pessoa a comer com as mãos lê
 * como sábado à tarde, que é o que o Instagram desta casa mostra.
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
 * fotografias do Instagram.**
 *
 * ## Porque é um mosaico e não uma fotografia grande
 *
 * As imagens do Instagram têm 356 px de largura — são recortes das miniaturas da
 * grelha, e não há originais a que se chegue (ver `scripts/importar-instagram.mjs`).
 * Num herói a sangrar isso seria uma ampliação de quatro vezes e via-se. Em
 * ladrilhos pequenos, chega e sobra.
 *
 * A restrição e a ideia coincidem: uma parede de momentos é também o que melhor
 * traduz um perfil de Instagram. Quando os originais chegarem, isto pode passar a
 * uma fotografia a sangrar sem truques — mas o mosaico não fica pior por isso.
 *
 * ## Porque o magenta é o escuro
 *
 * `bloco-magenta-texto` e não `bloco-magenta`: o parágrafo é texto de tamanho
 * normal, e branco sobre o magenta da marca dá 4,25:1 — abaixo dos 4,5:1. O tom
 * sete por cento mais escuro passa e, lado a lado, ninguém os distingue. Ver a
 * tabela em `globals.css`.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="bloco-magenta-texto overflow-hidden">
      <FilaDeFotos fotos={CIMA} />

      <div className="envolvente py-[clamp(2.5rem,6vw,4.5rem)]">
        <h1
          className="titulo-display text-[clamp(2.75rem,9vw,7rem)] uppercase"
          style={{
            /* Muito condensado e em caixa alta: é o registo do menu impresso, e
               a Bricolage tem eixo de largura para lá chegar sem trocar de
               fonte. */
            fontVariationSettings: '"wdth" 62, "opsz" 48',
            /* A entrelinha global é 0,95, que a este corpo faz a cauda do **Q**
               bater na linha de cima. Aqui abre-se o suficiente para a deixar
               passar e nem por isso o bloco deixa de ser compacto. */
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

      <FilaDeFotos fotos={BAIXO} />
    </section>
  );
}

/**
 * Uma fila de ladrilhos, a sangrar de lado a lado.
 *
 * ⚠️ **O número de colunas é uma decisão de nitidez, não de composição.** As
 * imagens têm 356 px de origem; num ecrã Retina, um ladrilho de 480 px de CSS
 * pede 960 px de dispositivo e amplia quase três vezes — via-se. Com seis
 * colunas o ladrilho fica em ~240 px e a ampliação desce para perto de uma vez e
 * meia, que o grão da página disfarça.
 *
 * Em telemóvel são três: com 390 px de largura, seis ladrilhos dariam 65 px cada
 * e não se via nada em nenhum deles.
 */
function FilaDeFotos({ fotos }: { fotos: string[] }) {
  return (
    <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
      {fotos.map((src, indice) => (
        <li
          key={src}
          /* Os que sobram escondem-se em vez de encolher: uma fila de seis num
             ecrã pequeno é seis imagens ilegíveis. */
          className={`relative aspect-square ${indice >= 4 ? "hidden lg:block" : indice === 3 ? "hidden sm:block" : ""}`}
        >
          <Image
            src={src}
            /* Decorativas: são momentos da casa, não descrevem um prato. */
            alt=""
            fill
            className="object-cover"
            /* Nunca acima da largura de origem — pedir mais era servir uma
               ampliação e fingir que é nitidez. */
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 17vw"
            priority={indice < 3}
          />
        </li>
      ))}
    </ul>
  );
}

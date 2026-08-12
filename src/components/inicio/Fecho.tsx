import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Marca } from "@/components/Marca";
import { restaurantes, moradaCompleta, urlDirecoes } from "@/data/restaurantes";

/**
 * O fecho: a banda magenta que responde ao herói.
 *
 * ## Porque a página precisava disto
 *
 * Acabava na grelha das casas e caía directamente no rodapé. Sem remate, sem
 * marca, e com **uma única chamada à acção em toda a página** — a do herói, a
 * sete ecrãs de distância de quem chega aqui depois de ler a carta toda.
 *
 * O magenta abre e fecha a página, e mais nada usa magenta chapado. É o que faz
 * a coisa ler-se como uma peça com princípio e fim em vez de uma pilha de
 * secções.
 *
 * ## O logótipo, finalmente em tamanho
 *
 * O site nunca mostrava a marca acima de `text-3xl` — cabeçalho e rodapé. O
 * desenho é uma máscara de alfa a 358×760 px (`scripts/extrair-tracos.mjs`), o
 * que a esta altura dá folga de sobra; só não escala para lá de umas centenas de
 * pixéis, e por isso é aqui que pára.
 *
 * ## A fotografia não é enfeite
 *
 * É o casal a comer no carro, com as caixas de take-away na mão — e **as caixas
 * trazem as duas moradas impressas**. É a única fotografia do acervo que diz
 * exactamente o que esta secção diz.
 *
 * ⚠️ **Não há botão de reserva.** Não há telefone nos dados, não há reservas e
 * não há formulário: as únicas acções verdadeiras são a ementa e o Maps.
 * Inventar um terceiro botão era desenhar uma funcionalidade que não existe.
 */
export function Fecho() {
  const t = useTranslations("inicio.fecho");
  const nav = useTranslations("inicio");

  return (
    <section
      aria-labelledby="fecho"
      className="bloco-magenta-texto overflow-hidden"
    >
      <div className="envolvente grid items-center gap-12 py-[clamp(3.5rem,8vw,6rem)] lg:grid-cols-[minmax(0,1fr)_clamp(20rem,34vw,30rem)] lg:gap-16">
        <div>
          <h2 id="fecho" className="sr-only">
            {t("titulo")}
          </h2>

          <Marca
            empilhado
            className="text-[clamp(1.75rem,4.5vw,3.25rem)]"
          />

          {/* ⚠️ Papel a 100%: sobre magenta-forte dá 4,57:1 e passa. Com
              `text-papel/90` cairia para 3,85:1 e reprovava — a opacidade come o
              contraste e não aparece em tabela nenhuma. */}
          <p className="mt-8 max-w-[34ch] text-lg leading-relaxed">{t("texto")}</p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
            {/* O mesmo rótulo do herói, de propósito: um rótulo por intenção. */}
            <Link
              href="/ementa"
              className="premivel rounded-full bg-papel px-7 py-4 text-sm font-semibold uppercase tracking-widest text-tinta"
            >
              {nav("verEmenta")}
            </Link>

            <ul className="space-y-1.5 text-sm">
              {restaurantes.map((casa) => (
                <li key={casa.id}>
                  <a
                    href={urlDirecoes(casa)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-papel/50 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-papel"
                  >
                    {/* Só a morada completa: ela já acaba na cidade, e pôr a
                        cidade à frente dava "Porto · Rua Egas Moniz 490, Porto". */}
                    {moradaCompleta(casa)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
          <Image
            src="/fotos/01.webp"
            alt=""
            fill
            sizes="(max-width: 64rem) 100vw, 30rem"
            className="object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

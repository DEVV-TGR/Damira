import { useTranslations } from "next-intl";
import { porPao } from "@/data/ementa";
import { Link } from "@/i18n/navigation";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";
import { Reel } from "./Reel";

/**
 * O pão rosa e o pão azul.
 *
 * ## O que faltava aqui
 *
 * A secção fala de **cor** e não tinha nenhuma: eram dois painéis chapados com
 * duas listas de ligações sublinhadas. O argumento — que há dezasseis santos que
 * vêm num pão de cor, e que um pão cor-de-rosa numa mesa se fotografa sozinho —
 * estava escrito e não estava mostrado.
 *
 * Agora a coluna da esquerda é a fotografia das quatro mãos com o pão de cor, e
 * por cima dela toca o reel do mesmo momento. É o mesmo ensaio: a fotografia é a
 * versão nítida a 1286 px, o vídeo é o que lhe dá movimento. **A fotografia não é
 * o cartaz gerado do vídeo** — o cartaz sai de um fotograma a 720 px e com as
 * mãos a mexer; esta é a boa.
 *
 * A divisória de um píxel entre os dois painéis mantém-se: é o que os faz ler
 * como duas metades da mesma coisa em vez de dois cartões.
 *
 * ## O Mega Santo
 *
 * Era uma estrela em superscrito de doze pixéis, repetida nos dois painéis, com
 * uma nota a explicá-la. É o remate da secção — **o único santo que vem dos dois
 * pães** — e ainda por cima é o de 640 g e um dos do selo. Passa a ter a sua
 * própria faixa, com os factos todos, e todos vindos do JSON: a lista dos pães,
 * as gramas e o preço. Ninguém tem de se lembrar de os actualizar aqui.
 */
export function Paes({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio.paes");

  const rosa = porPao("rosa");
  const azul = porPao("azul");
  /* Quem leva os dois pães sai do próprio ficheiro. Se um dia forem dois, a
     faixa mostra os dois sem ninguém mexer aqui. */
  const ambos = rosa.filter((santo) => santo.paes.length === 2);

  return (
    <section aria-labelledby="paes" className="seccao">
      <div className="envolvente">
        <h2
          id="paes"
          className="titulo-display titulo-beta max-w-[16ch]"
        >
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[48ch] text-tinta-suave">{t("texto")}</p>
      </div>

      <div className="surgir mt-14">
        {/* `lg:min-h-[30rem]`: com o preenchimento dos painéis a mandar na
            altura, a linha ficava em ~335 px e a fotografia saía numa nesga
            larga — cortava-se justamente o empilhado de hambúrgueres que é a
            razão de ela estar aqui. */}
        <div className="grid gap-px bg-tinta/10 lg:min-h-[30rem] lg:grid-cols-[0.85fr_1fr_1fr]">
          {/* A fotografia e o vídeo. Em ecrã largo é uma coluna de altura
              inteira; no telemóvel é uma faixa por cima dos painéis. */}
          <Reel
            video="/reels/04.mp4"
            cartaz="/fotos/02.webp"
            sizes="(max-width: 64rem) 100vw, 30vw"
            className="aspect-[4/5] lg:aspect-auto lg:h-full"
          />

          {/* ⚠️ O painel do rosa usa o magenta escuro e não o da marca: leva uma
              lista de nomes em corpo pequeno, e o magenta claro não chega aos
              4,5:1 — ver a tabela de contraste em `globals.css`. */}
          <Painel
            cor="bloco-magenta-texto"
            titulo={t("rosa")}
            quantos={t("quantos", { n: rosa.length })}
            santos={rosa}
            decoracao="text-papel/25"
          />
          <Painel
            cor="bloco-turquesa"
            titulo={t("azul")}
            quantos={t("quantos", { n: azul.length })}
            santos={azul}
            decoracao="text-tinta/20"
          />
        </div>

        {ambos.map((santo) => (
          <div key={santo.id} className="bloco-coral">
            <div className="envolvente flex flex-wrap items-baseline gap-x-6 gap-y-2 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                {t("ambos")}
              </p>
              <h3 className="titulo-display text-[clamp(1.75rem,4vw,2.75rem)]">
                <Link
                  href={`/ementa#${santo.id}`}
                  className="underline decoration-tinta/40 decoration-2 underline-offset-[0.3em] transition-colors duration-200 hover:decoration-tinta"
                >
                  {santo.nome}
                </Link>
              </h3>
              <p className="tabular-nums">
                {santo.gramas ? `${santo.gramas} g · ` : ""}
                {formatarPreco(santo.preco, locale)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Painel({
  cor,
  titulo,
  quantos,
  santos,
  decoracao,
}: {
  cor: string;
  titulo: string;
  quantos: string;
  santos: { id: string; nome: string; paes: string[] }[];
  decoracao: string;
}) {
  return (
    <div className={`relative overflow-hidden px-[clamp(1.5rem,4vw,3rem)] py-14 ${cor}`}>
      <span
        aria-hidden
        className={`traco pointer-events-none absolute -bottom-10 -right-10 size-56 ${decoracao}`}
        style={{
          maskImage: "url(/tracos/hamburguer.png)",
          WebkitMaskImage: "url(/tracos/hamburguer.png)",
        }}
      />

      <div className="relative">
        <h3 className="titulo-display text-3xl">{titulo}</h3>
        {/* ⚠️ Sem `opacity`: sobre o magenta, um `opacity-70` no papel derruba o
            contraste de 4,57:1 para cerca de 3,1:1 e este texto reprova. Sobre
            magenta ou é papel a 100% ou muda-se de fundo. */}
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.15em]">
          {quantos}
        </p>

        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
          {santos.map((santo) => (
            <li key={santo.id}>
              <Link
                href={`/ementa#${santo.id}`}
                className="text-lg underline decoration-current/40 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-current"
              >
                {santo.nome}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

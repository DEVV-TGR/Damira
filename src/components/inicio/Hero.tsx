import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";

/**
 * O primeiro ecrã: **campo de tijolo chapado, com o motivo das ondas em grande e
 * o título por cima.**
 *
 * ## Porque não há fotografia nenhuma aqui
 *
 * Porque ainda não há fotografia nenhuma da Damira. O que existe são cinco PDFs
 * com o texto queimado por cima das imagens, e recortá-las dá ficheiros de 800
 * px com o grão do JPEG à vista — num herói a sangrar isso vê-se a dois metros.
 *
 * A alternativa não é pôr fotografia de banco de imagens: é **fazer o herói com
 * o que a marca tem mesmo**, que é tipografia grande, uma cor e um motivo
 * próprio. Quando a sessão fotográfica acontecer, este bloco recebe-a — e o
 * desenho não muda, só ganha uma camada por baixo. Ver o README.
 *
 * ## O motivo, e porque é enorme
 *
 * As três ondas são o **m** do logótipo recortado (ver `scripts/extrair-marca.mjs`).
 * A 40 % da altura do bloco deixam de se ler como um ícone e passam a ler-se
 * como textura — que é o que se quer: quem chega vê a marca sem a estar a
 * decifrar.
 *
 * ⚠️ **Papel a 100 %, sem opacidade.** Sobre o tijolo há muito pouca folga: a
 * 90 % o rácio cai de 6,87:1 para 5,50:1 e a 80 % já reprova em corpo pequeno.
 * Ver a tabela em `globals.css`.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="bloco-tijolo relative overflow-hidden">
      {/* Decorativo e por baixo de tudo. Corre para fora do bloco à direita de
          propósito: um motivo cortado pela margem lê-se como padrão contínuo, um
          motivo inteiro e centrado lê-se como um logótipo repetido. */}
      <span
        aria-hidden
        className="traco pointer-events-none absolute -right-[8%] top-1/2 hidden h-[130%] w-[45%] -translate-y-1/2 opacity-[0.13] lg:block"
        style={{
          maskImage: "url(/marca/ondas.png)",
          WebkitMaskImage: "url(/marca/ondas.png)",
        }}
      />

      <div className="envolvente relative py-[clamp(4rem,11vw,8rem)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em]">
          {marca("desde", { ano: casa.desde })}
        </p>

        <h1
          className="titulo-display mt-6 text-[clamp(2.75rem,9vw,7rem)] uppercase"
          style={{
            /* Muito condensado e em caixa alta: é o registo dos impressos, e a
               Bricolage tem eixo de largura para lá chegar sem trocar de fonte. */
            fontVariationSettings: '"wdth" 62, "opsz" 48',
            /* A entrelinha global é 0,95, que a este corpo faz a cauda do **Q**
               bater na linha de cima. */
            lineHeight: "1.02",
          }}
        >
          {marca("assinatura")}
        </h1>

        <p className="mt-6 max-w-[44ch] text-lg leading-relaxed">
          {t("heroTexto")}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/ementa"
            className="premivel rounded-full bg-papel px-7 py-4 text-sm font-semibold uppercase tracking-widest text-tinta"
          >
            {t("verEmenta")}
          </Link>
          <Link
            href="/encomendas"
            className="premivel rounded-full border border-papel px-7 py-4 text-sm font-semibold uppercase tracking-widest hover:bg-papel hover:text-tinta"
          >
            {t("verEncomendas")}
          </Link>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em]">
          {casa.cidade}
          {casa.distrito ? ` · ${casa.distrito}` : ""}
        </p>
      </div>
    </section>
  );
}

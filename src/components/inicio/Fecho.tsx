import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Marca } from "@/components/Marca";

/**
 * O fecho da homepage: o primeiro andar do bloco escuro que acaba a página.
 *
 * ## Uma cor só, do fecho ao fim
 *
 * ⚠️ **Isto era um bloco magenta entalado entre o papel e o rodapé escuro**, e o
 * fundo da página lia-se como quatro coisas seguidas: casas em papel-fundo,
 * fecho em magenta, fita em tinta, rodapé em tinta. Três cores em quatro blocos,
 * quando o que se quer é uma aterragem.
 *
 * Agora o fecho, a fita dos santos e o rodapé partilham a **tinta** e leem-se
 * como um bloco só. O magenta fica onde tem força — no herói e no botão daqui.
 *
 * ## E as moradas saíram
 *
 * Estavam **três vezes na mesma página**: na secção das casas, aqui, e no
 * rodapé. Ficam no rodapé, que é onde alguém as procura e onde já vivem ao lado
 * do telefone e das redes. Aqui fica o que este bloco tem de próprio: a marca em
 * tamanho — o site nunca a mostra acima de `text-3xl` — e a única acção que
 * falta a quem chegou ao fim.
 *
 * ⚠️ **Não há botão de reserva.** Não há telefone nos dados, não há reservas e
 * não há formulário: inventar um terceiro botão era desenhar uma funcionalidade
 * que não existe.
 */
export function Fecho() {
  const t = useTranslations("inicio.fecho");
  const nav = useTranslations("inicio");

  return (
    <section
      aria-labelledby="fecho"
      className="overflow-hidden bg-tinta text-papel"
    >
      <div className="envolvente grid items-center gap-12 pb-[clamp(2.5rem,6vw,4rem)] pt-[clamp(3.5rem,8vw,6rem)] lg:grid-cols-[minmax(0,1fr)_clamp(18rem,28vw,24rem)] lg:gap-16">
        <div>
          {/* Invisível, mas é o que dá nome a esta secção no índice de um leitor
              de ecrã. Dizia «Onde nos encontrar» de quando as moradas estavam
              aqui — com elas no rodapé, o nome passou a descrever o que este
              bloco faz mesmo, que é convidar para a carta. */}
          <h2 id="fecho" className="sr-only">
            {t("titulo")}
          </h2>

          <Marca empilhado className="text-[clamp(1.75rem,4.5vw,3.25rem)]" />

          {/* Sobre tinta há folga para diluir o branco: a 85% ainda dá 10,4:1.
              Sobre magenta não havia nenhuma — ver a tabela em `globals.css`. */}
          <p className="mt-8 max-w-[34ch] text-lg leading-relaxed text-papel/85">
            {t("texto")}
          </p>

          {/* O magenta que o bloco perdeu como fundo volta aqui, onde puxa o
              olho para a única acção da secção. Papel sobre magenta-forte dá
              4,57:1 e passa a qualquer tamanho. */}
          <Link
            href="/ementa"
            className="premivel mt-9 inline-block rounded-full bg-magenta-forte px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
          >
            {nav("verEmenta")}
          </Link>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
          <Image
            src="/fotos/01.webp"
            alt=""
            fill
            sizes="(max-width: 64rem) 100vw, 24rem"
            className="object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

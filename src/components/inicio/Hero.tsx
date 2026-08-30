import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";

/* O ano do logótipo. Vem do `casa.json` e não das mensagens, para não haver uma
   versão do "1996" por cada língua. */
const DESDE = casa.desde;

/**
 * O primeiro ecrã: **a fachada, o tijolo por cima dela, e o título.**
 *
 * ## A fotografia
 *
 * É a montra vista da rua — a mesma imagem que a casa usa como capa no
 * Facebook, e a única fotografia deste site que foi feita por um profissional.
 * Ganhou o lugar por três razões, e nenhuma delas é ser bonita:
 *
 * 1. **mostra a marca no sítio dela** — a placa com o pão e o vapor, o letreiro
 *    "Pão Quente" e o *Histórias com sabor* pintado no vidro, que é o mesmo
 *    texto que o `<h1>` escreve por cima;
 * 2. **é escura à esquerda**, que é exactamente onde o texto assenta, e clara à
 *    direita, onde não há nada por cima;
 * 3. **é uma fachada**, e uma fachada diz "isto existe e fica aqui" melhor do
 *    que um plano de comida — que é o que uma homepage tem de dizer antes de
 *    abrir o apetite.
 *
 * ## O véu, e os números que o decidem
 *
 * ⚠️ **Não é filtro de gosto, é contraste — e foi medido, não afinado a olho.**
 * O pior píxel da zona onde o texto assenta, com estas duas camadas, dá
 * **5,70:1** contra o papel. A tabela:
 *
 * | Véu                          | Pior ponto | |
 * |------------------------------|-----------|---|
 * | tijolo 70% + gradiente 85→45% | 8,17:1  | passa, e apaga a fotografia |
 * | **tijolo 55% + gradiente 75→35%** | **5,70:1** | **é este** |
 * | tijolo 45% + gradiente 70→30% | 4,49:1  | reprova por um triz |
 * | tijolo 30% + gradiente 60→20% | 2,93:1  | reprova |
 *
 * Começou nos 70% — que passava com folga e dava uma mancha castanha onde devia
 * estar a loja. A 55% a placa e o letreiro voltam a ver-se e ainda sobra mais de
 * um ponto de margem sobre o mínimo. **Abaixo disto não descer sem voltar a
 * medir**: o degrau seguinte já reprova.
 *
 * São duas camadas e não uma porque fazem coisas diferentes: o tijolo dá a cor
 * da marca em toda a superfície, o gradiente escurece só a metade esquerda. Uma
 * camada só teria de ser forte o suficiente para o pior ponto, e escurecia
 * também o lado direito, onde não é preciso.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="relative isolate overflow-hidden bg-tinta text-papel">
      <Image
        src="/fotos/06.webp"
        /* Decorativa: é ambiente, não descreve artigo nenhum, e o que interessa
           dela está escrito em texto por cima. */
        alt=""
        fill
        priority
        sizes="100vw"
        /* Centrada, e ⚠️ **um `object-position` horizontal aqui não faz nada** —
           experimentei. A fotografia é 16:9 e este bloco fica em torno de 2:1,
           portanto o `cover` corta em cima e em baixo e a largura entra
           inteira: não há folga horizontal por onde deslizar. Para deslocar a
           fachada seria preciso ampliá-la primeiro, e ampliar uma imagem de
           1920 px para a empurrar de lado é trocar nitidez por enquadramento.

           Deixa-se como está, e o resultado é melhor do que a correção: o
           *Histórias com sabor* pintado no vidro cai **por baixo** do `<h1>`,
           que escreve as mesmas palavras. Não se sobrepõem — o título acaba
           antes de ele começar — e a repetição lê-se como eco, não como erro. */
        className="object-cover object-center"
      />

      <div aria-hidden className="absolute inset-0 bg-tijolo/55" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-tinta/75 via-tinta/35 to-transparent"
      />

      <div className="envolvente relative py-[clamp(4.5rem,12vw,9rem)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em]">
          {marca("desde", { ano: DESDE })}
        </p>

        {/* ⚠️ **O slogan é da casa e não nosso.** Está pintado a itálico no vidro
            da montra, ao lado da porta — vê-se na própria fotografia que está
            por trás deste texto. O que aqui estava antes era uma frase que eu
            tinha escrito a descrever o negócio; esta é a que a casa escolheu
            para si própria, e não há concurso entre as duas. */}
        <h1
          className="titulo-display titulo-capa mt-6 uppercase"
          /* Muito condensado e em caixa alta: é o registo dos impressos, e a
             Bricolage tem eixo de largura para lá chegar sem trocar de fonte. */
          style={{ fontVariationSettings: '"wdth" 62, "opsz" 48' }}
        >
          {marca("assinatura")}
        </h1>

        <p className="mt-6 max-w-[42ch] text-lg leading-relaxed">
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
      </div>
    </section>
  );
}

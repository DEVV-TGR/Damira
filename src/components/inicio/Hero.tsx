import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa } from "@/data/casa";

/* O ano do logótipo. Vem do `casa.json` e não das mensagens, para não haver uma
   versão do "1996" por cada língua. */
const DESDE = casa.desde;

/**
 * O primeiro ecrã: **a vitrine, o tijolo por cima dela, e o título.**
 *
 * ## A fotografia
 *
 * É a montra vista de dentro, ao balcão: tarteletes, bolos de morango e
 * folhados, com a luz quente das prateleiras. Ganhou o lugar por duas razões, e
 * nenhuma delas é ser bonita:
 *
 * 1. **é escura e densa**, o que aguenta texto por cima sem precisar de um véu
 *    que a apague;
 * 2. **é o que a casa é** — uma vitrine cheia às sete da manhã diz mais sobre
 *    uma pastelaria do que qualquer plano de um doce isolado.
 *
 * ⚠️ **O lugar era da fachada e continua a ser.** A imagem certa para aqui é a
 * capa do Facebook da casa: a montra vista da rua, com a placa do pão, o
 * letreiro "Pão Quente" e o *Histórias com sabor* pintado no vidro — mostra a
 * marca no sítio dela e diz "isto existe e fica aqui", que é o que uma homepage
 * tem de dizer antes de abrir o apetite. **Não a temos em ficheiro**: no
 * Facebook é servida por um endereço assinado que não se guarda. Está pedida à
 * casa; quando chegar, entra como `/fotos/06.webp` e troca-se a linha do `src`.
 *
 * ⚠️ **O véu por cima não é filtro de gosto, é contraste.** Sem ele, o lado
 * claro da imagem deixa o papel abaixo de 3:1 e o título desaparece por cima do
 * vidro. São duas camadas de propósito: o tijolo dá a cor da marca, o gradiente
 * escurece só a metade esquerda. Um véu chapado forte apagava a fotografia
 * inteira; assim a fachada continua a ver-se à direita, onde não há texto.
 * **Não baixar as opacidades sem voltar a medir.**
 *
 * ## O que ainda não está bem
 *
 * ⚠️ **A fotografia tem 960 px de largura** e este bloco ocupa o ecrã todo: num
 * portátil isso já é ampliação, e num monitor grande vê-se. É a razão de haver
 * véu a sério por cima — e é o argumento mais forte para a sessão fotográfica.
 * Ver o README.
 */
export function Hero() {
  const t = useTranslations("inicio");
  const marca = useTranslations("marca");

  return (
    <section className="relative isolate overflow-hidden bg-tinta text-papel">
      <Image
        src="/fotos/01.webp"
        /* Decorativa: é ambiente, não descreve artigo nenhum, e o que interessa
           dela está escrito em texto por cima. */
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div aria-hidden className="absolute inset-0 bg-tijolo/70" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-tinta/85 via-tinta/45 to-transparent"
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
          className="titulo-display titulo-capa mt-6 text-[clamp(3rem,10vw,7.5rem)] uppercase"
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

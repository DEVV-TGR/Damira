import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * # Capítulo II: **o pão**. É o pico da página.
 *
 * O cliente escolheu-o na entrevista: *o pão a encher o ecrã*. Continua a ser a
 * única fotografia que ocupa o ecrã inteiro, continua a vir a seguir ao
 * silêncio, e continua sem uma letra por cima.
 *
 * ## ⚠️ Deixou de ser um acto preso, e foi o cliente que o pediu
 *
 * A primeira versão prendia a estampa durante 3,4 alturas de ecrã com a câmara
 * a avançar devagar. Era o que a skill chama «dar espaço ao pico» — e o cliente
 * viu-o e disse que ficávamos «muito presos» à fotografia. Tem razão: numa
 * página de dezanove ecrãs, três deles parados na mesma imagem são três ecrãs a
 * mais, sobretudo num telemóvel onde o polegar espera resposta a cada gesto.
 *
 * Agora é uma secção normal: a fotografia entra por limpeza de baixo para cima
 * (o sentido em que o pão sobe do forno), ocupa o ecrã, e a rolagem segue. O
 * pico é a imagem, não o tempo que se fica nela.
 *
 * ## A estampa não tem uma letra por cima
 *
 * ⚠️ **E é isto que resolve o choque com a gramática.** O `uniqueness.md` §2.2
 * proíbe imagem a sangrar por baixo do texto. O que a regra defende é que não
 * se escreve sobre fotografia, e aqui não se escreve: o título vem antes, e a
 * legenda vem por baixo, na sua linha, depois de a estampa acabar.
 */
export function Pao() {
  const t = useTranslations("cartaz.pao");

  return (
    <>
      {/* ⚠️ **O título vem antes da fotografia, e é o cliente que o pede.** A
          primeira versão punha a estampa primeiro e a legenda com o título por
          baixo — e no telemóvel isso dava a fotografia sem nome, seguida do
          título «Pão da aldeia», seguido logo do título do capítulo III: dois
          títulos seguidos, sem se perceber a qual deles pertencia a imagem.

          Com o título em cima, a fotografia fica entre o seu nome e o capítulo
          seguinte, que é o padrão de todos os outros capítulos. A legenda
          pequena continua por baixo da estampa, onde uma legenda vive. */}
      <section className="cap cap--legenda cap--legenda--antes" aria-labelledby="pao">
        <div className="cap__caixa" data-sc-in data-sc-stagger="50">
          <p className="cap__olho">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>
          <h2 id="pao" className="cap__titulo">
            {t("titulo")}
          </h2>
          <p className="cap__texto">{t("nota")}</p>
        </div>
      </section>

      <section id="cap-pao" className="cap cap--pao" data-capitulo data-sc-act="flow">
        <figure className="pao__estampa" data-sc-reveal="up" data-sc-reveal-at="0.02 0.45">
          <Image
            src="/fotos/01.webp"
            alt={t("legenda")}
            fill
            sizes="100vw"
            className="pao__foto"
          />
          <figcaption className="pao__legenda">{t("legenda")}</figcaption>
        </figure>
      </section>
    </>
  );
}

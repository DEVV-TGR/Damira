import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * # Capítulo II: **o pão**. É o pico da página.
 *
 * O cliente escolheu-o na entrevista: *o pão a encher o ecrã*. O `feel.md` §2
 * diz que o pico leva três coisas à custa dos outros actos, e leva-as todas
 * aqui: o maior vão da página com folga visível (3,4 contra 1,6 do segundo
 * maior), o silêncio imediatamente antes, e a única fotografia que ocupa o
 * ecrã inteiro.
 *
 * ## A estampa não tem uma letra por cima
 *
 * ⚠️ **E é isto que resolve o choque com a gramática.** O `uniqueness.md` §2.2
 * proíbe imagem a sangrar por baixo do texto: a imagem vive na sua coluna, com
 * legenda. O que a regra defende é que não se escreve sobre fotografia, e aqui
 * não se escreve — isto é uma **estampa de página inteira**, que é coisa que o
 * impresso faz há um século, e a legenda vem por baixo, na sua linha, depois de
 * a estampa acabar.
 *
 * O efeito colateral é o melhor argumento a favor: sem texto por cima não há
 * véu nenhum a pôr, e a fotografia fica com o contraste inteiro dela.
 *
 * ## O avanço é uma escala, e vem do `--sc-p`
 *
 * O motor publica o progresso do acto na própria `<section>`, portanto o
 * avanço da câmara faz-se em CSS puro, sem uma linha de JavaScript deste lado.
 * Começa em 1,02 e não em 1 porque com `object-fit: cover` uma escala exacta de
 * 1 deixa a orla do `<Image>` a coincidir com a do palco, e qualquer
 * arredondamento de sub-píxel abre um fio de fundo na berma.
 */
export function Pao() {
  const t = useTranslations("cartaz.pao");

  return (
    <>
      <section
        id="cap-pao"
        className="cap cap--pao"
        data-capitulo
        data-sc-act="pin"
        data-sc-span="3.4"
      >
        <div data-sc-stage className="pao__palco">
          <div className="pao__estampa">
            <Image
              src="/fotos/01.webp"
              alt={t("legenda")}
              fill
              sizes="100vw"
              className="pao__foto"
            />
          </div>
        </div>
      </section>

      {/* A legenda da estampa, fora do palco. Numa peça impressa a legenda não
          está dentro da chapa: está por baixo dela, em corpo pequeno, e diz o
          que se está a ver. */}
      <section className="cap cap--legenda" aria-labelledby="pao">
        <div className="cap__caixa" data-sc-in data-sc-stagger="50">
          <p className="cap__olho">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>
          <h2 id="pao" className="cap__titulo">
            {t("titulo")}
          </h2>
          <p className="cap__legendaLinha">{t("legenda")}</p>
          <p className="cap__texto">{t("nota")}</p>
        </div>
      </section>
    </>
  );
}

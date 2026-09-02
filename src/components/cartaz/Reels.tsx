import Image from "next/image";
import { useTranslations } from "next-intl";
import { redes, publicado } from "@/data/redes";
import { marca } from "@/data/marca";
import { VaporMarca } from "./Vapor";

/**
 * # Os reels: seis lugares para o vídeo da casa
 *
 * A casa publica vídeo no Instagram, sempre em formato reel. Esta secção é o
 * sítio onde ele entra.
 *
 * ## Hoje os seis lugares estão vazios, e isso está à vista
 *
 * ⚠️ **Um lugar vazio diz que está vazio.** Não temos os endereços dos reels
 * nem capas deles, e o `marca.json` tem o Instagram a `null` — não sabemos
 * sequer a conta. Um espaço desenhado e visivelmente por encher é honesto;
 * um vídeo de outra pessoa lá dentro seria a mesma promessa por cumprir que o
 * `AGENTS.md` proíbe nas fotografias de banco de imagens.
 *
 * Encher um lugar é acrescentar duas linhas ao `src/data/redes.json`. Ver esse
 * ficheiro para o formato e para a razão de não se usar o incorporador do
 * Instagram.
 *
 * ## O formato é o do reel, e não o da página
 *
 * As celas são **9:16**, que é o formato em que os vídeos foram filmados.
 * Recortá-los para paisagem para encaixarem melhor numa grelha é deitar fora
 * metade de cada plano.
 *
 * ## É um `pan`, exactamente como o capítulo da festa
 *
 * O cliente viu os dois lado a lado e quis os reels a funcionar como os kits:
 * a secção toma o ecrã inteiro, prende-se, e a rolagem para baixo faz os vídeos
 * atravessarem da direita para a esquerda. É o mesmo dispositivo do motor, com
 * a mesma regra: o título entra como primeiro item do carril e o bloco do
 * Instagram como último, para o curso ter largura.
 *
 * ⚠️ O carril tem de transbordar a largura do ecrã em qualquer monitor, senão
 * o acto morre — ver `Festa.tsx` e a armadilha 11 do AGENTS.md. É por isso que
 * tem `min-width: 165vw`. Com movimento reduzido o motor transforma-o num
 * carril nativo que se arrasta com o dedo.
 *
 * ## Acessibilidade
 *
 * ⚠️ **Um lugar por encher não é um botão.** Enquanto está vazio é um `<div>`
 * e não recebe foco: quem navega por teclado não tropeça em seis paragens que
 * não fazem nada. Assim que tem endereço passa a `<a>`, com alvo de toque
 * inteiro e a legenda a dizer que abre no Instagram.
 */
export function Reels() {
  const t = useTranslations("cartaz.reels");
  const conta = marca.instagram;

  return (
    <section
      id="cap-reels"
      className="cap cap--reels"
      data-capitulo
      data-sc-act="pan"
      data-sc-span="3"
      aria-labelledby="reels"
    >
      <div data-sc-stage>
        <div className="reels__carril" data-sc-pan="0.06">
          <div className="reels__abertura">
            <p className="cap__olho">
              <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
            </p>
            <h2 id="reels" className="cap__titulo">
              {t("titulo")}
            </h2>
            <p className="cap__texto">{conta ? t("texto") : t("textoSemConta")}</p>
          </div>

      {/* ⚠️ **Limpeza e não entrada escalonada**, e a razão é a regra da
          variedade: a vitrine, aqui mesmo em cima, já entra por escalonamento,
          e duas secções seguidas com o mesmo dispositivo são uma secção
          mostrada duas vezes. As celas revelam-se de baixo para cima, que é o
          sentido em que um vídeo vertical se lê. */}
          <ul className="reels__fila" aria-label={t("titulo")}>
        {redes.reels.map((reel, indice) =>
          publicado(reel) ? (
            <li key={reel.id} className="reels__cela">
              <a href={reel.url!} target="_blank" rel="noopener noreferrer">
                <Image
                  src={reel.poster!}
                  alt={t("verNoInstagram")}
                  width={720}
                  height={1280}
                  loading="lazy"
                  sizes="(max-width: 48rem) 60vw, 18rem"
                />
                <span className="reels__rotulo">{t("verNoInstagram")}</span>
              </a>
            </li>
          ) : (
            <li key={reel.id} className="reels__cela" data-vazia>
              <div className="reels__espaco">
                <VaporMarca className="reels__marca" />
                <span className="reels__rotulo">
                  {t("espaco", { n: indice + 1 })}
                </span>
              </div>
            </li>
          ),
        )}
      </ul>

          <div className="reels__instagram">
            {conta ? (
              <>
                <p className="cap__olho">{t("instagram")}</p>
                <a className="cap__accao cap__accao--claro" href={conta} target="_blank" rel="noopener noreferrer">
                  {t("seguir", { utilizador: marca.instagramUtilizador ?? "" })}
                </a>
              </>
            ) : (
              <p className="cap__texto">{t("textoSemConta")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

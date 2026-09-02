import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * As quatro fotografias da casa.
 *
 * ## Este bloco estava marcado como buraco, e é o que o fecha
 *
 * A homepage foi composta a contar com fotografia entre as festas e os
 * contactos, e durante todo o arranque esse lugar esteve vazio.
 *
 * ## São as da casa, e vê-se
 *
 * ⚠️ **Todas trazem a marca de água da Damira**, e é esse o critério de seleção
 * — não a composição. As primeiras que aqui estiveram vinham do álbum geral do
 * TripAdvisor, misturado com fotografias de clientes: uma delas era uma igreja
 * e outra era de outro estabelecimento. As deste álbum foram publicadas pela
 * própria casa, e a marca de água é a prova de origem que uma fotografia solta
 * não tem.
 *
 * ## Porque são estas quatro
 *
 * Havia dezasseis, quase todas boas. Estas quatro não são as mais bonitas — são
 * as que **contam quatro coisas diferentes**, e é isso que uma grelha de quatro
 * tem de fazer:
 *
 * - **o pão da aldeia**, que é o negócio que dá nome à casa e o desenho que está
 *   no símbolo;
 * - **as tarteletes de morango**, com a mão do pasteleiro em cima — é a única
 *   que mostra que aquilo é feito ali;
 * - **os bombons**, que dizem que a casa faz coisas finas e não só almoços;
 * - **o prato de peixe**, que prova o serviço de mesa.
 *
 * ⚠️ Oito fotografias de doçaria seguidas não seriam o dobro desta secção; seriam
 * a mesma imagem repetida oito vezes com açúcares diferentes.
 *
 * A quarta substituiu uma fotografia da sala que mostrava **clientes de frente e
 * reconhecíveis** — e isso resolveu de caminho um problema de consentimento que
 * teria de ser tratado antes do site ir para o ar. O prato diz a mesma coisa
 * sobre o almoço e não põe a cara de ninguém no site.
 *
 * ⚠️ **A célula é 4:5 e as fotografias são 16:10** — mais altas do que largas
 * contra mais largas do que altas. O `cover` resolve isso **cortando nos lados
 * e mantendo a altura inteira**, e não ao contrário: a foto entra a 40% da
 * escala, o que dá altura exacta e largura a mais.
 *
 * Isso é o que salva a marca de água. Ela vive no fundo ao centro de cada
 * fotografia e é a prova de que a imagem é da casa — o critério por que estas
 * quatro foram escolhidas. Com este enquadramento sobrevive nas quatro
 * (verificado a olho, não deduzido). ⚠️ **Um `object-position` que empurre para
 * o topo cortaria o fundo e levava-a com ele.**
 */
const FOTOS = [
  { src: "/fotos/01.webp", chave: "pao" },
  { src: "/fotos/02.webp", chave: "tartes" },
  { src: "/fotos/03.webp", chave: "bombons" },
  { src: "/fotos/04.webp", chave: "almoco" },
] as const;

export function Fotografia() {
  const t = useTranslations("inicio.fotografia");

  return (
    <section aria-labelledby="fotografia" className="seccao">
      <div className="envolvente">
        <h2 id="fotografia" className="titulo-display titulo-beta max-w-[16ch]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[46ch] text-tinta-suave">{t("texto")}</p>

        <ul className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FOTOS.map((foto) => (
            <li
              key={foto.src}
              className="relative aspect-[3/4] overflow-hidden rounded-xl bg-papel-fundo"
            >
              <Image
                src={foto.src}
                alt={t(`legendas.${foto.chave}`)}
                fill
                loading="lazy"
                sizes="(max-width: 64rem) 50vw, 22rem"
                className="object-cover"
              />
            </li>
          ))}
        </ul>

        {/* Quem tirou as fotografias é a casa, e dizê-lo não é cortesia: é o que
            distingue estas de fotografia de banco de imagens — que é
            exactamente o que este site se recusou a usar. */}
        <p className="mt-6 text-sm text-tinta-suave">{t("credito")}</p>
      </div>
    </section>
  );
}

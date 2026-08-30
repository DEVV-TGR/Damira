import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * As quatro fotografias da casa.
 *
 * ## Este bloco estava marcado como buraco, e é o que o fecha
 *
 * A homepage foi composta a contar com fotografia entre as festas e os
 * contactos, e durante todo o arranque esse lugar esteve vazio — não havia uma
 * única imagem utilizável da Damira. Estas vieram do TripAdvisor e da própria
 * casa. Não são uma sessão fotográfica; são o que existe.
 *
 * ## Porque são quatro e não oito
 *
 * Porque só quatro sobrevivem a ser vistas grandes. As outras que se
 * recuperaram têm etiquetas de preço à vista, embalagens de plástico no
 * enquadramento, ou são fotografias de clientes tiradas à mesa. **Uma grelha
 * cheia com material fraco não parece mais completa — parece descuidada**, e num
 * site de pastelaria a fotografia é metade do argumento.
 *
 * A ordem não é estética: vitrine (o que se vê ao entrar) → tigela (o que a casa
 * faz de melhor) → sala (que há serviço de mesa, coisa que ninguém adivinha de
 * uma pastelaria) → placa (onde é).
 *
 * ⚠️ **A fotografia da sala tem clientes de frente e reconhecíveis.** Numa demo
 * é aceitável; **antes de o site ir para o ar a sério**, a casa tem de ter o
 * consentimento dessas pessoas, ou a imagem sai. Está na lista *Antes de
 * publicar* do README, e não é formalidade: é a única imagem do site que mostra
 * pessoas identificáveis.
 *
 * ⚠️ **Alturas fixas por célula, e não a proporção de cada ficheiro.** As quatro
 * imagens têm três proporções diferentes (4:3, 1:1 e 3:4) e uma grelha que as
 * respeitasse dava uma escada. Com `object-cover` dentro de uma altura comum,
 * cada uma perde o que tem a mais nas bordas — que em fotografia de vitrine não
 * custa nada, porque o assunto está sempre no meio.
 */
const FOTOS = [
  { src: "/fotos/02.webp", chave: "vitrine" },
  { src: "/fotos/03.webp", chave: "tigela" },
  { src: "/fotos/04.webp", chave: "sala" },
  { src: "/fotos/05.webp", chave: "placa" },
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

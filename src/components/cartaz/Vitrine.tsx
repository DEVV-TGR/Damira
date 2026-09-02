"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Ampliar, type Ampliavel } from "./Ampliar";

/**
 * # A vitrine: treze fotografias da casa
 *
 * ## De onde vêm, e porque são de fiar
 *
 * ⚠️ **Todas trazem a marca de água da Damira**, e é esse o critério. Saem de
 * `originais/fotos-gestao`, o álbum publicado pela própria casa — não do álbum
 * geral, onde as fotografias de clientes se misturam com as da loja e onde uma
 * delas era de outro estabelecimento. A marca de água é a prova de origem que
 * uma fotografia solta não tem.
 *
 * ## As três que ficaram de fora, e porquê
 *
 * O álbum tem dezasseis. Ficaram catorze:
 *
 * - **O pão da aldeia e as tarteletes de morango saíram**, e por uma razão só:
 *   são o pico da página e o capítulo III. Repeti-las aqui em miniatura gasta
 *   o pico, e um pico gasto deixa de ser pico.
 *
 * ⚠️ **A fotografia da sala mostra dois clientes de frente e reconhecíveis.**
 * Levantei a questão do consentimento e o cliente decidiu usá-la: é do álbum
 * publicado pela própria casa, e quem sabe se aquelas pessoas autorizaram é
 * ele e não eu. Fica registado aqui para quem vier a seguir saber que a
 * pergunta foi feita e respondida, e não esquecida — se a autorização não
 * existir, é esta a linha a apagar.
 *
 * ## A grelha é irregular de propósito
 *
 * ⚠️ O `taste.md` proíbe uma grelha de cartões iguais como estrutura de página,
 * e treze células do mesmo tamanho são exactamente isso: uma folha de contacto.
 * Aqui há três tamanhos, distribuídos por um padrão fixo, e o resultado lê-se
 * como uma montra — que é o que é.
 *
 * ⚠️ **E nenhuma célula chega ao tamanho da estampa do pico.** Se chegasse,
 * havia dois picos na página, e uma página com dois picos não tem nenhum.
 *
 * ## Cada célula é um botão que amplia
 *
 * Um `<button>` e não um `<a>` nem um `<div>` com `onClick`: é uma acção na
 * própria página (abre o `<dialog>` de `Ampliar.tsx`), recebe foco pelo
 * teclado, e o leitor de ecrã anuncia-o como botão com o nome da fotografia. O
 * `<img>` lá dentro mantém o `alt`, que é o que se lê quando a imagem não
 * carrega.
 */
const FOTOS = [
  { ficheiro: "01", chave: "montra", largura: 2 },
  { ficheiro: "02", chave: "folhados", largura: 1 },
  { ficheiro: "13", chave: "fabrico", largura: 1 },
  { ficheiro: "06", chave: "caramelo", largura: 1 },
  { ficheiro: "07", chave: "bombons", largura: 2 },
  { ficheiro: "08", chave: "castanhas", largura: 1 },
  { ficheiro: "12", chave: "duchesse", largura: 1 },
  { ficheiro: "11", chave: "hungaros", largura: 1 },
  { ficheiro: "05", chave: "boloRei", largura: 2 },
  { ficheiro: "03", chave: "boloReiChila", largura: 1 },
  { ficheiro: "04", chave: "boloReiChocolate", largura: 1 },
  { ficheiro: "10", chave: "peixe", largura: 1 },
  { ficheiro: "15", chave: "frango", largura: 1 },
  { ficheiro: "09", chave: "sala", largura: 2 },
] as const;

export function Vitrine() {
  const t = useTranslations("cartaz.vitrine");
  const [aberta, setAberta] = useState<number | null>(null);

  const itens: Ampliavel[] = FOTOS.map((foto) => ({
    src: `/vitrine/${foto.ficheiro}.webp`,
    alt: t(`legendas.${foto.chave}`),
    largura: 1400,
    altura: 875,
  }));

  return (
    <section
      id="cap-vitrine"
      className="cap cap--vitrine"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="vitrine"
    >
      <div className="cap__caixa" data-sc-in data-sc-stagger="50">
        <p className="cap__olho">
          <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
        </p>
        <h2 id="vitrine" className="cap__titulo">
          {t("titulo")}
        </h2>
        <p className="cap__texto">{t("texto")}</p>
      </div>

      <ul className="vitrine__grelha" data-sc-in data-sc-stagger="40">
        {FOTOS.map((foto, indice) => (
          <li
            key={foto.ficheiro}
            className="vitrine__celula"
            data-larga={foto.largura === 2 ? "" : undefined}
          >
            <button
              type="button"
              className="vitrine__botao"
              aria-label={t("ampliar", { nome: t(`legendas.${foto.chave}`) })}
              onClick={() => setAberta(indice)}
            >
              <Image
                src={`/vitrine/${foto.ficheiro}.webp`}
                alt={t(`legendas.${foto.chave}`)}
                width={1400}
                height={875}
                loading="lazy"
                sizes="(max-width: 48rem) 90vw, (max-width: 72rem) 45vw, 30vw"
              />
            </button>
          </li>
        ))}
      </ul>

      <Ampliar itens={itens} indice={aberta} aoFechar={() => setAberta(null)} aoMudar={setAberta} />

      {/* Dizer de quem são não é cortesia: é o que distingue estas de
          fotografia de banco de imagens, que é o que este sítio recusa. */}
      <p className="cap__nota">{t("credito")}</p>
    </section>
  );
}

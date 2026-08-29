"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  cartasComArtigos,
  categoriasDaCarta,
  type Artigo,
} from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { NavegacaoEmenta } from "./NavegacaoEmenta";
import { SeccaoEmenta } from "./SeccaoEmenta";
import { PainelArtigo } from "./PainelArtigo";

/**
 * As faces de cada carta.
 *
 * ## Porque a cor está no cabeçalho da carta e não nas secções
 *
 * No Santo Burga as secções alternavam entre quatro fundos chapados, como as
 * duas páginas A3 do impresso. Aqui isso não resulta, por duas razões que só se
 * veem com estes dados à frente:
 *
 * 1. **a paleta tem uma cor de acento, não três** — alternar entre tijolo e
 *    papel de duas em duas secções dá uma zebra, não um ritmo;
 * 2. **o verde é do vegan** e não está disponível como face decorativa (ver o
 *    cabeçalho do `globals.css`) — usá-lo numa secção de leitão porque calhou
 *    ser a terceira ensinava o olho a ignorá-lo onde ele conta.
 *
 * A cor passa então a marcar **a carta**, que é a divisão que existe mesmo: são
 * quatro folhetos diferentes, e o salto de cor é o que diz a quem rola que
 * mudou de documento. Dentro de cada um, o corpo é sempre papel — que é o que
 * deixa ler noventa e cinco artigos sem cansar.
 */
const FACES: Record<string, string> = {
  casa: "bloco-tijolo",
  "fim-de-semana": "bg-papel-fundo text-tinta",
  vegan: "bloco-verde",
  chocolate: "bg-tinta text-papel",
};

/**
 * A carta inteira, e o painel que se abre por cima dela.
 *
 * É um componente de cliente porque o estado do artigo aberto tem de viver
 * algures acima das secções. Os dados são o `ementa.json` já validado — vão para
 * o cliente uma vez, e daí em diante abrir um artigo não pede nada ao servidor.
 *
 * **Sem JavaScript continua a ler-se tudo:** as secções são marcação normal e
 * cada artigo tem a sua âncora. O painel é um acréscimo, não a única forma de
 * ler a carta.
 */
export function Carta({ locale }: { locale: Locale }) {
  const [aberto, setAberto] = useState<Artigo | null>(null);
  const t = useTranslations("ementa");
  const cartas = cartasComArtigos();

  return (
    <>
      <NavegacaoEmenta cartas={cartas} />

      {cartas.map((carta) => {
        const categorias = categoriasDaCarta(carta);

        return (
          <div key={carta}>
            {/* O cabeçalho da carta é a única superfície de cor. `scroll-mt`
                conta com o cabeçalho do site e a barra de navegação, que são
                dois elementos fixos e somam ~8rem. */}
            <div
              id={carta}
              className={`scroll-mt-32 ${FACES[carta]} py-[clamp(2.5rem,5vw,4rem)]`}
            >
              <div className="envolvente">
                <h2
                  className="titulo-display titulo-beta uppercase"
                  style={{ fontVariationSettings: '"wdth" 68, "opsz" 44' }}
                >
                  {t(`cartas.${carta}.titulo`)}
                </h2>
                <p className="mt-3 max-w-[52ch]">{t(`cartas.${carta}.texto`)}</p>
              </div>
            </div>

            {categorias.map((categoria, indice) => (
              <SeccaoEmenta
                key={`${carta}-${categoria}`}
                carta={carta}
                categoria={categoria}
                indice={indice}
                locale={locale}
                aoAbrir={setAberto}
              />
            ))}
          </div>
        );
      })}

      {/* O `<dialog>` devolve o foco ao elemento que o abriu quando fecha — é
          comportamento nativo e é por isso que não há aqui um `ref` a guardá-lo. */}
      <PainelArtigo artigo={aberto} locale={locale} aoFechar={() => setAberto(null)} />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  cartasComArtigos,
  categoriasDaCarta,
  daCarta,
  ementa,
  porCategoria,
  type Artigo,
} from "@/data/ementa";
import { filtrarArtigos } from "@/lib/procura";
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
 * A carta inteira, o filtro que a percorre, e o painel que se abre por cima.
 *
 * É um componente de cliente porque três estados têm de viver acima das
 * secções: o artigo aberto, o termo de procura e o interruptor do vegan.
 *
 * **Sem JavaScript continua a ler-se tudo:** as secções são marcação normal, o
 * filtro começa vazio (portanto não esconde nada) e cada artigo tem a sua
 * âncora. Procurar e abrir um artigo são acréscimos, não a única forma de ler a
 * carta.
 */
export function Carta({ locale }: { locale: Locale }) {
  const [aberto, setAberto] = useState<Artigo | null>(null);
  const [procura, setProcura] = useState("");
  const [soVegan, setSoVegan] = useState(false);
  const t = useTranslations("ementa");

  /* ⚠️ **O filtro corre uma vez por tecla, e não uma vez por secção.** São 95
     artigos e catorze secções; filtrar dentro de cada `SeccaoEmenta` refazia o
     trabalho catorze vezes e obrigava cada uma a saber se estava vazia depois
     de já ter renderizado o título. Aqui sai um mapa pronto: que secções
     mostrar, com que artigos, e quantos ao todo. */
  const resultado = useMemo(() => {
    const cartas = cartasComArtigos()
      .map((carta) => ({
        carta,
        categorias: categoriasDaCarta(carta)
          .map((categoria) => ({
            categoria,
            artigos: filtrarArtigos(
              porCategoria(carta, categoria),
              procura,
              soVegan,
            ),
          }))
          .filter((seccao) => seccao.artigos.length > 0),
      }))
      .filter((c) => c.categorias.length > 0);

    const encontrados = cartas.reduce(
      (soma, c) => soma + c.categorias.reduce((s, x) => s + x.artigos.length, 0),
      0,
    );

    return { cartas, encontrados };
  }, [procura, soVegan]);

  const aFiltrar = procura.trim().length > 0 || soVegan;

  return (
    <>
      <NavegacaoEmenta
        cartas={cartasComArtigos()}
        procura={procura}
        aoProcurar={setProcura}
        soVegan={soVegan}
        aoAlternarVegan={setSoVegan}
        encontrados={resultado.encontrados}
        total={ementa.length}
      />

      {/* ⚠️ **O vazio tem de dizer o que fazer a seguir**, e não só que não há
          nada. Um ecrã com "sem resultados" e mais nada deixa a pessoa a olhar
          para uma página que parece avariada; a saída é o botão de limpar, e
          por isso a frase aponta para ele. */}
      {resultado.cartas.length === 0 ? (
        <div className="seccao">
          <div className="envolvente">
            <p className="titulo-display titulo-beta">{t("semResultados")}</p>
            <p className="mt-4 max-w-[46ch] text-tinta-suave">
              {t("semResultadosTexto")}
            </p>
          </div>
        </div>
      ) : (
        resultado.cartas.map(({ carta, categorias }) => (
          <div key={carta}>
            {/* O cabeçalho da carta é a única superfície de cor. `scroll-mt`
                conta com o cabeçalho do site e a barra fixa, que somam ~13,5
                rem depois de a barra ter ganho a caixa de procura. ⚠️ Ficou nos
                8 rem antigos durante um bocado e o resultado era saltar para uma
                carta e aterrar com o título por baixo da barra.

                ⚠️ **Some enquanto se procura.** Quatro faixas de cor a separar
                dois resultados leem-se como quatro secções vazias — e a barra
                de cartas, que é o que elas anunciam, também já lá não está. */}
            {!aFiltrar && (
              <div
                id={carta}
                className={`scroll-mt-[13.5rem] ${FACES[carta]} py-[clamp(2.5rem,5vw,4rem)]`}
              >
                <div className="envolvente">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-75">
                    {t("quantosArtigos", { n: daCarta(carta).length })}
                  </p>
                  <h2
                    className="titulo-display titulo-beta mt-3 uppercase"
                    style={{ fontVariationSettings: '"wdth" 68, "opsz" 44' }}
                  >
                    {t(`cartas.${carta}.titulo`)}
                  </h2>
                  <p className="mt-3 max-w-[52ch]">
                    {t(`cartas.${carta}.texto`)}
                  </p>
                </div>
              </div>
            )}

            {categorias.map(({ categoria, artigos }) => (
              <SeccaoEmenta
                key={`${carta}-${categoria}`}
                carta={carta}
                categoria={categoria}
                artigos={artigos}
                locale={locale}
                aoAbrir={setAberto}
              />
            ))}
          </div>
        ))
      )}

      {/* O `<dialog>` devolve o foco ao elemento que o abriu quando fecha — é
          comportamento nativo e é por isso que não há aqui um `ref` a guardá-lo. */}
      <PainelArtigo artigo={aberto} locale={locale} aoFechar={() => setAberto(null)} />
    </>
  );
}

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
import { filtrarArtigos, normalizar } from "@/lib/procura";
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

/* A mesma cor, para o filete da etiqueta que aparece durante a procura. São os
   valores medidos do `globals.css`; o papel-fundo é claro de mais para um filete
   e leva a tinta-suave no lugar dele. */
const COR_DA_CARTA: Record<string, string> = {
  casa: "var(--color-tijolo)",
  "fim-de-semana": "var(--color-tinta-suave)",
  vegan: "var(--color-verde-forte)",
  chocolate: "var(--color-tinta)",
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
  const t = useTranslations("ementa");

  /* ⚠️ **O filtro corre uma vez por tecla, e não uma vez por secção.** São 95
     artigos e catorze secções; filtrar dentro de cada `SeccaoEmenta` refazia o
     trabalho catorze vezes e obrigava cada uma a saber se estava vazia depois
     de já ter renderizado o título. Aqui sai um mapa pronto: que secções
     mostrar, com que artigos, e quantos ao todo. */
  const resultado = useMemo(() => {
    const termo = normalizar(procura);
    const cartas = cartasComArtigos()
      .map((carta) => {
        /* ⚠️ **O nome da carta e o da secção também contam.** Nenhum artigo se
           chama «vegan» nem «doce» — a carta e a secção é que se chamam — e
           uma procura por «vegan» que devolvia «0 de 95» parecia avariada a
           quem a fez, ainda por cima com o placeholder a sugeri-la. Se o termo
           estiver no nome da carta, entra a carta inteira; se estiver no da
           secção, entra a secção inteira. */
        const cartaBate =
          termo.length > 0 &&
          [t(`cartas.${carta}.curto`), t(`cartas.${carta}.titulo`)].some((n) =>
            normalizar(n).includes(termo),
          );
        return {
          carta,
          categorias: categoriasDaCarta(carta)
            .map((categoria) => ({
              categoria,
              artigos:
                cartaBate ||
                (termo.length > 0 &&
                  normalizar(t(`categorias.${categoria}`)).includes(termo))
                  ? porCategoria(carta, categoria)
                  : filtrarArtigos(porCategoria(carta, categoria), procura),
            }))
            .filter((seccao) => seccao.artigos.length > 0),
        };
      })
      .filter((c) => c.categorias.length > 0);

    const encontrados = cartas.reduce(
      (soma, c) => soma + c.categorias.reduce((s, x) => s + x.artigos.length, 0),
      0,
    );

    return { cartas, encontrados };
  }, [procura, t]);

  const aFiltrar = procura.trim().length > 0;

  return (
    <>
      <NavegacaoEmenta
        cartas={cartasComArtigos()}
        procura={procura}
        aoProcurar={setProcura}
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
            {/* O cabeçalho da carta é a única superfície de cor.

                ⚠️ **O `scroll-mt` soma-se ao `scroll-padding-top: 8rem` que o
                `globals.css` já põe no `html`.** Medido: com 13,5 rem aqui, o
                cabeçalho aterrava a 344 px do topo, 152 px abaixo da barra. Os
                5 rem daqui mais os 8 rem de lá dão 13 rem = 208 px, e a barra
                acaba nos 192: aterra mesmo por baixo dela, com um dedo de ar.

                ⚠️ **Encolhe enquanto se procura, mas não some.** Quatro faixas
                de cor inteiras a separar dois resultados liam-se como quatro
                secções vazias; mas sem etiqueta nenhuma, dois «Doces» seguidos
                (o da casa e o vegan) não se distinguiam. Fica uma linha com o
                nome da carta e a cor dela no filete. */}
            {aFiltrar ? (
              <p
                className="envolvente mt-10 border-l-4 pl-4 text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ borderColor: COR_DA_CARTA[carta] }}
              >
                {t(`cartas.${carta}.curto`)}
              </p>
            ) : (
              <div
                id={carta}
                className={`scroll-mt-[5rem] ${FACES[carta]} py-[clamp(2.5rem,5vw,4rem)]`}
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

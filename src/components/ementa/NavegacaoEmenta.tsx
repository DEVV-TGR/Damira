"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { daCarta, type Carta } from "@/data/ementa";
import { FiltroEmenta } from "./FiltroEmenta";

/* O cabeçalho do sítio (4 rem) mais a barra fixa desta página, que com a caixa
   de procura e os separadores anda pelos 7,5 rem. É a altura que a carta activa
   tem de ultrapassar para contar como activa. */
const ALTURA_FIXA = 190;

/**
 * A barra fixa da ementa: **procurar, filtrar, e saltar de carta**.
 *
 * ## Porque a procura vive aqui e não no topo da página
 *
 * Porque a pergunta *onde está o croissant?* não se faz antes de rolar — faz-se
 * a meio, depois de a pessoa já ter percebido que são noventa e cinco artigos.
 * Uma caixa de procura no cabeçalho da página está fora do ecrã justamente
 * quando dá jeito. Numa barra fixa está sempre à mão, que é o que a torna útil.
 *
 * ## Porque salta para cartas e não para categorias
 *
 * Porque as categorias repetem-se entre cartas: há `doces` na carta da casa e
 * `doces` na vegan, `salgados` nas duas. Uma barra com "Doces · Salgados ·
 * Doces · Salgados" não é navegação, é um enigma. As cartas são quatro, têm
 * nomes que dizem alguma coisa a quem lê e são a divisão que existe no papel.
 *
 * ## O destaque da carta activa
 *
 * ⚠️ Aqui esteve escrito que um *scrollspy* era «pouco mais do que enfeite», e
 * isso valia enquanto a barra tinha quatro botões e mais nada. Deixou de valer:
 * com a procura ao lado, a barra passou a ter três funções e a pessoa precisa de
 * saber **onde está** antes de decidir se salta ou se procura. São quatro
 * observadores e vinte linhas.
 *
 * As âncoras continuam a ser ligações normais: funcionam com o site a carregar,
 * ficam no histórico e podem ser partilhadas (`/ementa#vegan`). O destaque é um
 * acréscimo, não a condição de nada.
 */
export function NavegacaoEmenta({
  cartas,
  procura,
  aoProcurar,
  soVegan,
  aoAlternarVegan,
  encontrados,
  total,
}: {
  cartas: Carta[];
  procura: string;
  aoProcurar: (valor: string) => void;
  soVegan: boolean;
  aoAlternarVegan: (valor: boolean) => void;
  encontrados: number;
  total: number;
}) {
  const t = useTranslations("ementa");
  const [activa, setActiva] = useState<Carta | null>(null);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setActiva(entrada.target.id as Carta);
        }
      },
      {
        /* A faixa de observação é uma tira fina logo abaixo do cabeçalho e da
           barra fixa, que somam à volta de 190 px. Sem esta margem, uma carta
           longa mantinha-se «a intersectar» durante toda a sua altura e a barra
           destacava duas ao mesmo tempo.

           ⚠️ **Em píxeis, e não em `rem`.** O `rootMargin` aceita `px` e `%` e
           mais nada: com `-8rem` o construtor atira `SyntaxError` — e como isto
           corre dentro de um efeito, a excepção sobe e o React **desmonta a
           árvore de cliente inteira**. O servidor mandava a página completa, o
           `build` passava, o `lint` passava, a página aparecia por um instante
           e depois ficava em branco. Foi preciso ler a consola do browser para
           dar com isto. */
        rootMargin: `-${ALTURA_FIXA}px 0px -70% 0px`,
      },
    );

    for (const carta of cartas) {
      const el = document.getElementById(carta);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
  }, [cartas]);

  return (
    <nav
      aria-label={t("navegar")}
      className="sticky top-16 z-40 border-y-2 border-tinta bg-papel"
    >
      <div className="envolvente flex flex-col gap-3 py-3">
        <FiltroEmenta
          procura={procura}
          aoProcurar={aoProcurar}
          soVegan={soVegan}
          aoAlternarVegan={aoAlternarVegan}
          encontrados={encontrados}
          total={total}
        />

        {/* ⚠️ **Escondida durante a procura, e de propósito.** A quem está a
            filtrar, saltar para uma carta não serve de nada: o resultado já é
            uma lista curta, e os separadores só ocupavam a barra com escolhas
            que não fazem o que prometem. */}
        {procura.trim().length === 0 && !soVegan && (
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 text-xs uppercase tracking-[0.15em] [scrollbar-width:none]">
            {cartas.map((carta) => {
              const eActiva = activa === carta;
              /* ⚠️ `shrink-0` no item: sem isso ele encolhe dentro do `flex` e o
                 `whitespace-nowrap` não o salva — a palavra parte-se na mesma e
                 «DA CASA» sai em duas linhas num telemóvel. */
              return (
                <li key={carta} className="shrink-0">
                  <a
                    href={`#${carta}`}
                    aria-current={eActiva ? "location" : undefined}
                    /* Utilitários e não uma classe `.bloco-*`: o Tailwind v4 não
                       aplica variantes (`hover:`) a classes de `@layer
                       components`, e um `hover:bloco-...` compila-se em silêncio
                       para nada.

                       O `premivel` traz a transição de cor **e** a resposta ao
                       carregar. Esta barra usa-se ao polegar, e ao toque não há
                       `hover` nenhum: sem estado de pressão, tocar num separador
                       não dava sinal antes de a página saltar. */
                    className={`premivel titulo-display flex h-11 items-center whitespace-nowrap rounded-full border-2 px-4 ${
                      eActiva
                        ? "border-tijolo bg-tijolo text-papel"
                        : "border-tinta/20 hover:border-tinta hover:bg-tinta hover:text-papel"
                    }`}
                  >
                    {t(`cartas.${carta}.curto`)}
                    <span className="ml-2 tabular-nums opacity-60">
                      {daCarta(carta).length}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}

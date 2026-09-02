"use client";

import { useEffect, useRef, useState } from "react";

export type CapituloDoFolio = {
  /** O `id` da `<section>`, para o marcador saber para onde salta. */
  id: string;
  /** O numeral romano. É fólio de peça impressa, não contador de secções. */
  numeral: string;
  titulo: string;
};

/* ---------------------------------------------------------------- o gesto --

   O desenho sai de `public/marca/ondas.svg`, que é o vapor do pão e ao mesmo
   tempo o **m** de *damira*. Lá, uma onda é uma altura de ~86 unidades com
   amplitude ~8, e sobe alternando o lado. Aqui repete-se esse mesmo módulo até
   dar a altura de um ecrã.

   ⚠️ **Repetir o módulo da marca, e não desenhar uma onda nova.** Uma sinusoide
   qualquer com a mesma cor não é a marca esticada — é um traço decorativo que
   por acaso ondula, e a assinatura desta página é precisamente o contrário
   disso: é a marca a fazer trabalho. */
const MODULO = 86;
/* ⚠️ **A amplitude não é a da marca, e tem de não ser.** O SVG estica-se com
   `preserveAspectRatio="none"` numa margem de ~104 px por 900 px de alto: o
   horizontal encolhe e o vertical alonga, portanto a onda achata. Com os 8 do
   ficheiro original o fio saía na captura como **três barras direitas** com um
   tremor — deixava de se ler como vapor, que é a coisa toda.

   ⚠️ E há tecto: os traços estão a 30 unidades um do outro e vão desfasados,
   por isso qualquer amplitude acima de 15 fá-los cruzarem-se. Aos 24 a captura
   mostrou uma **trança**, que é tão pouco vapor como as barras. Aos 12 ondulam
   e nunca se tocam.

   O traço também emagreceu (13 para 8): à largura da margem, 13 dava três
   colunas gordas a competir com o texto em vez de um fio. */
const AMPLITUDE = 12;
const ESPESSURA = 8;
/* Menos módulos, cada um mais alto: ondas grandes leem-se, ondas pequenas
   viram serrilha depois de esticadas. */
const MODULOS = 5;
const ALTURA = MODULO * MODULOS;

/**
 * Um traço, de baixo para cima — o vapor sobe, e o `stroke-dashoffset` que o
 * desenha corre no mesmo sentido em que a pessoa desce a página.
 *
 * ⚠️ **O lado alterna a cada meia onda, não a cada onda**, e a diferença não é
 * estética: é o que decide se a curva tem vinco. Numa junção entre dois
 * troços, a tangente de saída é dada pelo primeiro ponto de controlo e a de
 * entrada pelo último do troço anterior. Alternando o lado só de onda em onda,
 * os dois apontavam para lados opostos na fronteira e a curva ganhava uma
 * bicagem — na captura o fio lia-se como serrilha e não como fumo. Alternando
 * a cada meia onda, e com os dois pontos de controlo do mesmo lado, a tangente
 * mantém a direcção na fronteira e a curva sai contínua.
 */
function traco(x: number, desfasamento: number): string {
  const meia = MODULO / 2;
  /* Um sexto do troço é a distância dos pontos de controlo à âncora: menos que
     isso achata a onda, mais que isso fá-la dobrar sobre si própria. */
  const puxao = meia / 3;
  let lado = desfasamento % 2 === 0 ? AMPLITUDE : -AMPLITUDE;
  let d = `M${x} ${ALTURA}`;
  for (let i = 0; i < MODULOS * 2; i++) {
    const cima = ALTURA - (i + 1) * meia;
    const baixo = ALTURA - i * meia;
    d += `C${x + lado} ${baixo - puxao} ${x + lado} ${cima + puxao} ${x} ${cima}`;
    lado = -lado;
  }
  return d;
}

/* Afastados da berma: a 22 o primeiro traço encostava ao limite da margem e
   ficava meio cortado. */
const TRACOS = [traco(30, 0), traco(60, 1), traco(90, 0)];

/**
 * # O vapor: o movimento de assinatura desta página
 *
 * As três ondas do logótipo deixam de ser um desenho parado e passam a ser o
 * **fio da página**. Um SVG fixo na margem, da altura do ecrã, com o
 * `stroke-dashoffset` conduzido pela posição de rolagem: **rolar desenha o
 * vapor**, e chegar ao fim é ter o desenho completo.
 *
 * ## Muda de papel, e é isso que o torna deste site
 *
 * Um fio que só fosse um fio era decoração com um nome bonito. Este muda de
 * função ao longo da página:
 *
 * 1. **fio** — desenha-se à medida que se desce;
 * 2. **fólio** — cada capítulo carimba um marcador que fica lá, com numeral e
 *    título. O `uniqueness.md` §2.2 exige que a navegação de uma peça em
 *    capítulos seja um fólio na margem, e este é clicável, portanto é
 *    navegação a sério e não um indicador;
 * 3. **vapor do pão** — no pico, os traços engrossam e clareiam, porque é ali
 *    que o vapor tem de onde sair: o pão está a encher o ecrã;
 * 4. **marca** — no colofão o fio da margem apaga-se e as mesmas três ondas
 *    desenham-se à escala do logótipo (ver `Colofao.tsx`), fechando em
 *    travamento exacto. O fio que correu a página inteira acaba por ser a
 *    assinatura.
 *
 * ## O que aqui não se faz
 *
 * ⚠️ **Nada de `offsetTop`.** Mede-se com `getBoundingClientRect`, que é
 * absoluto em relação à janela; o `offsetTop` conta a partir do ancestral
 * posicionado e, com as `<section>` de acto a ficarem `position: relative` por
 * mão do motor, dava posições erradas para os marcadores — e erradas de forma
 * plausível, que é a pior maneira.
 *
 * ⚠️ **Não se lê o `scrollY` dentro do evento.** O ouvinte só marca que há
 * trabalho; a leitura e a escrita acontecem no `requestAnimationFrame`. Ler
 * geometria a cada evento de roda força o browser a recalcular a página em
 * cada notch.
 */
export function Vapor({
  capitulos,
  rotuloNavegacao,
}: {
  capitulos: CapituloDoFolio[];
  rotuloNavegacao: string;
}) {
  const [progresso, setProgresso] = useState(0);
  const [marcas, setMarcas] = useState<number[]>([]);
  const [activo, setActivo] = useState(0);
  const pendente = useRef(false);
  /* As marcas vivem **também** numa referência, e não só no estado. Quem as lê
     é o laço de rolagem, que corre a cada quadro: buscá-las ao estado obrigava
     a passar por um actualizador de `setState` só para as ler, e um
     actualizador com efeitos lá dentro corre duas vezes em modo estrito. A
     referência é para ler, o estado é para desenhar. */
  const marcasRef = useRef<number[]>([]);

  useEffect(() => {
    const cursoTotal = () => document.documentElement.scrollHeight - window.innerHeight;

    const medir = () => {
      const total = cursoTotal();
      if (total <= 0) return;
      const topo = window.scrollY;
      const novas = capitulos.map((c) => {
        const el = document.getElementById(c.id);
        if (!el) return 0;
        return Math.min(1, Math.max(0, (el.getBoundingClientRect().top + topo) / total));
      });
      marcasRef.current = novas;
      setMarcas(novas);
    };

    const escrever = () => {
      pendente.current = false;
      const total = cursoTotal();
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      setProgresso(p);
      /* O capítulo activo é o último cuja marca já ficou para trás. Um quarto
         de ecrã de avanço para o fólio mudar quando o capítulo **entra**, e não
         quando já vai a meio. */
      const margem = total > 0 ? window.innerHeight / 4 / total : 0;
      const m = marcasRef.current;
      /* ⚠️ **-1 é a folha de rosto, e não um erro.** Antes do primeiro capítulo
         a página ainda é a capa, que tem chão próprio (o tijolo) e não está no
         fólio. Sem este estado o fio herdava a cor do capítulo I e desaparecia
         em cima do tijolo, à vista de toda a gente e sem nada a explicá-lo. */
      let i = -1;
      for (let n = 0; n < m.length; n++) if (p + margem >= m[n]) i = n;
      setActivo(i);
    };

    const aoRolar = () => {
      if (pendente.current) return;
      pendente.current = true;
      requestAnimationFrame(escrever);
    };

    /* ⚠️ **A primeira medição não corre no corpo do efeito.** Escrever estado
       aí em cima dispara uma cascata de renderizações, e mede-se antes de o
       navegador ter assentado a maquetização — as fotografias ainda não têm
       altura, portanto as marcas saíam todas erradas. Um quadro à frente
       resolve os dois de uma vez. */
    const primeira = requestAnimationFrame(() => {
      medir();
      escrever();
    });

    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", medir);
    /* As fotografias mudam a altura da página ao chegarem, e uma marca medida
       antes disso aponta para o sítio errado. */
    const observador = new ResizeObserver(medir);
    observador.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(primeira);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", medir);
      observador.disconnect();
    };
  }, [capitulos]);

  const saltar = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="vapor" data-capitulo-activo={capitulos[activo]?.id ?? "capa"}>
      <svg
        className="vapor__fio"
        viewBox={`0 0 120 ${ALTURA}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke="currentColor" strokeWidth={ESPESSURA} strokeLinecap="round">
          {TRACOS.map((d, i) => (
            <path
              key={i}
              d={d}
              /* `pathLength` normalizado a 1 poupa medir o comprimento real de
                 cada curva: o traçado passa a ser `1 - progresso`, e os três
                 traços de comprimentos diferentes desenham-se ao mesmo ritmo. */
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - progresso }}
            />
          ))}
        </g>
      </svg>

      <nav className="vapor__folio" aria-label={rotuloNavegacao}>
        <ol>
          {capitulos.map((c, i) => (
            <li
              key={c.id}
              style={{ top: `${(marcas[i] ?? 0) * 100}%` }}
              data-passado={progresso >= (marcas[i] ?? 1) ? "" : undefined}
              data-activo={i === activo ? "" : undefined}
            >
              {/* ⚠️ **O nome do capítulo vai no `aria-label` e não só na
                  etiqueta que aparece com o rato.** A etiqueta é ajuda visual
                  e desaparece em ecrãs de toque; sem o rótulo, quem usa leitor
                  de ecrã ouvia "I", "II", "III" e nada mais — dez botões que
                  não dizem para onde vão. */}
              <button
                type="button"
                onClick={() => saltar(c.id)}
                aria-label={`${c.numeral}. ${c.titulo}`}
              >
                <span className="vapor__numeral" aria-hidden>
                  {c.numeral}
                </span>
                <span className="vapor__titulo" aria-hidden>
                  {c.titulo}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

/** Os mesmos três traços, à escala do logótipo. Ver `Colofao.tsx`. */
export function VaporMarca({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 130" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round">
        {/* Os caminhos exactos de `public/marca/ondas.svg`. Não são uma
            aproximação do desenho: são o desenho. */}
        <path d="M22 116C14 96 32 84 24 64c-5-13 2-24 4-30" pathLength={1} />
        <path d="M62 116C54 94 72 82 64 60c-5-14 2-26 4-32" pathLength={1} />
        <path d="M102 116C94 92 112 80 104 56c-5-15 2-28 4-34" pathLength={1} />
      </g>
    </svg>
  );
}

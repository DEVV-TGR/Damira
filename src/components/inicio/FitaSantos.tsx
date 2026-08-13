import { santos } from "@/data/ementa";

/**
 * Os nomes a passar, sem parar. **Uma vez, e no fundo da página.**
 *
 * ## Porque saiu de baixo do herói
 *
 * ⚠️ **Estava colada ao herói e no mesmo `bloco-magenta-texto`** — sem fronteira
 * nenhuma entre os dois blocos, os dois a andar. A ideia do herói é um título
 * entalado entre duas filas de fotografias, e para isso resultar a fila de baixo
 * tem de ser uma **aresta**. Com esta fita imediatamente a seguir, no mesmo
 * magenta, deixava de fechar coisa nenhuma e passava a ser a primeira de três
 * riscas: o herói perdia a ideia e a fita perdia-se no meio.
 *
 * Aqui em baixo faz o contrário — na mesma tinta do fecho e do rodapé, é a
 * costura entre os dois e não uma quarta cor no fim da página.
 *
 * ## É o único sítio onde os nomes aparecem todos
 *
 * A página mostra três santos, um por carne, com fotografia e preço. Aqui passa
 * a **carta inteira** — entram os *Rollinis*, a *Delícia da Casa* e as
 * sobremesas —, e é isso que faz a fita valer o espaço: não é um resumo do que
 * está acima, é o resto.
 */
export function FitaSantos({ className = "" }: { className?: string }) {
  const nomes = santos().map((artigo) => artigo.nome);

  return (
    <div className={`fita bg-tinta text-papel ${className}`}>
      <div className="fita-conteudo" style={{ "--duracao": "80s" } as React.CSSProperties}>
        {/* Duas cópias: a segunda é o que faz o ciclo fechar sem costura. Só a
            primeira é anunciada — ver o comentário de `.fita` em `globals.css`. */}
        <Serie nomes={nomes} />
        <Serie nomes={nomes} duplicada />
      </div>
    </div>
  );
}

function Serie({ nomes, duplicada = false }: { nomes: string[]; duplicada?: boolean }) {
  return (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={duplicada || undefined}
    >
      {nomes.map((nome) => (
        <li
          key={nome}
          className="titulo-display flex shrink-0 items-center gap-6 py-4 text-sm uppercase tracking-[0.2em]"
        >
          {nome}
          <span aria-hidden className="text-base text-coral">
            ·
          </span>
        </li>
      ))}
    </ul>
  );
}

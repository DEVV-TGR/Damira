import { santos } from "@/data/ementa";

/**
 * Os nomes dos santos a passar, sem parar.
 *
 * **É o gesto mais Santo Burga que o site tem.** Baptizar cada hambúrguer com um
 * santo é a marca inteira, e até aqui isso só aparecia em letra de doze pixéis
 * dentro da ementa. Numa fita, é a primeira coisa que se percebe da casa.
 *
 * A lista sai de `ementa.json` — um santo novo entra na fita sozinho.
 */
export function FitaSantos({ className = "" }: { className?: string }) {
  const nomes = santos().map((artigo) => artigo.nome);

  return (
    <div className={`fita bloco-magenta-texto ${className}`}>
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
          className="titulo-display flex shrink-0 items-center gap-6 py-3 text-sm uppercase tracking-[0.2em]"
        >
          {nome}
          <span aria-hidden className="text-base opacity-60">
            ·
          </span>
        </li>
      ))}
    </ul>
  );
}

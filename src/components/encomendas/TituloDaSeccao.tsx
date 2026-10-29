import { SetaMinimizar } from "./SetaMinimizar";

/**
 * O título de uma secção das encomendas, que é ao mesmo tempo o que a abre e
 * fecha (#84) e o que fica colado ao topo enquanto se rola por ela (#85).
 *
 * ⚠️ **É o mesmo elemento de propósito.** Com um título fixo e um botão de fechar
 * noutro sítio, quem está a meio de uma secção comprida tinha de voltar ao
 * princípio dela para a fechar — exactamente o caminho que fechar devia poupar.
 *
 * ⚠️ **Ocupa a largura toda, e o texto fica numa `.envolvente` por dentro.** O
 * fundo sólido é o que impede os cartões de se lerem por baixo do título colado;
 * numa caixa da largura do texto, a meio de um monitor, os cartões passavam-lhe
 * pelos lados. E nada de `max-w-*` ao lado da `.envolvente` (armadilha 14).
 *
 * O título deixou de ter o `max-w-[16ch]`: colado, cada linha a mais é ecrã que
 * se tira aos cartões, e a seta à direita já lhe limita a largura.
 *
 * Um `<h2>` dentro do `<summary>` é marcação válida. O leitor de ecrã ouve o
 * botão com o nome do título e o estado, aberto ou fechado; a `<section>`
 * continua a ter o nome pelo `aria-labelledby`.
 */
export function TituloDaSeccao({
  id,
  titulo,
  fundo,
}: {
  id: string;
  titulo: string;
  /** O fundo da secção, repetido: o título colado tem de o tapar. */
  fundo: "bg-papel" | "bg-papel-fundo";
}) {
  return (
    <summary
      className={`titulo-fixo group/sumario cursor-pointer list-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo [&::-webkit-details-marker]:hidden ${fundo}`}
    >
      <div className="envolvente flex items-center justify-between gap-4 py-3">
        <h2 id={id} className="titulo-display titulo-beta min-w-0">
          {titulo}
        </h2>
        <SetaMinimizar grupo="seccao" />
      </div>
    </summary>
  );
}

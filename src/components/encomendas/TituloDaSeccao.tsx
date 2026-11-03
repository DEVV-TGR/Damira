import type { ReactNode } from "react";
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
 * ## ⚠️ O `<h2>` não está aqui dentro, e não pode estar
 *
 * Um `<h2>` dentro do `<summary>` é marcação válida, mas os browsers expõem o
 * `<summary>` como botão, e o que está dentro de um botão passa a texto dele: no
 * VoiceOver e no NVDA, «Festas», «Bolos», «Boxes» e «Da carta» desapareciam da
 * lista de títulos, que é a forma mais comum de percorrer uma página com leitor
 * de ecrã. Também não pode ir à volta: o `<summary>` tem de ser filho do
 * `<details>`.
 *
 * Por isso o título vive em dois sítios: o `<h2>` está antes do `<details>`, só
 * para leitores de ecrã (`TituloParaLeitores`), e aqui fica o texto à vista, que
 * dá nome ao botão. Lido em sequência, ouve-se o título e logo o botão com o
 * mesmo nome e o estado — uma repetição, que é o preço de as duas navegações
 * funcionarem. A `<section>` continua a ter o nome pelo `aria-labelledby`, que
 * aponta para o `<h2>`.
 */
export function TituloDaSeccao({
  titulo,
  fundo,
}: {
  titulo: string;
  /** O fundo da secção, repetido: o título colado tem de o tapar. */
  fundo: "bg-papel" | "bg-papel-fundo";
}) {
  return (
    <summary
      className={`titulo-fixo group/sumario cursor-pointer list-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo [&::-webkit-details-marker]:hidden ${fundo}`}
    >
      <div className="envolvente flex items-center justify-between gap-4 py-3">
        <span className="titulo-display titulo-beta block min-w-0">{titulo}</span>
        <SetaMinimizar grupo="seccao" />
      </div>
    </summary>
  );
}

/**
 * O título de uma secção ou de uma categoria minimizável, para a lista de
 * títulos do leitor de ecrã. Fica **antes** do `<details>`, nunca dentro do
 * `<summary>` (ver acima). O que se vê é o texto do `<summary>`.
 */
export function TituloParaLeitores({
  id,
  nivel,
  children,
}: {
  id?: string;
  nivel: 2 | 4;
  children: ReactNode;
}) {
  const Titulo = nivel === 2 ? "h2" : "h4";
  return (
    <Titulo id={id} className="sr-only">
      {children}
    </Titulo>
  );
}

import type { OrdemEmenta, Produto } from "@/lib/dados/tipos";

/**
 * # A ordem por que a loja mostra os produtos (#87)
 *
 * A gerente escolhe a ordem das **categorias**; dentro de cada uma, os artigos
 * vão por **ordem alfabética**. Decidido com a Damira a 12/10: ninguém vai
 * ordenar noventa e cinco artigos à mão num telemóvel, e uma lista alfabética
 * é uma que quem procura sabe ler sem explicação.
 *
 * Fica fora da fronteira (`divisao.md`: as funções que não tocam em dados vivem
 * em `src/lib/`), e é o `index.ts` de `src/lib/dados/` que a aplica ao
 * `listarProdutos`. Assim as páginas e os componentes recebem a lista já
 * ordenada e não têm de saber disto — e a base de dados não tem de saber
 * ordenar português, que num `ORDER BY` depende da colação instalada.
 */

/* `pt` e não a ordem dos códigos: em código, «Éclair» vinha depois de «Tosta»
   e «pão» depois de «pastel». Com a colação portuguesa o acento conta só para
   desempatar, que é como se lê num dicionário. Um `Intl.Collator` é o mesmo que
   `localeCompare(b, "pt")`, criado uma vez em vez de uma por comparação. */
const colacao = new Intl.Collator("pt");

export const compararNomes = (a: string, b: string): number => colacao.compare(a, b);

/* O que não está na ordem (uma categoria que ainda ninguém ordenou) vai para o
   fim, e não para o princípio: aparecer não pode ser o prémio de faltar. */
const posicaoEm = (lista: readonly string[], valor: string): number => {
  const i = lista.indexOf(valor);
  return i === -1 ? lista.length : i;
};

/**
 * Pela ordem das cartas, depois pela das categorias, depois pelo nome em
 * português. ⚠️ **Os produtos sem categoria — os de encomenda — não se
 * ordenam**: os kits de festa vão por escalão de propósito, e a regra do
 * alfabeto é das categorias da carta. Ficam pela ordem em que chegaram, depois
 * dos da carta (que é onde já estavam no catálogo).
 *
 * O nome é sempre o português, também na página inglesa: a lista ordena-se uma
 * vez, no servidor, e é a mesma nas duas línguas.
 */
export function ordenarProdutos(
  produtos: readonly Produto[],
  ordem: Pick<OrdemEmenta, "cartas" | "categorias">,
): Produto[] {
  const chegada = new Map(produtos.map((produto, i) => [produto, i]));
  return [...produtos].sort((a, b) => {
    const aTem = a.carta !== null && a.categoria !== null;
    const bTem = b.carta !== null && b.categoria !== null;
    if (!aTem || !bTem) {
      if (aTem !== bTem) return aTem ? -1 : 1;
      return chegada.get(a)! - chegada.get(b)!;
    }
    return (
      posicaoEm(ordem.cartas, a.carta!) - posicaoEm(ordem.cartas, b.carta!) ||
      posicaoEm(ordem.categorias, a.categoria!) - posicaoEm(ordem.categorias, b.categoria!) ||
      /* Duas categorias fora da ordem ficam cada uma no seu bloco. */
      compararNomes(a.categoria!, b.categoria!) ||
      compararNomes(a.nome.pt, b.nome.pt) ||
      /* Dois nomes iguais (a versão vegan e a da casa) nunca trocam de lugar
         de uma página para a outra. */
      a.id.localeCompare(b.id)
    );
  });
}

/**
 * O «subir» e o «descer» do painel: troca a categoria na posição `i` com a
 * vizinha. Nas pontas não faz nada — o botão está desligado, mas um duplo
 * toque não pode dar a volta à lista.
 */
export function moverNaLista<T>(lista: readonly T[], i: number, sentido: -1 | 1): T[] {
  const j = i + sentido;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return [...lista];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

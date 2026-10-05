import type { Cotacao, LinhaCesto, LinhaCotada, Produto } from "./tipos";

/**
 * # As regras da fronteira, num sítio só
 *
 * O que as duas implementações da `FonteDeDados` — a dos JSON (`json.ts`) e a
 * da base de dados (`bd.ts`) — têm de decidir da mesma maneira. Duas cópias de
 * uma regra são duas regras no dia em que alguém só muda uma; por isso vivem
 * aqui, sem dados e sem base de dados: recebem o que precisam por argumento.
 */

/* Um passo de 0,5 kg em vírgula flutuante: 1,5 / 0,5 dá 3 certinho, mas não é
   preciso esperar muito por um 0,1 + 0,2. */
const EPSILON = 1e-9;
const noMultiplo = (quantidade: number, minimo: number, multiplo: number) => {
  const passos = (quantidade - minimo) / multiplo;
  return Math.abs(passos - Math.round(passos)) < EPSILON;
};

/**
 * O preço do cesto, calculado no servidor (regra 1 do `AGENTS.md`). As linhas
 * já vêm validadas pelo `EsquemaLinhaCesto`; o produto de cada uma vem de quem
 * chama — do `Map` dos JSON, ou de uma consulta à base de dados. Um produto
 * arquivado ou tirado de venda tem de vir na mesma: é aqui que se recusa.
 */
export function cotarLinhas(
  linhas: readonly Pick<LinhaCesto, "produtoId" | "varianteId" | "quantidade">[],
  produtoDe: (id: string) => Produto | undefined,
): Cotacao {
  const cotadas = linhas.map((linha): LinhaCotada => {
    const base = { produtoId: linha.produtoId, varianteId: linha.varianteId, quantidade: linha.quantidade };
    const falha = (erro: LinhaCotada["erro"]): LinhaCotada => ({
      ...base,
      precoUnitarioCent: null,
      totalCent: null,
      erro,
    });

    const produto = produtoDe(linha.produtoId);
    if (!produto) return falha("produto-desconhecido");
    const variante = produto.variantes.find((v) => v.id === linha.varianteId);
    if (!variante) return falha("variante-desconhecida");
    if (!produto.aVendaOnline || produto.arquivado || produto.foraDeVenda) return falha("fora-de-venda");
    if (linha.quantidade < produto.quantidadeMinima - EPSILON) return falha("abaixo-do-minimo");
    if (!noMultiplo(linha.quantidade, produto.quantidadeMinima, produto.multiplo)) {
      return falha("fora-do-multiplo");
    }

    const preco = variante.precoCent;
    return {
      ...base,
      precoUnitarioCent: preco,
      /* Ao quilo, 1,5 kg a 1700 cêntimos são 2550: arredonda-se uma vez, no
         total da linha, e é sempre um inteiro. */
      totalCent: preco === null ? null : Math.round(preco * linha.quantidade),
      erro: null,
    };
  });

  const validas = cotadas.filter((linha) => linha.erro === null);
  return {
    linhas: cotadas,
    totalCent: validas.reduce((soma, linha) => soma + (linha.totalCent ?? 0), 0),
    semPreco: validas.filter((linha) => linha.totalCent === null).length,
    valida: validas.length === cotadas.length,
  };
}

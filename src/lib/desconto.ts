/**
 * O desconto da loja: **10 % em toda a loja, para toda a gente** (decidido pelo
 * Tomás a 27/11), até a casa dizer que acabou. Sem códigos e sem «primeiras
 * encomendas»: a Andreia faz encomendas de teste, e isso não pode gastar descontos.
 *
 * ⚠️ **Desligar é pôr `0` aqui e fazer deploy.** A faixa e as linhas do desconto
 * desaparecem, e os pedidos já feitos guardam o desconto que tiveram
 * (`pedidos.desconto_percentagem`, migração `0013`).
 *
 * ⚠️ **Quem o aplica é o servidor** (`AGENTS.md`, regra 1): a cotação e o
 * `criarPedido` chamam o `aplicarDesconto`, e o total gravado já vem descontado.
 * O cesto, que ainda não tem a cotação, mostra uma estimativa com a mesma conta.
 *
 * Sem dados nem `server-only`: o browser também a usa, só para mostrar.
 */
export const DESCONTO_PERCENTAGEM: number = 10;

/**
 * O desconto em cêntimos: a percentagem sobre o subtotal, arredondada ao cêntimo
 * com o meio cêntimo para cima. **Em inteiros** — `(subtotal × p + 50) / 100`,
 * arredondado para baixo —, que é a mesma conta do `CHECK pedidos_desconto` da
 * base de dados: com vírgula flutuante, um `Math.round(x * 0.1)` podia cair um
 * cêntimo ao lado e a base recusava o pedido.
 */
export function descontoCent(subtotalCent: number, percentagem: number): number {
  if (!Number.isSafeInteger(subtotalCent) || subtotalCent < 0) {
    throw new Error("O subtotal do desconto tem de vir em cêntimos inteiros não negativos.");
  }
  if (!Number.isInteger(percentagem) || percentagem < 0 || percentagem > 100) {
    throw new Error("A percentagem do desconto tem de ser um inteiro de 0 a 100.");
  }
  return Math.floor((subtotalCent * percentagem + 50) / 100);
}

export type ValoresComDesconto = {
  /** A soma das linhas, antes do desconto. */
  subtotalCent: number;
  descontoPercentagem: number;
  descontoCent: number;
  /** O que se paga: o subtotal menos o desconto. É este que o pedido grava como `totalCent`. */
  totalCent: number;
};

/** Os três números de uma vez, para somarem sempre certo à vista. */
export function aplicarDesconto(subtotalCent: number, percentagem: number = DESCONTO_PERCENTAGEM): ValoresComDesconto {
  const desconto = descontoCent(subtotalCent, percentagem);
  return { subtotalCent, descontoPercentagem: percentagem, descontoCent: desconto, totalCent: subtotalCent - desconto };
}

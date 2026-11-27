/**
 * O desconto de boas-vindas: 10 % nas primeiras encomendas.
 *
 * ⚠️ **Por agora só se mostra.** A faixa anuncia-o e o cesto e o resumo da
 * compra descontam-no do total que o servidor cotou, mas **o servidor ainda não
 * o aplica**: o email à casa leva o total sem desconto, e o Stripe cobraria o
 * total cheio. O lado do servidor (quem conta como «primeira encomenda», o
 * total do pedido e do email, o Stripe) fica para o PR do backend — até lá
 * este código não vai para o `main` sozinho.
 *
 * Em cêntimos inteiros, como todo o dinheiro do site (`pedidos.md`): o desconto
 * arredonda ao cêntimo, e o total é a diferença, para os três números somarem
 * sempre certo à vista.
 */
export const DESCONTO_PERCENTAGEM = 10;

export function comDesconto(subtotalCent: number): { descontoCent: number; totalCent: number } {
  const descontoCent = Math.round((subtotalCent * DESCONTO_PERCENTAGEM) / 100);
  return { descontoCent, totalCent: subtotalCent - descontoCent };
}

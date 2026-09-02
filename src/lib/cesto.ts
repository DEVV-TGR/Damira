import type { TipoPedido } from "@/lib/pedidos";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";

/**
 * # O cesto
 *
 * ## ⚠️ Isto **continua a não ser uma loja**, e a diferença não é semântica
 *
 * O `pedidos.ts` diz, e continua a valer: não há pagamento, não há reserva
 * automática e não há confirmação de disponibilidade. A casa não pode cumprir
 * nenhuma das três a partir daqui — um bolo por medida não tem preço até haver
 * conversa, e o catálogo de massas e recheios não traz um único número.
 *
 * O que mudou foi **como se chega ao pedido**, não o que o pedido é. Antes havia
 * uma caixa de texto vazia e a pessoa tinha de escrever de cabeça o que queria,
 * copiando nomes e preços de secções que já tinha rolado para longe. Agora
 * escolhe nos cartões, vê o que juntou, e o pedido escreve-se sozinho.
 *
 * Três regras que isto respeita, e que um carrinho de loja normal não respeitaria:
 *
 * 1. **O total chama-se estimativa e nunca «total».** É a soma dos preços de
 *    tabela do que foi escolhido, e não uma conta a pagar: falta a entrega,
 *    faltam os acertos, e falta o que a casa disser.
 * 2. **Um artigo sem preço não vale zero — vale «sob orçamento».** Juntar um
 *    bolo por medida faz a estimativa passar a *a partir de*, porque somar zero
 *    a um bolo era anunciar que ele é grátis.
 * 3. **O botão do fim diz «enviar o pedido» e não «pagar» nem «finalizar».**
 *    O que acontece a seguir é alguém ler e responder.
 */
export type ItemCesto = {
  /** Único por linha. Junta o tipo, o produto e a variante: `festa:medio:40`. */
  id: string;
  tipo: TipoPedido;
  /** Já traduzido: o cesto guarda o que se vai escrever, não uma chave. */
  nome: string;
  /** Detalhe da variante, quando existe: «40 pessoas», «vegan». */
  variante: string | null;
  /** ⚠️ `null` é **sob orçamento** e não zero. Ver a regra 2 acima. */
  preco: number | null;
  /** Só os kits de festa o têm, e serve para pré-preencher o formulário. */
  pessoas: number | null;
  quantidade: number;
};

export const CHAVE_CESTO = "damira:cesto";

/** Quantas unidades ao todo, que é o número que a barra mostra. */
export const totalUnidades = (cesto: ItemCesto[]): number =>
  cesto.reduce((soma, item) => soma + item.quantidade, 0);

/**
 * A estimativa: soma do que tem preço, e a contagem do que não tem.
 *
 * ⚠️ Os artigos sem preço **não entram na soma nem contam como zero**. Saem
 * separados para a interface poder dizer *a partir de* em vez de mentir com um
 * número fechado.
 */
export function estimativa(cesto: ItemCesto[]): {
  soma: number;
  semPreco: number;
} {
  let soma = 0;
  let semPreco = 0;
  for (const item of cesto) {
    if (item.preco === null) semPreco += item.quantidade;
    else soma += item.preco * item.quantidade;
  }
  return { soma, semPreco };
}

/**
 * O cesto escrito em texto, que é o que vai dentro do email.
 *
 * ⚠️ **Texto simples e não HTML.** É para ser lido e respondido no telemóvel de
 * quem atende ao balcão, e um email de texto abre em qualquer cliente de correio
 * sem se partir. Ver `corpoDoPedido` em `pedidos.ts`.
 */
export function cestoEmTexto(
  cesto: ItemCesto[],
  locale: Locale,
  rotulos: { semPreco: string; estimativa: string; aPartirDe: string },
): string {
  if (cesto.length === 0) return "";

  const linhas = cesto.map((item) => {
    const nome = item.variante ? `${item.nome} (${item.variante})` : item.nome;
    const preco =
      item.preco === null
        ? rotulos.semPreco
        : formatarPreco(item.preco * item.quantidade, locale);
    return `- ${item.quantidade}x ${nome} — ${preco}`;
  });

  const { soma, semPreco } = estimativa(cesto);
  const rotulo = semPreco > 0 ? rotulos.aPartirDe : rotulos.estimativa;
  linhas.push("", `${rotulo}: ${formatarPreco(soma, locale)}`);

  return linhas.join("\n");
}

/**
 * O tipo de pedido que o cesto sugere.
 *
 * Se tudo o que lá está é do mesmo tipo, é esse. Se há mistura, é `outro` — e
 * `outro` é a resposta honesta, não um valor por defeito preguiçoso: um pedido
 * com um kit de festa **e** duas boxes não é nenhum dos dois.
 */
export function tipoSugerido(cesto: ItemCesto[]): TipoPedido | null {
  if (cesto.length === 0) return null;
  const tipos = new Set(cesto.map((item) => item.tipo));
  return tipos.size === 1 ? [...tipos][0] : "outro";
}

/** O maior número de pessoas pedido, para pré-preencher o formulário. */
export const pessoasSugeridas = (cesto: ItemCesto[]): number | null => {
  const numeros = cesto
    .map((item) => item.pessoas)
    .filter((n): n is number => n !== null);
  return numeros.length > 0 ? Math.max(...numeros) : null;
};

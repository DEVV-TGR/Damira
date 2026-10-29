import type { Locale } from "@/i18n/routing";
import type { ItemCesto } from "@/lib/cesto";
import { EsquemaLinhaCesto, type FonteDeDados } from "@/lib/dados/tipos";
import { emLingua, regraDe, tipoDoPedido } from "@/lib/vista";

/**
 * # O cesto, refeito no servidor
 *
 * ⚠️ **O browser manda ids e quantidades, nunca preços** (regra 1 do
 * AGENTS.md). Até outubro de 2026 o email do pedido era escrito no browser,
 * com os preços que o cesto tinha no `localStorage` — e quem os editasse
 * mudava o total que chegava à casa. Agora o browser manda as linhas e o
 * servidor volta a montar o cesto a partir do catálogo: o nome, a variante e o
 * preço são os de `@/lib/dados`, e o texto do email sai do mesmo `cestoEmTexto`
 * que o browser usava para mostrar o resumo.
 *
 * Recebe a fonte por argumento para se testar contra o `criarFonteJson()`.
 */
export type ItensDoServidor = { ok: true; itens: ItemCesto[] } | { ok: false };

export async function itensDoServidor(
  linhas: unknown,
  fonte: Pick<FonteDeDados, "cotarCesto" | "produtoPorId">,
  locale: Locale,
): Promise<ItensDoServidor> {
  const lidas = EsquemaLinhaCesto.array().min(1).max(50).safeParse(linhas);
  if (!lidas.success) return { ok: false };

  const cotado = await fonte.cotarCesto(lidas.data);
  /* Um artigo que deixou de existir, abaixo do mínimo ou fora do múltiplo não
     segue: o pedido volta para trás em vez de chegar à casa com uma linha que
     ninguém consegue cumprir. */
  if (!cotado.ok || !cotado.cotacao.valida) return { ok: false };

  const itens: ItemCesto[] = [];
  for (const [i, linha] of cotado.cotacao.linhas.entries()) {
    const produto = await fonte.produtoPorId(linha.produtoId);
    const variante = produto?.variantes.find((v) => v.id === linha.varianteId);
    if (!produto || !variante) return { ok: false };
    const regra = regraDe(produto);
    itens.push({
      id: `${produto.id}:${variante.id}`,
      produtoId: produto.id,
      varianteId: variante.id,
      tipo: tipoDoPedido(produto),
      nome: emLingua(produto.nome, locale),
      variante: variante.rotulo ? emLingua(variante.rotulo, locale) : null,
      /* O preço **de agora**, do catálogo. O que o cesto tinha guardado não
         chega aqui. */
      precoCent: linha.precoUnitarioCent,
      pessoas: variante.pessoas,
      quantidade: linha.quantidade,
      unidade: produto.unidade,
      minimo: regra?.minimo ?? 1,
      passo: regra?.passo ?? 1,
      notas: lidas.data[i].notas || null,
      /* Já confirmado pelo `cotarCesto` (`escolha-invalida`): é um dos sabores do produto. */
      escolha: lidas.data[i].escolhas[0] ?? null,
    });
  }
  return { ok: true, itens };
}

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
  /**
   * ⚠️ **Ao quilo ou à unidade — e isto muda o que o número quer dizer.**
   *
   * Num bolo inteiro a quantidade são **quilos**, não bolos: o preço de tabela é
   * por quilo e um bolo pesa dois. Sem este campo, «2 ×» ao lado de um bolo de
   * 17 €/kg lia-se como dois bolos por 34 € — quando são dois quilos, que é um
   * bolo só. É o mesmo erro que o `superRefine` da ementa já apanha nos dados,
   * a acontecer outra vez na interface.
   */
  unidade: "un" | "kg";
  /**
   * Quantidade mínima. Descer abaixo dela tira a linha do cesto.
   *
   * ⚠️ **É o que separa uma encomenda de uma ida ao balcão.** Um artigo da
   * ementa só se encomenda à dúzia; um croissant à unidade pede-se ao balcão e
   * leva-se. Ver `encomendavel.ts`.
   */
  minimo: number;
  /** De quanto em quanto a quantidade sobe. Meia dúzia, meio quilo, uma unidade. */
  passo: number;
};

/**
 * O que se escreve num artigo que não traz regra própria — os kits, os bolos
 * decorados e as boxes, que são todos «uma unidade de cada vez».
 */
export const REGRA_SIMPLES = { unidade: "un", minimo: 1, passo: 1 } as const;

/**
 * A chave do armazenamento local, **por pessoa**.
 *
 * ⚠️ Sem o identificador da sessão, duas pessoas que entrem no mesmo telemóvel
 * partilhavam o cesto, e a segunda encontrava lá dentro o bolo que a primeira
 * escolheu. Num telemóvel de família isso não é hipótese remota, é terça-feira.
 *
 * Quem não tem sessão iniciada continua a ter cesto — na chave anónima, que é a
 * que sempre existiu. **A conta nunca foi obrigatória para encomendar** e o
 * cesto é a primeira coisa que teria de a exigir se isto fosse feito ao
 * contrário.
 */
export const chaveDoCesto = (idUtilizador?: string | null): string =>
  idUtilizador ? `damira:cesto:${idUtilizador}` : "damira:cesto";

/**
 * Põe em forma o que veio do armazenamento local.
 *
 * ⚠️ **O que lá está foi escrito por uma versão anterior deste site.** Os cestos
 * guardados antes de existirem `unidade`, `minimo` e `passo` não têm esses
 * campos, e um `item.passo` a `undefined` faz a quantidade subir para `NaN` ao
 * primeiro toque no «mais» — um cesto partido, sem erro nenhum no ecrã, para
 * quem estava a meio de encomendar. Preenche-se com a regra simples, que é o que
 * esses artigos eram.
 */
export function normalizarCesto(lido: unknown): ItemCesto[] {
  if (!Array.isArray(lido)) return [];
  const items: ItemCesto[] = [];
  for (const bruto of lido) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const item = bruto as Partial<ItemCesto>;
    if (typeof item.id !== "string" || typeof item.nome !== "string") continue;
    const passo = typeof item.passo === "number" && item.passo > 0 ? item.passo : 1;
    const minimo =
      typeof item.minimo === "number" && item.minimo > 0 ? item.minimo : 1;
    const quantidade =
      typeof item.quantidade === "number" && item.quantidade > 0
        ? item.quantidade
        : minimo;
    items.push({
      id: item.id,
      tipo: (item.tipo ?? "outro") as TipoPedido,
      nome: item.nome,
      variante: typeof item.variante === "string" ? item.variante : null,
      preco: typeof item.preco === "number" ? item.preco : null,
      pessoas: typeof item.pessoas === "number" ? item.pessoas : null,
      quantidade,
      unidade: item.unidade === "kg" ? "kg" : "un",
      minimo,
      passo,
    });
  }
  return items;
}

/**
 * ⚠️ **Arredonda ao centésimo antes de comparar.**
 *
 * Com o passo de meio quilo, somar 0,5 três vezes dá 1,5000000000000002 em
 * vírgula flutuante. Sem isto, uma quantidade que devia ser exactamente o mínimo
 * ficava um fio abaixo dele e a linha desaparecia do cesto sozinha.
 */
const arredondar = (n: number): number => Math.round(n * 100) / 100;

/**
 * Quantos artigos, que é o número que a barra mostra.
 *
 * ⚠️ **Conta linhas e não unidades.** Somar as quantidades misturava dúzias de
 * pastéis com quilos de bolo — «13» para uma dúzia de salgados mais um quilo de
 * bolo é um número que não quer dizer nada. Três linhas são três artigos, e é
 * isso que a etiqueta já dizia.
 */
export const totalArtigos = (cesto: ItemCesto[]): number => cesto.length;

/** Como a quantidade se lê: «12 un» ou «1,5 kg». */
export function quantidadeEmTexto(item: ItemCesto, locale: Locale): string {
  const numero = new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    maximumFractionDigits: 2,
  }).format(item.quantidade);
  return item.unidade === "kg" ? `${numero} kg` : `${numero}×`;
}

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
    if (item.preco === null) semPreco += 1;
    else soma += item.preco * item.quantidade;
  }
  return { soma: arredondar(soma), semPreco };
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
        : formatarPreco(arredondar(item.preco * item.quantidade), locale);
    return `- ${quantidadeEmTexto(item, locale)} ${nome} — ${preco}`;
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

/** A quantidade a seguir, sem descer do mínimo nem passar por valores estranhos. */
export const proximaQuantidade = (item: ItemCesto, delta: number): number =>
  arredondar(item.quantidade + delta * item.passo);

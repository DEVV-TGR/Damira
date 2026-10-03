import type { TipoPedido } from "@/lib/pedidos";
import type { Locale } from "@/i18n/routing";
import { formatarCent } from "@/lib/preco";

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
 *
 * ## ⚠️ O preço que o cesto guarda é para mostrar, não para cobrar
 *
 * O cesto vive no `localStorage`, e qualquer pessoa o edita. O que vai para o
 * pedido são o `produtoId`, o `varianteId` e a quantidade; **o preço calcula-o
 * o servidor**, a partir do catálogo (`cotarCesto`, em `@/lib/dados`). O
 * `precoCent` daqui serve para a barra e o resumo mostrarem um número antes de
 * enviar — e, um dia, para o checkout avisar que o preço mudou.
 */
export type ItemCesto = {
  /**
   * Único por linha: o produto, a variante e a marca das notas
   * (`festa-premium:40#k3x`). É a **identidade da linha** — duas mensagens
   * diferentes são duas linhas —, e não serve para encontrar o produto: para
   * isso há o `produtoId` e o `varianteId`.
   */
  id: string;
  /** O produto no catálogo de `@/lib/dados`. É isto que vai para o servidor. */
  produtoId: string;
  /** A variante desse produto: `"unica"`, `"40"`, `"470g"`. */
  varianteId: string;
  tipo: TipoPedido;
  /** Já traduzido: o cesto guarda o que se vai escrever, não uma chave. */
  nome: string;
  /** Detalhe da variante, quando existe: «40 pessoas», «vegan». */
  variante: string | null;
  /**
   * Em cêntimos, inteiros. ⚠️ `null` é **sob orçamento** e não zero (regra 2
   * acima). **Só para mostrar**: o servidor não o lê.
   */
  precoCent: number | null;
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
  /**
   * O que a pessoa escreveu na página do produto: a mensagem do bolo, uma
   * alergia, a cor do laço.
   *
   * ⚠️ **Faz parte da identidade da linha e não é um extra.** Dois bolos iguais
   * com mensagens diferentes são **duas linhas** e não um com quantidade dois —
   * por isso o `id` leva a marca das notas (ver `idComNotas`). Sem isso, quem
   * encomendasse dois bolos para dois aniversários recebia os dois com o mesmo
   * nome escrito por cima.
   */
  notas: string | null;
};

/**
 * O que se escreve num artigo que não traz regra própria — os kits, os bolos
 * decorados e as boxes, que são todos «uma unidade de cada vez».
 */
export const REGRA_SIMPLES = {
  unidade: "un",
  minimo: 1,
  passo: 1,
  notas: null,
} as const;

/**
 * O `id` de uma linha, marcado pelas notas que leva.
 *
 * ⚠️ Uma marca curta e **estável**, não um número aleatório: juntar duas vezes o
 * mesmo bolo com exactamente a mesma mensagem tem de somar quantidade, e não
 * criar duas linhas iguais que quem lê o pedido tem de somar de cabeça.
 *
 * Não é criptografia — é só para distinguir. Colisões entre duas mensagens
 * diferentes dão uma linha em vez de duas, o que é um incómodo; usar aqui algo
 * mais forte era pagar por uma garantia que ninguém precisa.
 */
export function idComNotas(id: string, notas: string | null): string {
  const limpo = notas?.trim() ?? "";
  if (!limpo) return id;
  let soma = 5381;
  for (let i = 0; i < limpo.length; i++) {
    soma = ((soma << 5) + soma + limpo.charCodeAt(i)) | 0;
  }
  return `${id}#${(soma >>> 0).toString(36)}`;
}

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
 * O produto e a variante de uma linha **guardada antes de existirem estes
 * campos**, lidos do `id` composto.
 *
 * ⚠️ Os formatos são os que o site escreveu até outubro de 2026, e só esses:
 * `ementa:<artigo>`, `ementa:<artigo>:<variante>`, `<produto>:<pessoas>` e
 * `<produto>`, todos com um `#marca` opcional das notas. Um cesto antigo que
 * perdesse os ids deixava de se poder enviar — e quem o tinha estava a meio de
 * encomendar.
 */
export function idsDoItem(id: string): { produtoId: string; varianteId: string } {
  const [semMarca] = id.split("#");
  const partes = semMarca.split(":");
  if (partes[0] === "ementa") {
    return { produtoId: partes[1] ?? "", varianteId: partes[2] ?? "unica" };
  }
  return { produtoId: partes[0], varianteId: partes[1] ?? "unica" };
}

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
    const antigos = idsDoItem(item.id);
    items.push({
      id: item.id,
      produtoId: typeof item.produtoId === "string" ? item.produtoId : antigos.produtoId,
      varianteId: typeof item.varianteId === "string" ? item.varianteId : antigos.varianteId,
      tipo: (item.tipo ?? "outro") as TipoPedido,
      nome: item.nome,
      variante: typeof item.variante === "string" ? item.variante : null,
      precoCent: precoGuardado(item),
      pessoas: typeof item.pessoas === "number" ? item.pessoas : null,
      quantidade,
      unidade: item.unidade === "kg" ? "kg" : "un",
      minimo,
      passo,
      notas: typeof item.notas === "string" && item.notas.trim() ? item.notas : null,
    });
  }
  return items;
}

/* Os cestos de antes de outubro de 2026 guardavam euros em `preco`. Lê-se um
   ou outro; nunca os dois, para um número não ser convertido duas vezes. */
function precoGuardado(item: Partial<ItemCesto> & { preco?: unknown }): number | null {
  if (typeof item.precoCent === "number") return Math.round(item.precoCent);
  if (typeof item.preco === "number") return Math.round(item.preco * 100);
  return null;
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
  somaCent: number;
  semPreco: number;
} {
  let somaCent = 0;
  let semPreco = 0;
  for (const item of cesto) {
    if (item.precoCent === null) semPreco += 1;
    else somaCent += totalDaLinha(item.precoCent, item.quantidade);
  }
  return { somaCent, semPreco };
}

/* Ao quilo, 1,5 kg a 1700 cêntimos são 2550: arredonda-se uma vez por linha, e
   é a mesma conta que o `cotarCesto` faz no servidor. */
export const totalDaLinha = (precoCent: number, quantidade: number): number =>
  Math.round(precoCent * quantidade);

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

  const linhas = cesto.flatMap((item) => {
    const nome = item.variante ? `${item.nome} (${item.variante})` : item.nome;
    const preco =
      item.precoCent === null
        ? rotulos.semPreco
        : formatarCent(totalDaLinha(item.precoCent, item.quantidade), locale);
    const linha = `- ${quantidadeEmTexto(item, locale)} ${nome} — ${preco}`;
    /* ⚠️ **As notas vão indentadas por baixo do artigo a que pertencem**, e não
       todas juntas no fim. Num pedido com três bolos, três mensagens em bloco no
       fim do email obrigam quem lê a adivinhar qual é de qual. */
    return item.notas ? [linha, `    ${item.notas.replace(/\n/g, "\n    ")}`] : [linha];
  });

  const { somaCent, semPreco } = estimativa(cesto);
  const rotulo = semPreco > 0 ? rotulos.aPartirDe : rotulos.estimativa;
  linhas.push("", `${rotulo}: ${formatarCent(somaCent, locale)}`);

  return linhas.join("\n");
}

/**
 * O que vai para o servidor: as linhas do cesto **sem preços**.
 *
 * ⚠️ É uma lista de campos escolhidos e não o item inteiro com o preço tirado:
 * um campo novo no `ItemCesto` não vai para o servidor por acaso. O servidor
 * refaz o cesto a partir do catálogo (`pedido-servidor.ts`), e o preço que o
 * `localStorage` guarda — que qualquer pessoa edita — nunca sai do browser.
 */
export const linhasDoCesto = (cesto: ItemCesto[]) =>
  cesto.map((item) => ({
    produtoId: item.produtoId,
    varianteId: item.varianteId,
    quantidade: item.quantidade,
    notas: item.notas,
  }));

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

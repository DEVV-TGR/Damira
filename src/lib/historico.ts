import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { normalizarCesto, type ItemCesto } from "@/lib/cesto";
import type { TipoPedido } from "@/lib/pedidos";

/**
 * # O histórico de pedidos
 *
 * ## ⚠️ Isto são **os pedidos feitos neste browser**, e o site diz isso
 *
 * Não é o histórico da casa. Não há base de dados: as encomendas saem daqui por
 * email e nada nosso as guarda (ver `autenticacao.ts`). O que existe é o
 * registo que **o próprio browser** faz do que enviou, exactamente como o cesto.
 *
 * Isso quer dizer três coisas que a interface tem de dizer em vez de esconder:
 *
 * 1. quem pede no telemóvel não vê esse pedido no computador;
 * 2. limpar os dados do site apaga o registo;
 * 3. um pedido feito ao telefone nunca aparece aqui.
 *
 * **Chamar-lhe «as suas encomendas» sem esta ressalva era mentir com uma
 * funcionalidade.** Um histórico que parece completo e não é vale menos do que
 * nenhum, porque quem não encontra lá o pedido conclui que ele não existe.
 *
 * ## O que isto resolve mesmo assim, e não é pouco
 *
 * - **A referência.** Cada pedido leva um código que vai no assunto do email; ao
 *   telefone, dizer «DAM-0309-4F7K» poupa a conversa toda sobre qual dos pedidos
 *   é. Era o ponto 1 da issue #15;
 * - **O que eu pedi da última vez**, que numa pastelaria é a pergunta mais
 *   frequente que há — e daí o botão de repetir;
 * - **O que ficou por enviar.** Sem serviço de email configurado, o pedido volta
 *   para a pessoa o mandar do seu correio, e é fácil fechar o separador a meio.
 *   O registo fica marcado `por-enviar` e não deixa esquecer.
 *
 * ## O que seria preciso para ser o histórico a sério
 *
 * Uma base de dados, um adaptador de sessão e as encomendas guardadas do lado do
 * servidor. É âmbito novo e tem custo: está escrito no README e na #1.
 */
export type EstadoPedido = "enviado" | "por-enviar";

/**
 * Um artigo de um pedido feito. É a linha do cesto sem as pessoas: o `tipo`, o
 * `minimo`, o `passo` e a `unidade` ficam para o botão de repetir devolver o
 * artigo com a regra certa — sem eles, repetir um pedido de bolo punha 2
 * «unidades» em vez de 2 kg —, e o `produtoId`/`varianteId` para o servidor o
 * voltar a cotar.
 */
export type ItemGuardado = Omit<ItemCesto, "pessoas">;

export type PedidoGuardado = {
  /** `DAM-0309-4F7K`. Vai no assunto do email e serve para falar ao telefone. */
  referencia: string;
  /** ISO, em UTC. Formata-se na leitura, com o `Intl` da língua da página. */
  quando: string;
  estado: EstadoPedido;
  tipo: TipoPedido;
  /** A data pretendida, como veio do formulário: `2026-09-20`. */
  data: string;
  pessoas: number | null;
  itens: ItemGuardado[];
  /**
   * A estimativa no momento do pedido, em cêntimos, **calculada pelo servidor**
   * — os preços de hoje podem já ser outros.
   */
  estimativaCent: number;
  semPreco: number;
};

/**
 * ⚠️ **Vinte pedidos e não mais.**
 *
 * O `localStorage` tem uns 5 MB por origem e é partilhado com o cesto. Um
 * histórico sem tecto enche-o ao fim de uns anos e a partir daí **o cesto deixa
 * de gravar**, em silêncio — o pedido a ser encomendado paga a conta do que já
 * foi. Vinte chega para qualquer pessoa se lembrar do que pediu.
 */
export const MAXIMO_GUARDADO = 20;

/** A mesma regra de chave do cesto: por pessoa quando há sessão. */
export const chaveDoHistorico = (idUtilizador?: string | null): string =>
  idUtilizador ? `damira:historico:${idUtilizador}` : "damira:historico";

/**
 * A referência de um pedido.
 *
 * ⚠️ **Gerada no servidor e não no cliente.** No cliente teria de sair de um
 * `useState` preenchido depois da montagem, senão o servidor e o browser
 * renderizavam códigos diferentes e o React desfazia a página. E, gerada no
 * servidor, é a **mesma** que vai no email — que é o ponto todo de haver uma
 * referência.
 *
 * Sem letras que se confundem ao telefone: nem `I`, nem `O`, nem `0`, nem `1`.
 * Quem lê isto em voz alta a alguém do outro lado do balcão agradece.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* ⚠️ O dia é o **de Lisboa**, e o `agora` entra por argumento. Lia o dia UTC,
   e entre a meia-noite e a uma da manhã de verão um pedido feito a 6 saía com
   a referência do dia 5 — a regra 3 do AGENTS.md, vista do lado do código que
   se diz ao telefone. */
export function gerarReferencia(agora: Date): string {
  let sufixo = "";
  for (let i = 0; i < 4; i++) {
    sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `DAM-${format(agora, "ddMM", { in: tz("Europe/Lisbon") })}-${sufixo}`;
}

/** O cesto, transformado no que fica guardado. */
const semPessoas = (item: ItemCesto): ItemGuardado => {
  const { pessoas, ...guardado } = item;
  void pessoas;
  return guardado;
};

export const itensGuardados = (cesto: ItemCesto[]): ItemGuardado[] => cesto.map(semPessoas);

/** O caminho de volta: um artigo guardado outra vez no cesto. */
export const paraOCesto = (item: ItemGuardado): ItemCesto => ({
  ...item,
  notas: item.notas ?? null,
  pessoas: null,
});

/**
 * Põe em forma o que veio do armazenamento local.
 *
 * ⚠️ Mesma razão que o `normalizarCesto`: o que lá está foi escrito por uma
 * versão anterior deste site e pode não ter a forma que o código de hoje espera.
 * Um registo estranho **descarta-se**, não rebenta a página da conta.
 */
export function normalizarHistorico(lido: unknown): PedidoGuardado[] {
  if (!Array.isArray(lido)) return [];
  const pedidos: PedidoGuardado[] = [];
  for (const bruto of lido) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const p = bruto as Partial<PedidoGuardado> & { estimativa?: unknown };
    if (typeof p.referencia !== "string" || typeof p.quando !== "string") continue;
    pedidos.push({
      referencia: p.referencia,
      quando: p.quando,
      estado: p.estado === "por-enviar" ? "por-enviar" : "enviado",
      tipo: (p.tipo ?? "outro") as TipoPedido,
      data: typeof p.data === "string" ? p.data : "",
      pessoas: typeof p.pessoas === "number" ? p.pessoas : null,
      /* Os artigos passam pela mesma normalização do cesto: um pedido guardado
         antes de outubro de 2026 não tem ids nem cêntimos, e é ali que se
         recuperam. */
      itens: normalizarCesto(p.itens).map(semPessoas),
      estimativaCent:
        typeof p.estimativaCent === "number"
          ? p.estimativaCent
          : typeof p.estimativa === "number"
            ? Math.round(p.estimativa * 100)
            : 0,
      semPreco: typeof p.semPreco === "number" ? p.semPreco : 0,
    });
  }
  return pedidos;
}

import { z } from "zod";

/**
 * O pedido de encomenda: o que se valida e para onde vai.
 *
 * ## Isto não é um checkout, e o modelo diz isso
 *
 * Não há carrinho, não há total e não há pagamento — **e nenhuma dessas coisas
 * se podia fingir**. O preço de um bolo por medida não existe até haver
 * conversa: o catálogo da casa não traz um único número (ver `bolos.ts`). Um
 * formulário que cobrasse antes disso vendia uma coisa que a casa não pode
 * cumprir.
 *
 * O que isto é: **a conversa que já acontece ao telefone, escrita de uma vez.**
 * Hoje a Damira recebe "quanto custa um bolo?" no Instagram e responde vinte
 * vezes ao mesmo; com isto recebe o pedido completo à primeira — o que, para
 * quantas pessoas, para que dia, e como se responde a quem pediu.
 */

/**
 * ⚠️ **`ementa` é o tipo novo, e não é um kit.**
 *
 * É o que se pede a partir da carta — uma dúzia de pastéis de nata, dois quilos
 * de bolo vegan — e existe separado dos kits porque **é outra conversa na
 * cozinha**: um kit monta-se de uma receita fechada, uma dúzia de pastéis é
 * produção do dia a multiplicar. Quem recebe o email precisa de ver a diferença
 * na primeira linha, sem ler o resto. Ver `encomendavel.ts`.
 */
export const TIPOS_PEDIDO = [
  "festa",
  "bolo",
  "box",
  "ementa",
  "outro",
] as const;

export type TipoPedido = (typeof TIPOS_PEDIDO)[number];

/**
 * ⚠️ **A data é validada contra hoje, e não contra um prazo.**
 *
 * A casa ainda não disse de quantos dias precisa para um kit de setenta — está
 * na lista *Antes de publicar* do README. Enquanto não disser, o formulário
 * recusa **datas passadas** e mais nada: inventar aqui um mínimo de três dias
 * seria o site a comprometer a cozinha com um prazo que ninguém confirmou, e
 * pior do que não ter prazo é ter o errado.
 *
 * Quando o prazo chegar, é aqui que entra — uma linha — e o texto de erro já
 * existe nas mensagens.
 */
const dataFutura = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data-invalida")
  .refine((valor) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(`${valor}T12:00:00`) >= hoje;
  }, "data-passada");

export const EsquemaPedido = z
  .object({
    tipo: z.enum(TIPOS_PEDIDO),
    nome: z.string().trim().min(2, "nome-curto").max(120),
    /* Um dos dois chega, e a regra está no `superRefine`. Obrigar aos dois é
       pedir um dado que não é preciso — e cada campo obrigatório a mais é gente
       que desiste a meio. */
    email: z.union([z.email(), z.literal("")]).default(""),
    telefone: z.string().trim().max(40).default(""),
    data: dataFutura,
    pessoas: z.coerce.number().int().positive().max(500).nullable().default(null),
    detalhe: z.string().trim().min(10, "detalhe-curto").max(2000),
    /**
     * O RGPD exige consentimento **explícito e informado** para tratar os dados
     * de contacto. Uma caixa pré-marcada não vale, e um "ao enviar aceita" em
     * letra pequena também não — por isso é um campo obrigatório e não um aviso.
     */
    consentimento: z.literal(true, { message: "consentimento" }),
    /**
     * Campo-armadilha, invisível para pessoas e irresistível para robôs de
     * preenchimento automático. Preenchido, o pedido é descartado **em
     * silêncio**: responder "detectámos spam" ensina o robô a contornar.
     */
    armadilha: z.string().max(0).default(""),
  })
  .superRefine((pedido, ctx) => {
    if (!pedido.email && !pedido.telefone) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "sem-contacto",
      });
    }
  });

export type Pedido = z.infer<typeof EsquemaPedido>;

/**
 * Para onde vão os pedidos.
 *
 * ⚠️ **Hoje vão para a DevPlus e não para a Damira, e isso é de propósito** —
 * enquanto o site é uma demonstração, os pedidos de teste chegam a quem está a
 * construí-lo em vez de irem tocar à cozinha de uma casa que ainda não sabe que
 * o site existe.
 *
 * **É a primeira coisa a mudar no dia do lançamento.** Um site publicado a
 * mandar as encomendas para a agência é uma casa a perder trabalho sem dar por
 * isso — e é o tipo de defeito que só se descobre quando um cliente telefona a
 * perguntar porque é que ninguém lhe respondeu.
 */
export const DESTINO_PEDIDOS =
  process.env.EMAIL_PEDIDOS?.trim() || "support@devplus.pt";

/**
 * O remetente. Tem de ser um domínio verificado no serviço de envio; o
 * `onboarding@resend.dev` é o endereço de testes e **só entrega para a conta que
 * criou a chave**, o que chega para a demonstração e não chega para produção.
 */
export const REMETENTE_PEDIDOS =
  process.env.EMAIL_REMETENTE?.trim() || "onboarding@resend.dev";

/** O corpo do email que a casa recebe. Texto simples e não HTML: é para ser
 *  lido e respondido, não para ser bonito — e um email de texto passa em
 *  qualquer cliente de correio sem se partir. */
export function corpoDoPedido(
  pedido: Pedido,
  rotulos: Record<string, string>,
  referencia?: string,
) {
  const linhas = [
    /* ⚠️ **A referência é a primeira linha.** Quem lê isto no telemóvel ao
       balcão vê o código sem rolar, que é a única altura em que ele serve. */
    referencia ? `Referência: ${referencia}` : null,
    `Tipo: ${rotulos[pedido.tipo] ?? pedido.tipo}`,
    `Nome: ${pedido.nome}`,
    pedido.email ? `Email: ${pedido.email}` : null,
    pedido.telefone ? `Telefone: ${pedido.telefone}` : null,
    `Data pretendida: ${pedido.data}`,
    pedido.pessoas ? `Pessoas: ${pedido.pessoas}` : null,
    "",
    "Pedido:",
    pedido.detalhe,
  ];

  return linhas.filter((linha) => linha !== null).join("\n");
}

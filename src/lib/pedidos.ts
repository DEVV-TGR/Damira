import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
import { telefoneArrumado } from "@/lib/telefone";

/**
 * O pedido que sai da página de compra (`/encomendas/pedido`): o que se valida
 * e como se escreve o email que a casa recebe.
 *
 * ⚠️ **Até haver pagamento online (#38), o pedido acaba num email** — a casa
 * confirma o valor e a hora com o cliente. A página de compra já é a final; o
 * que muda com o Stripe é o botão do fim, que passa a «Pagar».
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

const LISBOA = { in: tz("Europe/Lisbon") };

/**
 * ⚠️ **A data não pode ser passada — em Lisboa.** Lia «hoje» pela hora local do
 * servidor, que na Vercel é UTC: entre a meia-noite e a uma da manhã de verão
 * aceitava a data de ontem. O `agora` entra por argumento (regra 3 do
 * `AGENTS.md`), e as datas comparam-se como texto («2026-10-06»), que é como os
 * dias civis se ordenam.
 *
 * Quando o calendário funciona, a data nem vem do browser: sai da hora
 * confirmada no servidor. Isto vale para quando não há calendário e a pessoa
 * escreve a data pretendida.
 */
const dataNaoPassada = (agora: Date) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "data-invalida")
    .refine((valor) => valor >= format(agora, "yyyy-MM-dd", LISBOA), "data-passada");

/**
 * Os dados da página de compra. As mensagens de erro são chaves de
 * `encomendas.formulario.erros`, em PT e EN.
 */
/**
 * O número escrito, para o país escolhido, em E.164 — ou `null` se não for um
 * telefone válido desse país. ⚠️ **Os metadados completos** (`/max`): os pequenos
 * aceitavam um `811 222 333` português. Este ficheiro só corre no servidor; os
 * componentes importam dele apenas tipos.
 */
export function telefoneValido(texto: string, pais: string): string | null {
  const numero = parsePhoneNumberFromString(texto, (pais || "PT") as Parameters<typeof parsePhoneNumberFromString>[1]);
  return numero?.isValid() ? numero.number : null;
}

/**
 * Até quando a loja está em pausa, escrito para o cliente: «11:30», ou
 * «amanhã… às 07:00» quando é outro dia. `null` se não está em pausa. Sempre em
 * hora de Lisboa (regra 3), seja qual for a língua.
 */
export function quandoVoltaALoja(pausaAte: Date | null, agora: Date, locale: string): string | null {
  if (!pausaAte || pausaAte.getTime() <= agora.getTime()) return null;
  const dia = (d: Date) => format(d, "yyyy-MM-dd", { in: tz("Europe/Lisbon") });
  const hora = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(pausaAte);
  if (dia(pausaAte) === dia(agora)) return hora;
  const quando = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" }).format(pausaAte);
  return `${quando}, ${hora}`;
}

export const esquemaCompra = (agora: Date) =>
  z.object({
    nome: z.string().trim().min(2, "nome-curto").max(120),
    /* Obrigatório: é para lá que vai a confirmação com a referência
       (`pedidos.md` › O cliente). */
    email: z.email("email-invalido").max(200),
    /* Obrigatório também: é por ele que o balcão liga quando alguma coisa muda,
       e o talão leva-o. */
    telefone: z.string().trim().min(1, "telefone-curto").max(40),
    /** O país do seletor (`PT`, `ES`…). O número valida-se para ele. */
    pais: z.string().regex(/^[A-Z]{2}$/).default("PT"),
    nif: z
      .union([z.string().trim().regex(/^\d{9}$/, "nif-invalido"), z.literal("")])
      .default(""),
    observacoes: z.string().trim().max(1000).default(""),
    data: dataNaoPassada(agora),
    /**
     * O RGPD exige consentimento **explícito e informado** para tratar os dados
     * de contacto. Uma caixa pré-marcada não vale, e um "ao enviar aceita" em
     * letra pequena também não — por isso é um campo obrigatório e não um aviso.
     */
    consentimento: z.literal(true, { message: "consentimento" }),
  })
  /* O telefone sai daqui já em E.164 (`+351911222333`), que é como o contrato
     o guarda (`pedidos.md` › O cliente). */
  .transform((dados, ctx) => {
    const telefone = telefoneValido(dados.telefone, dados.pais);
    if (telefone === null && dados.telefone !== "") {
      ctx.addIssue({ code: "custom", path: ["telefone"], message: "telefone-invalido" });
      return z.NEVER;
    }
    return { ...dados, telefone: telefone ?? dados.telefone };
  });

export type DadosCompra = z.infer<ReturnType<typeof esquemaCompra>>;

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

/**
 * O email que a casa recebe, **por secções**: o pedido, quando se levanta, quem
 * é, o que leva, as observações e o pagamento. Pedido do cliente a 04/10: todos
 * os dados, obrigatórios e opcionais — **um opcional vazio escreve-se «—»**, e
 * não desaparece, para quem lê saber que não foi preenchido e não ficar a
 * pensar que se perdeu.
 *
 * Texto simples e não HTML: é para ser lido e respondido no telemóvel de quem
 * atende, e um email de texto abre em qualquer cliente de correio sem se
 * partir. Sempre em português e em hora de Lisboa — é para a casa, seja qual
 * for a língua de quem encomendou.
 */
export function corpoDaCompra(pedido: {
  referencia: string;
  enviadoEm: Date;
  modoDeTeste: boolean;
  levantamento: Date | null;
  /** A hora é pretendida e confirma-se com o cliente (sem dados da cozinha). */
  aConfirmar?: boolean;
  data: string;
  dados: DadosCompra;
  cesto: string;
}): string {
  const { dados } = pedido;
  const porExtenso = (quando: Date) => format(quando, "EEEE, d 'de' MMMM 'às' HH:mm", { ...LISBOA, locale: pt });
  const ou = (valor: string) => valor || "— (não indicado)";
  const seccao = (titulo: string, linhas: string[]) => ["", titulo.toUpperCase(), ...linhas];

  return [
    /* ⚠️ **A referência é a primeira linha.** Quem lê isto no telemóvel ao balcão
       vê o código sem rolar, que é a única altura em que ele serve. */
    `PEDIDO ${pedido.referencia}`,
    `Enviado pelo site: ${porExtenso(pedido.enviadoEm)} (hora de Lisboa)`,
    ...(pedido.modoDeTeste
      ? ["⚠️ MODO DE TESTE — os prazos são de exemplo e não se cobrou nada."]
      : []),
    ...seccao("Levantamento na loja", [
      pedido.levantamento
        ? pedido.aConfirmar
          ? `${porExtenso(pedido.levantamento)} (hora de Lisboa) — HORA PRETENDIDA, a confirmar com o cliente`
          : `${porExtenso(pedido.levantamento)} (hora de Lisboa)`
        : `${pedido.data} — hora a combinar com o cliente`,
    ]),
    ...seccao("Cliente", [
      `Nome:      ${dados.nome}`,
      `Email:     ${dados.email}`,
      `Telefone:  ${telefoneArrumado(dados.telefone)}`,
      `NIF:       ${ou(dados.nif)}`,
    ]),
    ...seccao("O que leva", [pedido.cesto]),
    ...seccao("Observações", [ou(dados.observacoes)]),
    ...seccao("Pagamento", [
      "Ainda sem pagamento online: o valor confirma-se com o cliente.",
    ]),
  ].join("\n");
}

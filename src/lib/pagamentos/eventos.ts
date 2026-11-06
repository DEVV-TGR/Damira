import type Stripe from "stripe";
import { z } from "zod";
import type { Reembolso } from "@/lib/dados/tipos";

/**
 * # Do evento do Stripe à ação
 *
 * O que o webhook lê de um evento e o que decide fazer com ele, sem rede e sem
 * base de dados: funções puras, testadas sem o Stripe (`pagamentos.md` ›
 * Testes). A rota verifica a assinatura antes; a fonte (`tipos.ts`) faz depois.
 *
 * ⚠️ **Lê-se com zod, e só o que se usa.** Os tipos do SDK só existem na
 * compilação: em execução o corpo vem na versão da API do endpoint, e se não for
 * a do SDK um campo pode faltar sem erro nenhum. O schema não copia o objeto
 * inteiro do Stripe — centenas de campos que não usamos e que mudam a cada
 * versão —, mas cada um leva um `satisfies` contra o tipo do SDK: uma subida que
 * mude um campo que lemos faz falhar o `build`.
 */

/** Os eventos que tratamos (`pagamentos.md` › O que faz com cada evento). Os outros respondem 200. */
export const TIPOS_TRATADOS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
] as const satisfies readonly Stripe.Event.Type[];

export type TipoTratado = (typeof TIPOS_TRATADOS)[number];

const tratamos = (tipo: string): tipo is TipoTratado => (TIPOS_TRATADOS as readonly string[]).includes(tipo);

// ——— O envelope ———

const EsquemaEnvelope = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string().min(1),
  livemode: z.boolean(),
  /** Pode vir vazia em eventos antigos. Guarda-se: um evento nunca muda depois de criado. */
  api_version: z.string().nullable(),
  created: z.number().int(),
  data: z.object({ object: z.unknown() }),
}) satisfies z.ZodType<Pick<Stripe.Event, "id" | "livemode" | "api_version" | "created">>;

export type Envelope = z.infer<typeof EsquemaEnvelope>;

export const lerEnvelope = (json: unknown) => EsquemaEnvelope.safeParse(json);

// ——— Os objetos ———

/* Os metadados são nossos — o `pedidoId` e a referência que o checkout da #38
   lá põe —, mas uma sessão que não é nossa (um Payment Link criado no painel do
   Stripe) chega sem eles. */
const Metadados = z.record(z.string(), z.string()).nullable();

const EsquemaSessao = z.object({
  object: z.literal("checkout.session"),
  id: z.string().min(1),
  /* Texto e não enum: o Stripe pode acrescentar estados, e só `paid` paga. */
  payment_status: z.string(),
  amount_total: z.number().int().nonnegative().nullable(),
  currency: z.string().nullable(),
  payment_intent: z.string().nullable(),
  client_reference_id: z.string().nullable(),
  metadata: Metadados,
  livemode: z.boolean(),
}) satisfies z.ZodType<
  Pick<
    Stripe.Checkout.Session,
    | "object"
    | "id"
    | "payment_status"
    | "amount_total"
    | "currency"
    | "payment_intent"
    | "client_reference_id"
    | "metadata"
    | "livemode"
  >
>;

export type Sessao = z.infer<typeof EsquemaSessao>;

/**
 * A sessão do Stripe, lida. É a mesma leitura nos dois caminhos que confirmam
 * um pagamento: o webhook e o «voltar atrás» do #38, que encontra a sessão já
 * paga e a vai buscar com `checkout.sessions.retrieve` (`pagamentos.md` ›
 * Voltar do Stripe). ⚠️ Sem `expand` do `payment_intent`: expandido, vem um
 * objeto em vez do id, e a sessão não se lê.
 */
export const lerSessao = (objeto: unknown) => EsquemaSessao.safeParse(objeto);

/** Os cinco estados de um reembolso no Stripe. Um sexto, que não conhecemos, não se lê: dá 5xx e alerta. */
const ESTADOS_STRIPE_DO_REEMBOLSO = ["pending", "requires_action", "succeeded", "failed", "canceled"] as const;
export type EstadoStripeDoReembolso = (typeof ESTADOS_STRIPE_DO_REEMBOLSO)[number];

const EsquemaReembolsoStripe = z.object({
  object: z.literal("refund"),
  id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  status: z.enum(ESTADOS_STRIPE_DO_REEMBOLSO),
  /* Só vem quando falha; ausente e `null` são a mesma coisa. */
  failure_reason: z
    .string()
    .nullish()
    .transform((motivo) => motivo ?? undefined),
  payment_intent: z.string().nullable(),
  charge: z.string().nullable(),
  metadata: Metadados,
}) satisfies z.ZodType<
  Pick<
    Stripe.Refund,
    "object" | "id" | "amount" | "currency" | "status" | "failure_reason" | "payment_intent" | "charge" | "metadata"
  >
>;

const EsquemaDisputa = z.object({
  object: z.literal("dispute"),
  id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  reason: z.string(),
  charge: z.string(),
  payment_intent: z.string().nullable(),
}) satisfies z.ZodType<
  Pick<Stripe.Dispute, "object" | "id" | "amount" | "currency" | "reason" | "charge" | "payment_intent">
>;

type ReembolsoStripe = z.infer<typeof EsquemaReembolsoStripe>;
type Disputa = z.infer<typeof EsquemaDisputa>;

/** Um evento que tratamos, já lido. */
export type EventoLido = { id: string; livemode: boolean; apiVersion: string | null } & (
  | {
      tipo: Extract<TipoTratado, `checkout.session.${string}`>;
      sessao: Sessao;
    }
  | { tipo: Extract<TipoTratado, `refund.${string}`>; reembolso: ReembolsoStripe }
  | { tipo: "charge.dispute.created"; disputa: Disputa }
);

export type LeituraDoObjeto =
  | { leitura: "nao-tratado" }
  | { leitura: "objeto-invalido"; erro: z.ZodError }
  | { leitura: "evento"; evento: EventoLido };

/**
 * O objeto de um evento, se for de um tipo que tratamos. Um tipo tratado que o
 * zod não lê é erro nosso: a rota responde 5xx, e o Stripe volta a tentar
 * depois de corrigido — nunca 200 a um pagamento que não se tratou.
 */
export function lerObjeto(envelope: Envelope): LeituraDoObjeto {
  const tipo = envelope.type;
  if (!tratamos(tipo)) return { leitura: "nao-tratado" };
  const comum = { id: envelope.id, livemode: envelope.livemode, apiVersion: envelope.api_version };
  const objeto = envelope.data.object;

  switch (tipo) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const lido = lerSessao(objeto);
      return lido.success
        ? { leitura: "evento", evento: { ...comum, tipo, sessao: lido.data } }
        : { leitura: "objeto-invalido", erro: lido.error };
    }
    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const lido = EsquemaReembolsoStripe.safeParse(objeto);
      return lido.success
        ? { leitura: "evento", evento: { ...comum, tipo, reembolso: lido.data } }
        : { leitura: "objeto-invalido", erro: lido.error };
    }
    case "charge.dispute.created": {
      const lido = EsquemaDisputa.safeParse(objeto);
      return lido.success
        ? { leitura: "evento", evento: { ...comum, tipo, disputa: lido.data } }
        : { leitura: "objeto-invalido", erro: lido.error };
    }
  }
}

// ——— As ações ———

export type AcaoPagar = {
  tipo: "pagar";
  pedidoId: string;
  /** O `client_reference_id`. Só para os logs, que levam a referência e mais nada (`robustez.md` › Logs). */
  referencia: string | null;
  sessaoId: string;
  /**
   * O que o Stripe cobrou, em cêntimos. A fonte confere-o com o que ficou
   * gravado quando o pedido nasceu — o total ou o sinal —, e nunca o recalcula
   * com o catálogo de hoje.
   */
  montanteCent: number;
  moeda: string;
  /* Para ligar ao pedido um reembolso ou uma disputa que não pedimos (ver a
     descrição do PR). */
  paymentIntentId: string | null;
  /* O da sessão. No webhook é o do evento, que a rota já conferiu com o modo da loja. */
  livemode: boolean;
};

export type AcaoExpirar = {
  tipo: "expirar";
  pedidoId: string;
  referencia: string | null;
  sessaoId: string;
  porque: "sessao-expirada" | "pagamento-falhou";
};

export type AcaoReembolso = {
  tipo: "reembolso";
  stripeRefundId: string;
  /** Dos metadados, nos reembolsos que pedimos. `null` num feito no painel do Stripe. */
  pedidoId: string | null;
  /**
   * O nosso id, também dos metadados (`metadata.reembolsoId`). É o que reconhece um
   * reembolso nosso cuja resposta se perdeu: sem ele, o evento parecia um reembolso
   * externo, e o nosso cedia a si próprio (#49).
   */
  reembolsoId: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  valorCent: number;
  moeda: string;
  estadoStripe: EstadoStripeDoReembolso;
  estado: Reembolso["estado"];
  /** O `failure_reason` do Stripe, quando o dá. */
  motivo: string | null;
};

export type AcaoDisputa = {
  tipo: "disputa";
  disputaId: string;
  paymentIntentId: string | null;
  chargeId: string;
  valorCent: number;
  moeda: string;
  motivo: string;
};

export type AcaoNada = {
  tipo: "nada";
  /**
   * - `sessao-por-pagar`: `completed` não quer dizer pago. Com os métodos que
   *   aceitamos vem sempre `paid`, mas um método assíncrono acaba noutro evento.
   * - `sessao-de-fora`: sem `pedidoId` nosso — não chega à base de dados.
   */
  porque: "sessao-por-pagar" | "sessao-de-fora";
};

export type AcaoWebhook = AcaoPagar | AcaoExpirar | AcaoReembolso | AcaoDisputa | AcaoNada;

/**
 * Os cinco estados do Stripe nos três do pedido (`pedidos.md` › Reembolsos,
 * decidido a 02/11). O `estadoStripe` guarda qual dos cinco foi.
 */
export const estadoDoReembolso = (estado: EstadoStripeDoReembolso): Reembolso["estado"] => {
  switch (estado) {
    case "pending":
    case "requires_action":
      return "pendente";
    case "succeeded":
      return "concluido";
    case "failed":
    case "canceled":
      return "falhado";
  }
};

/* O formato que a coluna `uuid` aceita. Um `pedidoId` que não o tenha não é
   nosso: levá-lo à base de dados dava um erro, e um erro dava um 5xx e
   retentativas durante três dias. */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pedidoIdDe = (metadados: Record<string, string> | null): string | null => {
  const id = metadados?.pedidoId;
  return id !== undefined && FORMATO_UUID.test(id) ? id : null;
};

/**
 * Uma sessão paga → `pagar`; o resto → `nada`. As regras de quando uma sessão
 * paga vivem só aqui: o webhook e o «voltar atrás» do #38 passam os dois por
 * esta função, e depois pela mesma `marcarPago`.
 */
export function acaoDaSessao(sessao: Sessao): AcaoPagar | AcaoNada {
  const pedidoId = pedidoIdDe(sessao.metadata);
  if (pedidoId === null) return { tipo: "nada", porque: "sessao-de-fora" };
  if (sessao.payment_status !== "paid") return { tipo: "nada", porque: "sessao-por-pagar" };
  /* Uma sessão de pagamento traz sempre os dois. Se faltarem, é uma forma que
     não sabemos ler: rebenta, e no webhook a rota responde 5xx em vez de dar
     por tratado um pagamento que não se tratou. */
  if (sessao.amount_total === null || sessao.currency === null) {
    throw new Error(`${sessao.id}: sessão paga sem montante ou sem moeda`);
  }
  return {
    tipo: "pagar",
    pedidoId,
    referencia: sessao.client_reference_id,
    sessaoId: sessao.id,
    montanteCent: sessao.amount_total,
    moeda: sessao.currency,
    paymentIntentId: sessao.payment_intent,
    livemode: sessao.livemode,
  };
}

/**
 * O que fazer com um evento (`pagamentos.md` › O que faz com cada evento). Não
 * decide se o pedido muda — isso é da fonte, que conhece o estado dele; decide
 * só a pergunta que se lhe faz.
 */
export function acaoDoEvento(evento: EventoLido): AcaoWebhook {
  switch (evento.tipo) {
    case "checkout.session.completed":
      return acaoDaSessao(evento.sessao);
    case "checkout.session.async_payment_succeeded": {
      const acao = acaoDaSessao(evento.sessao);
      /* O Stripe manda este evento com a sessão já `paid`. Se não vier, é uma
         forma que não sabemos ler, como acima: 5xx, e nunca 200 a um pagamento
         que o Stripe diz que aconteceu. */
      if (acao.tipo === "nada" && acao.porque === "sessao-por-pagar") {
        throw new Error(`${evento.id}: pagamento assíncrono confirmado com a sessão por pagar`);
      }
      return acao;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const { sessao } = evento;
      const pedidoId = pedidoIdDe(sessao.metadata);
      if (pedidoId === null) return { tipo: "nada", porque: "sessao-de-fora" };
      return {
        tipo: "expirar",
        pedidoId,
        referencia: sessao.client_reference_id,
        sessaoId: sessao.id,
        /* ⚠️ Um pagamento que falhou **nunca** paga: expira o pedido, se ainda
           estiver pendente. */
        porque: evento.tipo === "checkout.session.expired" ? "sessao-expirada" : "pagamento-falhou",
      };
    }
    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const { reembolso } = evento;
      return {
        tipo: "reembolso",
        stripeRefundId: reembolso.id,
        pedidoId: pedidoIdDe(reembolso.metadata),
        reembolsoId: reembolso.metadata?.reembolsoId ?? null,
        paymentIntentId: reembolso.payment_intent,
        chargeId: reembolso.charge,
        valorCent: reembolso.amount,
        moeda: reembolso.currency,
        estadoStripe: reembolso.status,
        estado: estadoDoReembolso(reembolso.status),
        motivo: reembolso.failure_reason ?? null,
      };
    }
    case "charge.dispute.created": {
      const { disputa } = evento;
      return {
        tipo: "disputa",
        disputaId: disputa.id,
        paymentIntentId: disputa.payment_intent,
        chargeId: disputa.charge,
        valorCent: disputa.amount,
        moeda: disputa.currency,
        motivo: disputa.reason,
      };
    }
  }
}

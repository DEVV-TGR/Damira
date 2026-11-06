import Stripe from "stripe";
import type { EstadoPedido } from "@/lib/dados/tipos";
import type { TipoTratado } from "./eventos";
import type { FonteWebhook, RegistoEvento, ResultadoWebhook } from "./tipos";
import type { DependenciasWebhook } from "./webhook";

/**
 * # O Stripe dos testes
 *
 * Só para testes. Os eventos saem destes construtores, tipados com os tipos do
 * SDK, e **nunca de JSON capturado** com o `stripe trigger`: o capturado traz
 * emails e ids da conta, e o repositório é público (`pagamentos.md` › Como o
 * código fica testável). Os ids são inventados e os metadados são os nossos.
 *
 * Cada objeto tem só os campos que o webhook lê, com o tipo do SDK: se uma
 * subida do SDK mudar um deles, o `build` falha aqui e no `eventos.ts`.
 */

/** Um segredo de teste, à vista. Não é de endpoint nenhum. */
export const SEGREDO = "whsec_so_para_os_testes";

export const AGORA = new Date("2026-11-03T15:20:00Z");

export const PEDIDO = "4f1c2e9a-8b7d-4c3e-9f6a-1d2b3c4e5f60";
export const OUTRO_PEDIDO = "0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d";

type Sessao = Pick<
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
>;

export const sessao = (campos: Partial<Sessao> = {}): Sessao => ({
  object: "checkout.session",
  id: "cs_test_a1b2c3",
  payment_status: "paid",
  amount_total: 4250,
  currency: "eur",
  payment_intent: "pi_test_a1b2c3",
  client_reference_id: "DAM-0311-4F7K",
  metadata: { pedidoId: PEDIDO, referencia: "DAM-0311-4F7K" },
  livemode: false,
  ...campos,
});

type ReembolsoStripe = Pick<
  Stripe.Refund,
  "object" | "id" | "amount" | "currency" | "status" | "failure_reason" | "payment_intent" | "charge" | "metadata"
>;

export const reembolso = (campos: Partial<ReembolsoStripe> = {}): ReembolsoStripe => ({
  object: "refund",
  id: "re_test_a1b2c3",
  amount: 1000,
  currency: "eur",
  status: "succeeded",
  payment_intent: "pi_test_a1b2c3",
  charge: "ch_test_a1b2c3",
  metadata: { pedidoId: PEDIDO },
  ...campos,
});

type Disputa = Pick<Stripe.Dispute, "object" | "id" | "amount" | "currency" | "reason" | "charge" | "payment_intent">;

export const disputa = (campos: Partial<Disputa> = {}): Disputa => ({
  object: "dispute",
  id: "dp_test_a1b2c3",
  amount: 4250,
  currency: "eur",
  reason: "fraudulent",
  charge: "ch_test_a1b2c3",
  payment_intent: "pi_test_a1b2c3",
  ...campos,
});

type Envelope = Pick<Stripe.Event, "id" | "object" | "api_version" | "created" | "livemode"> & {
  type: Stripe.Event.Type;
  data: { object: object };
};

let contador = 0;

/** Um evento. Cada um com um id novo, a não ser que se peça um. */
export const evento = (
  tipo: TipoTratado | Stripe.Event.Type,
  objeto: object,
  campos: Partial<Pick<Envelope, "id" | "livemode" | "api_version">> = {},
): Envelope => ({
  id: `evt_test_${++contador}`,
  object: "event",
  api_version: "2026-10-28.endive",
  created: Math.floor(AGORA.getTime() / 1000),
  livemode: false,
  type: tipo,
  data: { object: objeto },
  ...campos,
});

/** O cabeçalho `stripe-signature`, calculado como o Stripe o calcula. */
export const assinar = (corpo: string, opcoes: { segredo?: string; quando?: Date } = {}): string =>
  Stripe.webhooks.generateTestHeaderString({
    payload: corpo,
    secret: opcoes.segredo ?? SEGREDO,
    timestamp: Math.floor((opcoes.quando ?? AGORA).getTime() / 1000),
  });

/** O pedido HTTP que o Stripe faria, assinado. */
export const pedidoDoStripe = (
  corpo: string,
  assinatura: string | null = assinar(corpo),
): Request =>
  new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...(assinatura ? { "stripe-signature": assinatura } : {}) },
    body: corpo,
  });

// ——— A fonte em memória ———

export type PedidoFalso = { estado: EstadoPedido; chegouTarde: boolean };

export type FonteFalsa = FonteWebhook & {
  pedidos: Map<string, PedidoFalso>;
  eventos: Map<string, RegistoEvento>;
  chamadas: { metodo: keyof FonteWebhook; evento: string | null }[];
};

/**
 * A fonte do webhook em memória, com as transições do `pedidos.md`. Prova que a
 * rota faz a pergunta certa à fonte e responde bem ao que ela devolve; o que
 * só a base de dados garante — a corrida de duas confirmações, a vaga que volta
 * a ser ocupada — prova-se no PGlite e na Neon, com a implementação verdadeira.
 */
export function fonteFalsa(pedidos: Record<string, EstadoPedido> = {}): FonteFalsa {
  const estado = new Map<string, PedidoFalso>(
    Object.entries(pedidos).map(([id, estadoDoPedido]) => [id, { estado: estadoDoPedido, chegouTarde: false }]),
  );
  const eventos = new Map<string, RegistoEvento>();
  const chamadas: FonteFalsa["chamadas"] = [];

  /* O registo e o efeito juntos, como a verdadeira tem de os fazer. */
  const comRegisto =
    <A extends { pedidoId: string | null }>(
      metodo: keyof FonteWebhook,
      efeito: (pedido: PedidoFalso, acao: A) => ResultadoWebhook,
    ) =>
    async (evento: RegistoEvento | null, acao: A): Promise<ResultadoWebhook> => {
      chamadas.push({ metodo, evento: evento?.id ?? null });
      /* Sem evento (o «voltar atrás» do #38) não há registo: fica só a condição do estado. */
      if (evento) {
        if (eventos.has(evento.id)) return { resultado: "repetido" };
        eventos.set(evento.id, evento);
      }
      const pedido = acao.pedidoId === null ? undefined : estado.get(acao.pedidoId);
      if (!pedido) return { resultado: "pedido-desconhecido" };
      return efeito(pedido, acao);
    };

  return {
    pedidos: estado,
    eventos,
    chamadas,
    marcarPago: comRegisto("marcarPago", (pedido) => {
      if (pedido.estado !== "pendente" && pedido.estado !== "expirado") {
        return { resultado: "sem-efeito", estado: pedido.estado };
      }
      pedido.chegouTarde = pedido.estado === "expirado";
      pedido.estado = "pago";
      return { resultado: "mudou", estado: "pago", chegouTarde: pedido.chegouTarde };
    }),
    expirarPendente: comRegisto("expirarPendente", (pedido) => {
      if (pedido.estado !== "pendente") return { resultado: "sem-efeito", estado: pedido.estado };
      pedido.estado = "expirado";
      return { resultado: "mudou", estado: "expirado", chegouTarde: false };
    }),
    atualizarReembolso: comRegisto("atualizarReembolso", (pedido) => ({
      resultado: "sem-efeito",
      estado: pedido.estado,
    })),
    /* Uma disputa chega sem `pedidoId`: o pedido encontra-se pelo
       `payment_intent`, e a falsa não sabe fazê-lo. */
    registarDisputa: async (evento) => {
      chamadas.push({ metodo: "registarDisputa", evento: evento.id });
      if (eventos.has(evento.id)) return { resultado: "repetido" };
      eventos.set(evento.id, evento);
      return { resultado: "pedido-desconhecido" };
    },
  };
}

/** As dependências da rota nos testes: o modo de teste ligado, como até ao lançamento. */
export const dependencias = (campos: Partial<DependenciasWebhook> = {}): DependenciasWebhook => ({
  segredo: SEGREDO,
  emTeste: true,
  fonte: fonteFalsa(),
  avisarPainel: () => {},
  agora: () => AGORA,
  ...campos,
});

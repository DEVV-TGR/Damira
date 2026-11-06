import { describe, expect, it } from "vitest";
import {
  TIPOS_TRATADOS,
  acaoDaSessao,
  acaoDoEvento,
  estadoDoReembolso,
  lerEnvelope,
  lerObjeto,
  lerSessao,
  type EventoLido,
} from "./eventos";
import { PEDIDO, disputa, evento, reembolso, sessao } from "./teste-stripe";

/** O caminho da rota depois da assinatura, sem a rota. */
const ler = (e: object): EventoLido => {
  const envelope = lerEnvelope(JSON.parse(JSON.stringify(e)));
  if (!envelope.success) throw new Error("envelope inválido");
  const leitura = lerObjeto(envelope.data);
  if (leitura.leitura !== "evento") throw new Error(leitura.leitura);
  return leitura.evento;
};

const acao = (e: object) => acaoDoEvento(ler(e));

describe("de evento a ação", () => {
  it("completed com paid → pagar, com o que o Stripe cobrou", () => {
    expect(acao(evento("checkout.session.completed", sessao()))).toEqual({
      tipo: "pagar",
      pedidoId: PEDIDO,
      referencia: "DAM-0311-4F7K",
      sessaoId: "cs_test_a1b2c3",
      montanteCent: 4250,
      moeda: "eur",
      paymentIntentId: "pi_test_a1b2c3",
      livemode: false,
    });
  });

  it("completed não quer dizer pago: unpaid → nada", () => {
    expect(acao(evento("checkout.session.completed", sessao({ payment_status: "unpaid" })))).toEqual({
      tipo: "nada",
      porque: "sessao-por-pagar",
    });
  });

  it("um estado que o SDK ainda não conhece também não paga", () => {
    expect(acao(evento("checkout.session.completed", sessao({ payment_status: "um_estado_novo" }))).tipo).toBe("nada");
  });

  it("async_payment_succeeded → pagar", () => {
    expect(acao(evento("checkout.session.async_payment_succeeded", sessao())).tipo).toBe("pagar");
  });

  it("async_payment_succeeded com a sessão por pagar rebenta: 5xx, e nunca 200 a um pagamento que aconteceu", () => {
    expect(() =>
      acao(evento("checkout.session.async_payment_succeeded", sessao({ payment_status: "unpaid" }))),
    ).toThrow(/por pagar/);
  });

  it("async_payment_failed → expirar, e nunca pagar", () => {
    expect(acao(evento("checkout.session.async_payment_failed", sessao()))).toMatchObject({
      tipo: "expirar",
      porque: "pagamento-falhou",
    });
  });

  it("expired → expirar", () => {
    expect(acao(evento("checkout.session.expired", sessao({ payment_status: "unpaid" })))).toMatchObject({
      tipo: "expirar",
      pedidoId: PEDIDO,
      porque: "sessao-expirada",
    });
  });

  it.each([
    ["sem metadados", null],
    ["sem pedidoId", { referencia: "DAM-0311-4F7K" }],
    ["com um pedidoId que não é UUID", { pedidoId: "1; drop table pedidos" }],
  ])("uma sessão %s não é nossa → nada", (_, metadata) => {
    expect(acao(evento("checkout.session.completed", sessao({ metadata })))).toEqual({
      tipo: "nada",
      porque: "sessao-de-fora",
    });
    expect(acao(evento("checkout.session.expired", sessao({ metadata })))).toEqual({
      tipo: "nada",
      porque: "sessao-de-fora",
    });
  });

  it("uma sessão paga sem montante rebenta, para a rota responder 5xx", () => {
    expect(() => acao(evento("checkout.session.completed", sessao({ currency: null })))).toThrow(/sem montante/);
  });

  it("um reembolso, com o pedido dos metadados", () => {
    expect(acao(evento("refund.updated", reembolso({ status: "pending" })))).toEqual({
      tipo: "reembolso",
      stripeRefundId: "re_test_a1b2c3",
      pedidoId: PEDIDO,
      reembolsoId: null,
      paymentIntentId: "pi_test_a1b2c3",
      chargeId: "ch_test_a1b2c3",
      valorCent: 1000,
      moeda: "eur",
      estadoStripe: "pending",
      estado: "pendente",
      motivo: null,
    });
  });

  it("um reembolso nosso traz o nosso id, para não parecer externo se a resposta se perdeu", () => {
    expect(acao(evento("refund.created", reembolso({ metadata: { pedidoId: PEDIDO, reembolsoId: "r1" } })))).toMatchObject({
      reembolsoId: "r1",
    });
  });

  it("um reembolso feito no painel do Stripe chega sem pedido, e entra na mesma", () => {
    expect(acao(evento("refund.created", reembolso({ metadata: {} })))).toMatchObject({
      tipo: "reembolso",
      pedidoId: null,
      paymentIntentId: "pi_test_a1b2c3",
    });
  });

  it("uma disputa", () => {
    expect(acao(evento("charge.dispute.created", disputa()))).toEqual({
      tipo: "disputa",
      disputaId: "dp_test_a1b2c3",
      paymentIntentId: "pi_test_a1b2c3",
      chargeId: "ch_test_a1b2c3",
      valorCent: 4250,
      moeda: "eur",
      motivo: "fraudulent",
    });
  });
});

/* O «voltar atrás» do #38 vai buscar a sessão ao Stripe quando a encontra já
   paga, e tem de a ler e decidir como o webhook (`pagamentos.md` › Voltar do
   Stripe). */
describe("a sessão sem o evento: o voltar atrás do #38", () => {
  const lida = (objeto: unknown) => {
    const leitura = lerSessao(JSON.parse(JSON.stringify(objeto)));
    if (!leitura.success) throw leitura.error;
    return leitura.data;
  };

  it("lê-se e decide-se como no completed", () => {
    expect(acaoDaSessao(lida(sessao()))).toEqual(acao(evento("checkout.session.completed", sessao())));
    expect(acaoDaSessao(lida(sessao({ payment_status: "unpaid" })))).toEqual({
      tipo: "nada",
      porque: "sessao-por-pagar",
    });
    expect(acaoDaSessao(lida(sessao({ metadata: null })))).toEqual({ tipo: "nada", porque: "sessao-de-fora" });
  });

  it("o modo é o da sessão", () => {
    expect(acaoDaSessao(lida(sessao({ livemode: true })))).toMatchObject({ tipo: "pagar", livemode: true });
  });

  it("um payment_intent expandido não se lê: pede-se a sessão sem expand", () => {
    expect(lerSessao({ ...sessao(), payment_intent: { id: "pi_test_a1b2c3", object: "payment_intent" } }).success).toBe(
      false,
    );
  });
});

describe("os estados do reembolso: cinco no Stripe, três no pedido", () => {
  it.each([
    ["pending", "pendente"],
    ["requires_action", "pendente"],
    ["succeeded", "concluido"],
    ["failed", "falhado"],
    ["canceled", "falhado"],
  ] as const)("%s → %s", (doStripe, nosso) => {
    expect(estadoDoReembolso(doStripe)).toBe(nosso);
  });

  it("um sexto estado não se lê: é 5xx, e não um estado inventado", () => {
    const envelope = lerEnvelope(JSON.parse(JSON.stringify(evento("refund.updated", { ...reembolso(), status: "novo" }))));
    expect(envelope.success && lerObjeto(envelope.data).leitura).toBe("objeto-invalido");
  });
});

describe("a leitura", () => {
  it("um api_version vazio, de um evento antigo, lê-se", () => {
    expect(ler(evento("checkout.session.completed", sessao(), { api_version: null })).apiVersion).toBeNull();
  });

  it("um failure_reason a null lê-se como ausente", () => {
    const e = evento("refund.failed", { ...reembolso({ status: "failed" }), failure_reason: null });
    expect(acao(e)).toMatchObject({ motivo: null });
  });

  it("um envelope sem evt_ não é um evento", () => {
    expect(lerEnvelope({ ...evento("checkout.session.completed", sessao()), id: "cs_test_a1b2c3" }).success).toBe(false);
  });

  it("um tipo que não tratamos não se lê, e não é erro", () => {
    const envelope = lerEnvelope(evento("customer.created", { object: "customer" }));
    expect(envelope.success && lerObjeto(envelope.data)).toEqual({ leitura: "nao-tratado" });
  });

  it("os tipos tratados são os oito da tabela do pagamentos.md", () => {
    expect(TIPOS_TRATADOS).toHaveLength(8);
  });
});

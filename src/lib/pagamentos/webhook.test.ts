import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGORA,
  OUTRO_PEDIDO,
  PEDIDO,
  assinar,
  dependencias,
  disputa,
  evento,
  fonteFalsa,
  pedidoDoStripe,
  reembolso,
  sessao,
} from "./teste-stripe";
import type { AcaoPagar } from "./eventos";
import { tratarWebhook } from "./webhook";

/*
 * A rota inteira, sem rede: assinaturas verdadeiras, feitas aqui com o segredo
 * de teste, e a fonte em memória (`pagamentos.md` › Vitest › Webhook (#42)).
 */

let erros: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  erros = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  erros.mockRestore();
});

/** Envia um evento assinado, como o Stripe. */
const enviar = (e: object, deps = dependencias()) => {
  const corpo = JSON.stringify(e);
  return tratarWebhook(pedidoDoStripe(corpo), deps);
};

describe("a assinatura e o corpo", () => {
  const corpo = JSON.stringify(evento("checkout.session.completed", sessao()));

  it("sem assinatura → 400, e a fonte não é chamada", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await tratarWebhook(pedidoDoStripe(corpo, null), dependencias({ fonte }));
    expect(resposta.status).toBe(400);
    expect(fonte.chamadas).toEqual([]);
  });

  it("assinado com outro segredo → 400", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const assinatura = assinar(corpo, { segredo: "whsec_de_outro_endpoint" });
    const resposta = await tratarWebhook(pedidoDoStripe(corpo, assinatura), dependencias({ fonte }));
    expect(resposta.status).toBe(400);
    expect(fonte.chamadas).toEqual([]);
  });

  it("assinado há mais de cinco minutos → 400: uma assinatura velha não se reenvia", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const assinatura = assinar(corpo, { quando: new Date(AGORA.getTime() - 10 * 60_000) });
    const resposta = await tratarWebhook(pedidoDoStripe(corpo, assinatura), dependencias({ fonte }));
    expect(resposta.status).toBe(400);
    expect(fonte.chamadas).toEqual([]);
  });

  it("assinado há quatro minutos ainda passa", async () => {
    const assinatura = assinar(corpo, { quando: new Date(AGORA.getTime() - 4 * 60_000) });
    const resposta = await tratarWebhook(
      pedidoDoStripe(corpo, assinatura),
      dependencias({ fonte: fonteFalsa({ [PEDIDO]: "pendente" }) }),
    );
    expect(resposta.status).toBe(200);
  });

  /* Os dois testes seguintes andam juntos. Este prova que a assinatura é sobre
     os bytes, espaços incluídos — e dá 400 com o corpo lido em bruto **ou**
     refeito com `JSON.parse` + `JSON.stringify`, por isso sozinho não prova a
     leitura em bruto. Quem a prova é o seguinte: o corpo com espaços, enviado
     tal como foi assinado (o Stripe manda-o assim), só passa sem ser refeito.
     Com um corpo já compacto, as duas formas davam os mesmos bytes, e nenhum
     dos dois provava nada. */
  it("um corpo assinado com espaços e enviado compactado → 400: a assinatura é sobre os bytes", async () => {
    const e = evento("checkout.session.completed", sessao());
    const comEspacos = JSON.stringify(e, null, 2);
    const compactado = JSON.stringify(e);
    expect(compactado).not.toBe(comEspacos);
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });

    const resposta = await tratarWebhook(pedidoDoStripe(compactado, assinar(comEspacos)), dependencias({ fonte }));

    expect(resposta.status).toBe(400);
    expect(fonte.chamadas).toEqual([]);
  });

  it("o mesmo corpo com espaços, enviado tal como foi assinado → 200: lê-se o corpo em bruto", async () => {
    const comEspacos = JSON.stringify(evento("checkout.session.completed", sessao()), null, 2);
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await tratarWebhook(pedidoDoStripe(comEspacos), dependencias({ fonte }));
    expect(resposta.status).toBe(200);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pago");
  });

  it("sem o segredo configurado → 500: é erro nosso, e o Stripe volta a tentar", async () => {
    const resposta = await tratarWebhook(pedidoDoStripe(corpo), dependencias({ segredo: undefined }));
    expect(resposta.status).toBe(500);
  });
});

describe("os eventos", () => {
  it("checkout.session.completed com paid → pago", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(evento("checkout.session.completed", sessao()), dependencias({ fonte }));
    expect(resposta.status).toBe(200);
    expect(fonte.pedidos.get(PEDIDO)).toEqual({ estado: "pago", chegouTarde: false });
  });

  it("um evento repetido → 200, uma transição só, e o painel volta a ser avisado", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const avisarPainel = vi.fn();
    const deps = dependencias({ fonte, avisarPainel });
    const e = evento("checkout.session.completed", sessao());

    const primeira = await enviar(e, deps);
    const segunda = await enviar(e, deps);

    expect([primeira.status, segunda.status]).toEqual([200, 200]);
    expect(await segunda.json()).toMatchObject({ resultado: "repetido" });
    expect(fonte.eventos.size).toBe(1);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pago");
    /* Se a invalidação falhou da primeira vez, a retentativa repara-a. */
    expect(avisarPainel).toHaveBeenCalledTimes(2);
  });

  it("completed sem paid → nada, e nem chega à base de dados", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(
      evento("checkout.session.completed", sessao({ payment_status: "unpaid" })),
      dependencias({ fonte }),
    );
    expect(resposta.status).toBe(200);
    expect(fonte.chamadas).toEqual([]);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pendente");
  });

  it("async_payment_failed nunca paga: o pendente expira", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(
      evento("checkout.session.async_payment_failed", sessao({ payment_status: "unpaid" })),
      dependencias({ fonte }),
    );
    expect(resposta.status).toBe(200);
    expect(fonte.chamadas.map((c) => c.metodo)).toEqual(["expirarPendente"]);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("expirado");
  });

  it("async_payment_failed mesmo com paid escrito na sessão → nunca paga", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    await enviar(evento("checkout.session.async_payment_failed", sessao()), dependencias({ fonte }));
    expect(fonte.chamadas.map((c) => c.metodo)).toEqual(["expirarPendente"]);
    expect(fonte.pedidos.get(PEDIDO)?.estado).not.toBe("pago");
  });

  it("async_payment_succeeded → pago", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    await enviar(evento("checkout.session.async_payment_succeeded", sessao()), dependencias({ fonte }));
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pago");
  });

  it("expired depois de completed → continua pago", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const deps = dependencias({ fonte });
    await enviar(evento("checkout.session.completed", sessao()), deps);
    const resposta = await enviar(
      evento("checkout.session.expired", sessao({ payment_status: "unpaid" })),
      deps,
    );
    expect(resposta.status).toBe(200);
    expect(fonte.pedidos.get(PEDIDO)).toEqual({ estado: "pago", chegouTarde: false });
  });

  it("completed depois de expired → pago, marcado chegouTarde", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const deps = dependencias({ fonte });
    await enviar(evento("checkout.session.expired", sessao({ payment_status: "unpaid" })), deps);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("expirado");

    await enviar(evento("checkout.session.completed", sessao()), deps);

    expect(fonte.pedidos.get(PEDIDO)).toEqual({ estado: "pago", chegouTarde: true });
  });

  it("um pedidoId que esta base de dados não conhece → 200 e nada, sem avisar o painel", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const avisarPainel = vi.fn();
    const resposta = await enviar(
      evento("checkout.session.completed", sessao({ metadata: { pedidoId: OUTRO_PEDIDO } })),
      dependencias({ fonte, avisarPainel }),
    );
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ resultado: "pedido-desconhecido" });
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pendente");
    expect(avisarPainel).not.toHaveBeenCalled();
  });

  it("uma sessão sem pedidoId (não é nossa) → 200, sem tocar na base de dados", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(
      evento("checkout.session.completed", sessao({ metadata: {}, client_reference_id: null })),
      dependencias({ fonte }),
    );
    expect(resposta.status).toBe(200);
    expect(fonte.chamadas).toEqual([]);
  });

  describe("livemode trocado → nada, e fica registado", () => {
    it("um evento real numa loja em modo de teste", async () => {
      const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
      const resposta = await enviar(
        evento("checkout.session.completed", sessao(), { livemode: true }),
        dependencias({ fonte, emTeste: true }),
      );
      expect(resposta.status).toBe(200);
      expect(fonte.chamadas).toEqual([]);
      expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pendente");
      expect(erros).toHaveBeenCalledWith(expect.stringContaining("evento real numa loja em modo de teste"));
    });

    it("um evento de teste numa loja aberta ao público", async () => {
      const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
      const resposta = await enviar(
        evento("checkout.session.completed", sessao(), { livemode: false }),
        dependencias({ fonte, emTeste: false }),
      );
      expect(resposta.status).toBe(200);
      expect(fonte.chamadas).toEqual([]);
      expect(erros).toHaveBeenCalledWith(expect.stringContaining("evento de teste numa loja aberta ao público"));
    });

    it("e um evento real numa loja aberta ao público passa", async () => {
      const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
      await enviar(
        evento("checkout.session.completed", sessao(), { livemode: true }),
        dependencias({ fonte, emTeste: false }),
      );
      expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pago");
    });
  });

  it("um tipo que tratamos, mas que o zod não lê → 500, com alerta: nunca 200 a um pagamento por tratar", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const semEstado = Object.fromEntries(Object.entries(sessao()).filter(([campo]) => campo !== "payment_status"));
    const resposta = await enviar(evento("checkout.session.completed", semEstado), dependencias({ fonte }));
    expect(resposta.status).toBe(500);
    expect(fonte.chamadas).toEqual([]);
    expect(erros).toHaveBeenCalledWith(expect.stringContaining("payment_status"));
  });

  it("uma sessão paga sem montante → 500, e não 200", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(
      evento("checkout.session.completed", sessao({ amount_total: null })),
      dependencias({ fonte }),
    );
    expect(resposta.status).toBe(500);
    expect(fonte.pedidos.get(PEDIDO)?.estado).toBe("pendente");
  });

  it("um tipo que não tratamos → 200, e nada", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    const resposta = await enviar(
      evento("customer.created", { object: "customer", id: "cus_test_a1b2c3" }),
      dependencias({ fonte }),
    );
    expect(resposta.status).toBe(200);
    expect(fonte.chamadas).toEqual([]);
  });

  it("um envelope assinado que não se lê → 500", async () => {
    const resposta = await enviar({ id: "evt_test_x", object: "event" });
    expect(resposta.status).toBe(500);
  });

  it("um erro da base de dados → 500: o Stripe volta a tentar", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    fonte.marcarPago = async () => {
      throw Object.assign(new Error("Failed query: insert … params: cliente@exemplo.pt"), { code: "08006" });
    };
    const avisarPainel = vi.fn();
    const resposta = await enviar(evento("checkout.session.completed", sessao()), dependencias({ fonte, avisarPainel }));
    expect(resposta.status).toBe(500);
    expect(avisarPainel).not.toHaveBeenCalled();
    /* O log diz o que falhou, e nunca leva a consulta nem os parâmetros. */
    const escrito = erros.mock.calls.flat().join(" ");
    expect(escrito).toContain("08006");
    expect(escrito).not.toContain("@");
  });

  it("antes de haver base de dados → 503, depois de verificar a assinatura", async () => {
    const corpo = JSON.stringify(evento("checkout.session.completed", sessao()));
    expect((await tratarWebhook(pedidoDoStripe(corpo), dependencias({ fonte: null }))).status).toBe(503);
    expect(
      (await tratarWebhook(pedidoDoStripe(corpo, assinar(corpo, { segredo: "whsec_outro" })), dependencias({ fonte: null })))
        .status,
    ).toBe(400);
  });

  it("um reembolso chega à fonte com o estado já traduzido", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pago" });
    const atualizarReembolso = vi.spyOn(fonte, "atualizarReembolso");
    await enviar(
      evento("refund.failed", reembolso({ status: "failed", failure_reason: "insufficient_funds" })),
      dependencias({ fonte }),
    );
    expect(atualizarReembolso).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "refund.failed", apiVersion: "2026-10-28.endive", recebidoEm: AGORA }),
      expect.objectContaining({ estado: "falhado", estadoStripe: "failed", motivo: "insufficient_funds", pedidoId: PEDIDO }),
    );
  });

  it("uma disputa chega à fonte, sem pedidoId: encontra-se pelo payment_intent", async () => {
    const fonte = fonteFalsa();
    const registarDisputa = vi.spyOn(fonte, "registarDisputa");
    const resposta = await enviar(evento("charge.dispute.created", disputa()), dependencias({ fonte }));
    expect(resposta.status).toBe(200);
    expect(registarDisputa).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentIntentId: "pi_test_a1b2c3", chargeId: "ch_test_a1b2c3", valorCent: 4250 }),
    );
  });
});

/* O «voltar atrás» do #38 encontra a sessão já paga, pergunta-a ao Stripe e
   chama a mesma `marcarPago`, sem evento (`pagamentos.md` › Voltar do Stripe).
   A falsa segue o contrato que a verdadeira vai ter de seguir. */
describe("a marcarPago sem evento: o voltar atrás do #38", () => {
  const pagamento: AcaoPagar = {
    tipo: "pagar",
    pedidoId: PEDIDO,
    referencia: "DAM-0311-4F7K",
    sessaoId: "cs_test_a1b2c3",
    montanteCent: 4250,
    moeda: "eur",
    paymentIntentId: "pi_test_a1b2c3",
    livemode: false,
  };

  it("paga uma vez, sem registar evento nenhum; a segunda chamada é sem-efeito, e não repetido", async () => {
    const fonte = fonteFalsa({ [PEDIDO]: "pendente" });
    expect(await fonte.marcarPago(null, pagamento)).toEqual({ resultado: "mudou", estado: "pago", chegouTarde: false });
    expect(await fonte.marcarPago(null, pagamento)).toEqual({ resultado: "sem-efeito", estado: "pago" });
    expect(fonte.eventos.size).toBe(0);
  });
});

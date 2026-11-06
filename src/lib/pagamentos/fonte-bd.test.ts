import { TZDate } from "@date-fns/tz";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avisosDinheiro, casa, emailsPorEnviar, eventosStripe, pedidos, reembolsos, vagas } from "@/db/esquema";
import { baseComPedidos, idDeTeste as u } from "@/lib/dados/fontes-de-teste";
import type { ContextoPainel, Pedido } from "@/lib/dados/tipos";
import type { AcaoDisputa, AcaoExpirar, AcaoPagar, AcaoReembolso } from "./eventos";
import { criarFonteWebhookBd } from "./fonte-bd";
import { dependencias, disputa, evento, pedidoDoStripe, reembolso, sessao } from "./teste-stripe";
import type { RegistoEvento } from "./tipos";
import { tratarWebhook } from "./webhook";

/**
 * # A `FonteWebhook` sobre a base de dados (#42)
 *
 * O que a fonte em memória do `webhook.test.ts` não prova: as transições na base de
 * dados, os contadores, os avisos e os emails no mesmo instante, e dois avisos do
 * Stripe a chegar ao mesmo tempo. No fim, a rota inteira, com assinaturas verdadeiras.
 */

/* Quarta, 7 de outubro de 2026, às 10h00 de Lisboa. */
const AGORA = new TZDate(2026, 9, 7, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const lisboa = (dia: number, h: number, m = 0) => new TZDate(2026, 9, dia, h, m, "Europe/Lisbon");
const QUINTA = lisboa(8, 15);
const LOJA = "loja@example.com";
const CLIENTE = "cliente@example.com";
const TOTAL = 33500;

const base = (nome: string, alteracoes: Partial<Pedido>): Pedido => ({
  id: u(nome),
  referencia: `DAM-0710-${nome.toUpperCase().padEnd(4, "A").slice(0, 4)}`,
  estado: "pendente",
  criadoEm: lisboa(7, 9),
  levantamentoEm: QUINTA,
  cliente: { nome: "Cliente de Teste", email: CLIENTE, telefone: "+351910000001", nif: null, contaId: null },
  linhas: [
    {
      produtoId: "festa-premium",
      varianteId: "20",
      nome: "Kit Premium",
      variante: "20 pessoas",
      escolhas: [],
      unidade: "un",
      quantidade: 1,
      precoUnitarioCent: TOTAL,
      totalCent: TOTAL,
      notas: null,
    },
  ],
  observacoes: null,
  totalCent: TOTAL,
  modoPagamento: "total",
  pagoOnlineCent: 0,
  reembolsadoCent: 0,
  chegouTarde: false,
  pagoEm: null,
  impressoEm: null,
  entregueEm: null,
  canceladoEm: null,
  canceladoPor: null,
  reembolsos: [],
  avisosTratados: [],
  reagendadoEm: null,
  ...alteracoes,
});

const pendente = (nome = "a") => base(nome, {});
const pago = (nome = "a", alteracoes: Partial<Pedido> = {}) =>
  base(nome, { estado: "pago", pagoEm: lisboa(7, 9, 5), pagoOnlineCent: TOTAL, ...alteracoes });

async function montar(lista: Pedido[], limitePorVaga?: number | null) {
  const { db, fonte } = await baseComPedidos(lista, limitePorVaga === undefined ? {} : { limitePorVaga });
  const webhook = criarFonteWebhookBd(db, { emailDaLoja: LOJA, relogio: () => AGORA });
  const lerPedido = async (nome = "a") => (await db.select().from(pedidos).where(eq(pedidos.id, u(nome))))[0];
  const ocupadas = async (inicio: Date = QUINTA) =>
    (await db.select().from(vagas).where(eq(vagas.inicio, inicio)))[0]?.ocupadas ?? 0;
  const versao = async () => (await db.select({ versao: casa.versaoPedidos }).from(casa))[0].versao;
  return { db, fonte, webhook, lerPedido, ocupadas, versao };
}

let eventos = 0;
const registo = (id = `evt_bd_${++eventos}`): RegistoEvento => ({
  id,
  tipo: "checkout.session.completed",
  apiVersion: "2026-10-28.endive",
  recebidoEm: AGORA,
});

const pagamento = (alteracoes: Partial<AcaoPagar> = {}): AcaoPagar => ({
  tipo: "pagar",
  pedidoId: u("a"),
  referencia: "DAM-0710-AAAA",
  sessaoId: "cs_1",
  montanteCent: TOTAL,
  moeda: "eur",
  paymentIntentId: "pi_1",
  livemode: true,
  ...alteracoes,
});

const expiracao = (alteracoes: Partial<AcaoExpirar> = {}): AcaoExpirar => ({
  tipo: "expirar",
  pedidoId: u("a"),
  referencia: null,
  sessaoId: "cs_1",
  porque: "sessao-expirada",
  ...alteracoes,
});

const acaoReembolso = (alteracoes: Partial<AcaoReembolso> = {}): AcaoReembolso => ({
  tipo: "reembolso",
  stripeRefundId: "re_1",
  pedidoId: null,
  reembolsoId: null,
  paymentIntentId: "pi_1",
  chargeId: "ch_1",
  valorCent: 1000,
  moeda: "eur",
  estadoStripe: "succeeded",
  estado: "concluido",
  motivo: null,
  ...alteracoes,
});

const acaoDisputa = (alteracoes: Partial<AcaoDisputa> = {}): AcaoDisputa => ({
  tipo: "disputa",
  disputaId: "dp_1",
  paymentIntentId: "pi_1",
  chargeId: "ch_1",
  valorCent: TOTAL,
  moeda: "eur",
  motivo: "fraudulent",
  ...alteracoes,
});

describe("marcarPago", () => {
  it("pendente → pago: o que o Stripe cobrou, a sessão e o pagamento ficam no pedido", async () => {
    const { webhook, lerPedido, versao } = await montar([pendente()]);
    const antes = await versao();
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "mudou", estado: "pago", chegouTarde: false });
    expect(await lerPedido()).toMatchObject({
      estado: "pago",
      pagoEm: AGORA,
      pagoOnlineCent: TOTAL,
      chegouTarde: false,
      stripeSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
    });
    expect(await versao()).toBe(antes + 1);
  });

  it("os emails ficam gravados com a transição: um ao cliente e um à loja", async () => {
    const { db, webhook } = await montar([pendente()]);
    await webhook.marcarPago(registo(), pagamento());
    const emails = await db.select().from(emailsPorEnviar);
    expect(emails.map((e) => [e.modelo, e.destinatario, e.enviadoEm]).sort()).toEqual([
      ["pago-cliente", CLIENTE, null],
      ["pago-loja", LOJA, null],
    ]);
  });

  it("o mesmo evento outra vez é repetido: nem dois emails, nem outra versão", async () => {
    const { db, webhook, versao } = await montar([pendente()]);
    const evt = registo();
    await webhook.marcarPago(evt, pagamento());
    const antes = await versao();
    expect(await webhook.marcarPago(evt, pagamento())).toEqual({ resultado: "repetido" });
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
    expect(await db.select().from(eventosStripe)).toHaveLength(1);
    expect(await versao()).toBe(antes);
  });

  it("outro evento da mesma sessão é sem-efeito: a transição só acontece uma vez", async () => {
    const { db, webhook } = await montar([pendente()]);
    await webhook.marcarPago(registo(), pagamento());
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "sem-efeito", estado: "pago" });
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
  });

  it("duas confirmações ao mesmo tempo: uma transição, um par de emails, e a vaga conta uma vez", async () => {
    const { db, webhook, ocupadas } = await montar([base("a", { estado: "expirado" })]);
    const resultados = await Promise.all([
      webhook.marcarPago(registo(), pagamento()),
      webhook.marcarPago(registo(), pagamento()),
    ]);
    expect(resultados.map((r) => r.resultado).sort()).toEqual(["mudou", "sem-efeito"]);
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
    expect(await ocupadas()).toBe(1);
  });

  it("⚠️ sem evento (o voltar atrás do #38): paga, não regista nada, e a segunda é sem-efeito", async () => {
    const { db, webhook } = await montar([pendente()]);
    expect(await webhook.marcarPago(null, pagamento())).toMatchObject({ resultado: "mudou", estado: "pago" });
    expect(await webhook.marcarPago(null, pagamento())).toEqual({ resultado: "sem-efeito", estado: "pago" });
    expect(await db.select().from(eventosStripe)).toHaveLength(0);
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
  });

  it("um pedido que esta base de dados não conhece: desconhecido, e o evento fica registado", async () => {
    const { db, webhook } = await montar([]);
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "pedido-desconhecido" });
    expect(await db.select().from(eventosStripe)).toHaveLength(1);
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(0);
  });

  it.each([
    ["entregue", { estado: "entregue", entregueEm: lisboa(7, 9, 30) }],
    ["cancelado", { estado: "cancelado", canceladoEm: lisboa(7, 9, 30), canceladoPor: "gerente" }],
  ] as const)("um pedido %s não muda", async (estado, alteracoes) => {
    const { db, webhook } = await montar([pago("a", alteracoes)]);
    await db.update(pedidos).set({ stripeSessionId: "cs_1" });
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "sem-efeito", estado });
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(0);
  });
});

describe("pago ganha sempre a expirado", () => {
  it("expirado → pago, marcado chegouTarde, e volta a ocupar a vaga", async () => {
    const { webhook, lerPedido, ocupadas } = await montar([base("a", { estado: "expirado" })]);
    expect(await ocupadas()).toBe(0);
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "mudou", estado: "pago", chegouTarde: true });
    expect(await lerPedido()).toMatchObject({ estado: "pago", chegouTarde: true });
    expect(await ocupadas()).toBe(1);
  });

  it("⚠️ mesmo com a vaga cheia: sobe o limite até caber, e nunca falha", async () => {
    const { db, webhook, ocupadas } = await montar([pago("b"), base("a", { estado: "expirado" })], 1);
    expect((await webhook.marcarPago(registo(), pagamento())).resultado).toBe("mudou");
    expect(await ocupadas()).toBe(2);
    expect((await db.select().from(vagas))[0].limite).toBe(2);
  });

  it("⚠️ numa vaga sem limite, não inventa um", async () => {
    const { db, webhook } = await montar([pago("b"), base("a", { estado: "expirado" })], null);
    await webhook.marcarPago(registo(), pagamento());
    expect((await db.select().from(vagas))[0]).toMatchObject({ ocupadas: 2, limite: null });
  });

  it("um pendente que passa a pago não conta a vaga outra vez", async () => {
    const { webhook, ocupadas } = await montar([pendente()]);
    await webhook.marcarPago(registo(), pagamento());
    expect(await ocupadas()).toBe(1);
  });
});

describe("o pagamento que não bate passa a pago na mesma, e fica um aviso", () => {
  const avisos = async (db: Awaited<ReturnType<typeof montar>>["db"]) => db.select().from(avisosDinheiro);

  it.each([
    ["o montante", { montanteCent: TOTAL - 1 }, ["montante"]],
    ["a moeda", { moeda: "usd" }, ["moeda"]],
    ["o modo", { livemode: false }, ["modo"]],
  ] as const)("%s", async (_nome, alteracoes, campos) => {
    const { db, webhook, lerPedido } = await montar([pendente()]);
    expect(await webhook.marcarPago(registo(), pagamento(alteracoes))).toEqual({ resultado: "nao-bate", campos, estado: "pago" });
    expect(await lerPedido()).toMatchObject({ estado: "pago", pagoOnlineCent: (alteracoes as Partial<AcaoPagar>).montanteCent ?? TOTAL });
    expect(await avisos(db)).toMatchObject([{ tipo: "pagamento-nao-bate", stripeId: "cs_1", detalhe: campos.join(", "), tratadoEm: null }]);
    /* A transição aconteceu: o cliente e a loja são avisados como em qualquer pago. */
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
  });

  it("a sessão que não é a dele", async () => {
    const { db, webhook, lerPedido } = await montar([pendente()]);
    await db.update(pedidos).set({ stripeSessionId: "cs_antiga" });
    expect(await webhook.marcarPago(registo(), pagamento())).toEqual({ resultado: "nao-bate", campos: ["sessao"], estado: "pago" });
    expect((await lerPedido()).stripeSessionId).toBe("cs_antiga");
  });

  it("⚠️ um segundo pagamento num pedido já pago: não muda nada, e alguém tem de o ver", async () => {
    const { db, webhook, lerPedido, versao } = await montar([pendente()]);
    await webhook.marcarPago(registo(), pagamento());
    const antes = await versao();
    expect(await webhook.marcarPago(registo(), pagamento({ sessaoId: "cs_2", paymentIntentId: "pi_2" }))).toEqual({
      resultado: "nao-bate",
      campos: ["sessao"],
      estado: "pago",
    });
    expect(await lerPedido()).toMatchObject({ stripeSessionId: "cs_1", stripePaymentIntentId: "pi_1", pagoOnlineCent: TOTAL });
    expect(await avisos(db)).toMatchObject([{ tipo: "pagamento-nao-bate", stripeId: "cs_2" }]);
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
    expect(await versao()).toBe(antes + 1);
  });

  it("o mesmo pagamento outra vez, sem evento, não duplica o aviso", async () => {
    const { db, webhook } = await montar([pendente()]);
    await webhook.marcarPago(null, pagamento({ montanteCent: 1 }));
    await webhook.marcarPago(null, pagamento({ sessaoId: "cs_2", paymentIntentId: "pi_2" }));
    await webhook.marcarPago(null, pagamento({ sessaoId: "cs_2", paymentIntentId: "pi_2" }));
    expect(await avisos(db)).toHaveLength(2);
  });

  it("em modo sinal, o montante não se confere: o pedido ainda não guarda o valor do sinal", async () => {
    const { webhook } = await montar([base("a", { modoPagamento: "sinal" })]);
    expect((await webhook.marcarPago(registo(), pagamento({ montanteCent: 10000 }))).resultado).toBe("mudou");
  });

  it("o aviso chega à gerente, fica depois do levantamento, e sai quando é tratado", async () => {
    const { db, fonte, webhook } = await montar([pendente()]);
    await webhook.marcarPago(registo(), pagamento({ montanteCent: 1 }));
    await db.update(pedidos).set({ estado: "entregue", entregueEm: AGORA, levantamentoEm: lisboa(1, 10) });
    const depois = { ...GERENTE, agora: lisboa(20, 10) };
    expect(await fonte.precisaDeAtencao(depois)).toEqual({
      ok: true,
      valor: [{ tipo: "pagamento-nao-bate", pedidoId: u("a"), referencia: "DAM-0710-AAAA" }],
    });
    expect((await fonte.tratarAviso(u("a"), "pagamento-nao-bate", depois)).ok).toBe(true);
    expect(await fonte.precisaDeAtencao(depois)).toEqual({ ok: true, valor: [] });
  });
});

describe("expirarPendente", () => {
  it("pendente → expirado, e liberta a vaga", async () => {
    const { webhook, lerPedido, ocupadas } = await montar([pendente()]);
    expect(await webhook.expirarPendente(registo(), expiracao())).toEqual({ resultado: "mudou", estado: "expirado", chegouTarde: false });
    expect((await lerPedido()).estado).toBe("expirado");
    expect(await ocupadas()).toBe(0);
  });

  it("⚠️ um pedido pago nunca volta atrás", async () => {
    const { webhook, ocupadas } = await montar([pago()]);
    expect(await webhook.expirarPendente(registo(), expiracao())).toEqual({ resultado: "sem-efeito", estado: "pago" });
    expect(await ocupadas()).toBe(1);
  });

  it("⚠️ o fim de uma sessão antiga não expira um pedido que tem outra", async () => {
    const { db, webhook, ocupadas } = await montar([pendente()]);
    await db.update(pedidos).set({ stripeSessionId: "cs_nova" });
    expect(await webhook.expirarPendente(registo(), expiracao({ sessaoId: "cs_velha" }))).toEqual({ resultado: "sem-efeito", estado: "pendente" });
    expect(await ocupadas()).toBe(1);
  });

  it("repetido e desconhecido", async () => {
    const { webhook, ocupadas } = await montar([pendente(), pendente("b")]);
    const evt = registo();
    await webhook.expirarPendente(evt, expiracao());
    expect(await webhook.expirarPendente(evt, expiracao({ pedidoId: u("b") }))).toEqual({ resultado: "repetido" });
    expect(await ocupadas()).toBe(1);
    expect(await webhook.expirarPendente(registo(), expiracao({ pedidoId: u("zz") }))).toEqual({ resultado: "pedido-desconhecido" });
  });

  it("expirar e depois pagar conta a vaga certa", async () => {
    const { webhook, ocupadas } = await montar([pendente()]);
    await webhook.expirarPendente(registo(), expiracao());
    await webhook.marcarPago(registo(), pagamento());
    expect(await ocupadas()).toBe(1);
  });
});

describe("atualizarReembolso", () => {
  const NOSSO = "reemb-nosso";
  async function comReembolsoNosso(estado: "pendente" | "concluido" = "pendente") {
    const montada = await montar([pago()]);
    const { fonte, db } = montada;
    await db.update(pedidos).set({ stripePaymentIntentId: "pi_1" });
    expect((await fonte.reembolsarPedido(u("a"), 1000, GERENTE)).ok).toBe(true);
    await db.update(reembolsos).set({ id: NOSSO });
    if (estado === "concluido") await db.update(reembolsos).set({ estado, estadoStripe: "succeeded", stripeRefundId: "re_1" });
    return montada;
  }
  const lerReembolso = async (db: Awaited<ReturnType<typeof montar>>["db"]) => db.select().from(reembolsos);
  const lerReservado = async (db: Awaited<ReturnType<typeof montar>>["db"]) =>
    (await db.select({ r: pedidos.reembolsoReservadoCent }).from(pedidos))[0].r;

  it("pendente → concluído: encontra o nosso pelos metadados, e guarda o id do Stripe", async () => {
    const { db, webhook, fonte } = await comReembolsoNosso();
    expect(await webhook.atualizarReembolso(registo(), acaoReembolso({ reembolsoId: NOSSO }))).toEqual({ resultado: "mudou", estado: "pago", chegouTarde: false });
    expect(await lerReembolso(db)).toMatchObject([{ id: NOSSO, estado: "concluido", estadoStripe: "succeeded", stripeRefundId: "re_1" }]);
    expect(await lerReservado(db)).toBe(1000);
    const lido = await fonte.pedidoDoPainel(u("a"), GERENTE);
    expect(lido.ok && lido.valor.reembolsadoCent).toBe(1000);
  });

  it("⚠️ a resposta do Stripe perdeu-se: é o nosso, e não um externo. Fica uma linha só", async () => {
    const { db, webhook } = await comReembolsoNosso();
    await webhook.atualizarReembolso(registo(), acaoReembolso({ reembolsoId: NOSSO, estado: "pendente", estadoStripe: "pending" }));
    expect(await lerReembolso(db)).toHaveLength(1);
    expect(await lerReservado(db)).toBe(1000);
  });

  it("depois encontra-o pelo id do Stripe", async () => {
    const { db, webhook } = await comReembolsoNosso("concluido");
    expect(await webhook.atualizarReembolso(registo(), acaoReembolso({ estado: "falhado", estadoStripe: "failed", motivo: "insufficient_funds" }))).toMatchObject({ resultado: "mudou" });
    expect(await lerReembolso(db)).toMatchObject([{ estado: "falhado", motivo: "insufficient_funds" }]);
  });

  it("⚠️ falhou depois de concluído: o reservado devolve-o, e aparece o aviso", async () => {
    const { db, fonte, webhook } = await comReembolsoNosso("concluido");
    await webhook.atualizarReembolso(registo(), acaoReembolso({ estado: "falhado", estadoStripe: "failed" }));
    expect(await lerReservado(db)).toBe(0);
    expect(await fonte.precisaDeAtencao(GERENTE)).toMatchObject({ valor: [{ tipo: "reembolso-falhado" }] });
  });

  it("⚠️ só para a frente: um succeeded antigo depois de um failed não faz nada", async () => {
    const { db, webhook, versao } = await comReembolsoNosso("concluido");
    await webhook.atualizarReembolso(registo(), acaoReembolso({ estado: "falhado", estadoStripe: "failed" }));
    const antes = await versao();
    expect(await webhook.atualizarReembolso(registo(), acaoReembolso())).toEqual({ resultado: "sem-efeito", estado: "pago" });
    expect(await lerReembolso(db)).toMatchObject([{ estado: "falhado" }]);
    expect(await lerReservado(db)).toBe(0);
    expect(await versao()).toBe(antes);
  });

  it("um pending antigo depois de um succeeded não volta atrás", async () => {
    const { db, webhook } = await comReembolsoNosso("concluido");
    expect((await webhook.atualizarReembolso(registo(), acaoReembolso({ estado: "pendente", estadoStripe: "pending" }))).resultado).toBe("sem-efeito");
    expect(await lerReembolso(db)).toMatchObject([{ estado: "concluido" }]);
  });

  it("o mesmo evento outra vez é repetido", async () => {
    const { db, webhook } = await comReembolsoNosso("concluido");
    const evt = registo();
    await webhook.atualizarReembolso(evt, acaoReembolso({ estado: "falhado", estadoStripe: "failed" }));
    expect(await webhook.atualizarReembolso(evt, acaoReembolso({ estado: "falhado", estadoStripe: "failed" }))).toEqual({ resultado: "repetido" });
    expect(await lerReservado(db)).toBe(0);
  });

  describe("um reembolso feito no painel do Stripe", () => {
    async function comPagamento() {
      const montada = await montar([pago()]);
      await montada.db.update(pedidos).set({ stripePaymentIntentId: "pi_1" });
      return montada;
    }

    it("entra no pedido, encontrado pelo pagamento, e reserva o que devolveu", async () => {
      const { db, webhook, fonte } = await comPagamento();
      expect((await webhook.atualizarReembolso(registo(), acaoReembolso())).resultado).toBe("mudou");
      expect(await lerReembolso(db)).toMatchObject([{ pedidoId: u("a"), valorCent: 1000, estado: "concluido", stripeRefundId: "re_1" }]);
      expect(await lerReservado(db)).toBe(1000);
      const lido = await fonte.pedidoDoPainel(u("a"), GERENTE);
      expect(lido.ok && lido.valor.reembolsadoCent).toBe(1000);
    });

    it("um que já nasce falhado não reserva nada", async () => {
      const { db, webhook } = await comPagamento();
      await webhook.atualizarReembolso(registo(), acaoReembolso({ estado: "falhado", estadoStripe: "failed" }));
      expect(await lerReservado(db)).toBe(0);
    });

    it("⚠️ se não couber, o nosso ainda por pedir cede, e a gerente vê-o como falhado", async () => {
      const { db, fonte, webhook } = await comPagamento();
      await fonte.reembolsarPedido(u("a"), TOTAL, GERENTE);
      expect((await webhook.atualizarReembolso(registo(), acaoReembolso({ valorCent: TOTAL }))).resultado).toBe("mudou");
      const lista = await lerReembolso(db);
      expect(lista.find((r) => r.stripeRefundId === null)).toMatchObject({ estado: "falhado", motivo: "cedeu-a-reembolso-externo" });
      expect(lista.find((r) => r.stripeRefundId === "re_1")).toMatchObject({ estado: "concluido", valorCent: TOTAL });
      expect(await lerReservado(db)).toBe(TOTAL);
    });

    it("⚠️ se couber, o nosso não cede", async () => {
      const { db, fonte, webhook } = await comPagamento();
      await fonte.reembolsarPedido(u("a"), 1000, GERENTE);
      await webhook.atualizarReembolso(registo(), acaoReembolso({ valorCent: 1000 }));
      expect((await lerReembolso(db)).map((r) => r.estado).sort()).toEqual(["concluido", "pendente"]);
      expect(await lerReservado(db)).toBe(2000);
    });

    it("⚠️ se mesmo assim não couber, é uma inconsistência: rebenta, para o webhook responder 5xx", async () => {
      const { db, webhook } = await comPagamento();
      await expect(webhook.atualizarReembolso(registo(), acaoReembolso({ valorCent: TOTAL + 1 }))).rejects.toThrow();
      expect(await lerReembolso(db)).toHaveLength(0);
    });

    it("de um pagamento que não é nosso: desconhecido", async () => {
      const { webhook } = await comPagamento();
      expect(await webhook.atualizarReembolso(registo(), acaoReembolso({ paymentIntentId: "pi_outro" }))).toEqual({ resultado: "pedido-desconhecido" });
    });
  });
});

describe("registarDisputa", () => {
  async function comPagamento() {
    const montada = await montar([pago()]);
    await montada.db.update(pedidos).set({ stripePaymentIntentId: "pi_1" });
    return montada;
  }

  it("encontra o pedido pelo pagamento, e o aviso fica à espera da gerente", async () => {
    const { db, fonte, webhook, versao } = await comPagamento();
    const antes = await versao();
    expect(await webhook.registarDisputa(registo(), acaoDisputa())).toEqual({ resultado: "mudou", estado: "pago", chegouTarde: false });
    expect(await db.select().from(avisosDinheiro)).toMatchObject([{ tipo: "disputa", stripeId: "dp_1", detalhe: "fraudulent" }]);
    expect(await fonte.precisaDeAtencao(GERENTE)).toEqual({
      ok: true,
      valor: [{ tipo: "disputa", pedidoId: u("a"), referencia: "DAM-0710-AAAA" }],
    });
    expect(await versao()).toBe(antes + 1);
  });

  it("⚠️ continua lá depois do levantamento, até ser tratada", async () => {
    const { db, fonte, webhook } = await comPagamento();
    await webhook.registarDisputa(registo(), acaoDisputa());
    await db.update(pedidos).set({ estado: "entregue", entregueEm: AGORA, levantamentoEm: lisboa(1, 10) });
    const depois = { ...GERENTE, agora: lisboa(25, 10) };
    expect(await fonte.precisaDeAtencao(depois)).toMatchObject({ valor: [{ tipo: "disputa" }] });
    await fonte.tratarAviso(u("a"), "disputa", depois);
    expect(await fonte.precisaDeAtencao(depois)).toEqual({ ok: true, valor: [] });
    const [aviso] = await db.select().from(avisosDinheiro).where(and(eq(avisosDinheiro.tipo, "disputa")));
    expect(aviso.tratadoEm).not.toBeNull();
  });

  it("⚠️ uma segunda disputa volta a avisar: a primeira, tratada, não a esconde", async () => {
    const { fonte, webhook } = await comPagamento();
    await webhook.registarDisputa(registo(), acaoDisputa());
    await fonte.tratarAviso(u("a"), "disputa", GERENTE);
    await webhook.registarDisputa(registo(), acaoDisputa({ disputaId: "dp_2" }));
    expect(await fonte.precisaDeAtencao(GERENTE)).toMatchObject({ valor: [{ tipo: "disputa" }] });
  });

  it("duas disputas por tratar mostram um aviso só", async () => {
    const { fonte, webhook } = await comPagamento();
    await webhook.registarDisputa(registo(), acaoDisputa());
    await webhook.registarDisputa(registo(), acaoDisputa({ disputaId: "dp_2" }));
    const atencao = await fonte.precisaDeAtencao(GERENTE);
    expect(atencao.ok && atencao.valor).toHaveLength(1);
  });

  it("repetida e desconhecida", async () => {
    const { db, webhook } = await comPagamento();
    const evt = registo();
    await webhook.registarDisputa(evt, acaoDisputa());
    expect(await webhook.registarDisputa(evt, acaoDisputa())).toEqual({ resultado: "repetido" });
    expect(await webhook.registarDisputa(registo(), acaoDisputa({ disputaId: "dp_3", paymentIntentId: "pi_outro" }))).toEqual({ resultado: "pedido-desconhecido" });
    expect(await webhook.registarDisputa(registo(), acaoDisputa({ disputaId: "dp_4", paymentIntentId: null }))).toEqual({ resultado: "pedido-desconhecido" });
    expect(await db.select().from(avisosDinheiro)).toHaveLength(1);
  });
});

describe("a rota inteira, com assinaturas verdadeiras", () => {
  let erros: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    erros = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    erros.mockRestore();
  });

  /* Os pedidos daqui nascem verdadeiros (`deTeste: false`), por isso a loja está
     aberta ao público e os eventos são reais. */
  const REAL = { livemode: true };
  const META = {
    metadata: { pedidoId: u("a"), referencia: "DAM-0710-AAAA" },
    client_reference_id: "DAM-0710-AAAA",
    amount_total: TOTAL,
    ...REAL,
  };

  async function enviar(webhook: ReturnType<typeof criarFonteWebhookBd>, objeto: object) {
    const corpo = JSON.stringify(objeto);
    const resposta = await tratarWebhook(pedidoDoStripe(corpo), dependencias({ fonte: webhook, emTeste: false }));
    return { status: resposta.status, corpo: await resposta.json() };
  }

  it("um pagamento: 200, o pedido pago e o evento repetido a não fazer nada", async () => {
    const { db, webhook, lerPedido } = await montar([pendente()]);
    const concluido = evento("checkout.session.completed", sessao(META), REAL);
    expect(await enviar(webhook, concluido)).toMatchObject({ status: 200, corpo: { resultado: "mudou" } });
    expect(await lerPedido()).toMatchObject({ estado: "pago", pagoOnlineCent: TOTAL, stripePaymentIntentId: "pi_test_a1b2c3" });
    expect(await enviar(webhook, concluido)).toMatchObject({ status: 200, corpo: { resultado: "repetido" } });
    expect(await db.select().from(emailsPorEnviar)).toHaveLength(2);
  });

  it("um reembolso e uma disputa do painel do Stripe chegam ao pedido pelo pagamento", async () => {
    const { db, webhook } = await montar([pendente()]);
    await enviar(webhook, evento("checkout.session.completed", sessao(META), REAL));
    const semMetadados = { metadata: {} };
    expect(await enviar(webhook, evento("refund.created", reembolso(semMetadados), REAL))).toMatchObject({ corpo: { resultado: "mudou" } });
    expect(await enviar(webhook, evento("charge.dispute.created", disputa(), REAL))).toMatchObject({ corpo: { resultado: "mudou" } });
    expect(await db.select().from(reembolsos)).toHaveLength(1);
    expect(await db.select().from(avisosDinheiro)).toHaveLength(1);
  });

  it("um erro da base de dados dá 500, e o log não traz a mensagem, que tem os parâmetros", async () => {
    const { db, webhook } = await montar([pendente()]);
    await enviar(webhook, evento("checkout.session.completed", sessao(META), REAL));
    const grande = { metadata: {}, amount: TOTAL + 1 };
    const { status } = await enviar(webhook, evento("refund.created", reembolso(grande), REAL));
    expect(status).toBe(500);
    expect(await db.select().from(reembolsos)).toHaveLength(0);
    const escrito = erros.mock.calls.flat().map(String).join(" ");
    expect(escrito).toContain("pedidos_reembolso_reservado");
    expect(escrito).not.toContain(CLIENTE);
    expect(escrito).not.toContain("params");
  });
});

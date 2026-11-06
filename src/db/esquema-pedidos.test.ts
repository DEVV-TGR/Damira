import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  avisosDinheiro,
  emailsPorEnviar,
  eventosStripe,
  linhasPedido,
  pedidos,
  produtos,
  quantidadesDia,
  quantidadesTotal,
  reembolsos,
  vagas,
} from "./esquema";
import { baseDeTeste, recusado } from "./teste";

/**
 * # As regras dos pedidos que a base de dados faz cumprir
 *
 * O mesmo que o `esquema.test.ts`, para as tabelas dos pedidos (migrações
 * `0002` e `0003`): o que é válido entra, e cada regra recusa o que é para
 * recusar — confirmada pelo nome, para se saber que foi ela e não outra coisa.
 *
 * As transições (`pendente → pago`…) não se provam aqui: vivem nos `UPDATE` da
 * fonte, e provam-se com ela (#29, #41, #42). Aqui fica o que tem de ser verdade
 * em qualquer estado.
 */

const { db, cliente } = await baseDeTeste();

afterAll(() => cliente.close());
beforeEach(() => cliente.exec("begin"));
afterEach(() => cliente.exec("rollback"));

/**
 * O `recusado` de `./teste`, dentro de um *savepoint*: uma escrita recusada
 * aborta a transação inteira, e sem isto a segunda tentativa do mesmo teste
 * falhava por causa da primeira, e não pela regra que se queria provar.
 */
async function recusa(escrita: Promise<unknown>) {
  await cliente.exec("savepoint tentativa");
  try {
    return await recusado(escrita);
  } finally {
    await cliente.exec("rollback to savepoint tentativa");
  }
}

// ——— O que se grava ———

const NATA = {
  id: "nata",
  posicao: 1,
  origem: "ementa",
  familia: "ementa",
  nomePt: "Pastel de nata",
  carta: "casa",
  categoria: "doces",
  unidade: "un",
  quantidadeMinima: 6,
  multiplo: 6,
  aVendaOnline: true,
  apareceNaEmenta: true,
} satisfies typeof produtos.$inferInsert;

const CRIADO = new Date("2026-11-03T10:00:00Z");
const PAGO = new Date("2026-11-03T10:05:00Z");

/** Um pedido acabado de criar, à espera do Stripe. */
const PENDENTE = {
  id: "6f1c1f5e-8c1b-4d5a-9a43-1d2f3c4b5a60",
  referencia: "DAM-0311-4F7K",
  estado: "pendente",
  criadoEm: CRIADO,
  levantamentoEm: new Date("2026-11-07T15:00:00Z"),
  clienteNome: "Cliente de Teste",
  clienteEmail: "cliente@example.com",
  clienteTelefone: "+351911222333",
  totalCent: 1260,
  modoPagamento: "total",
  chaveIdempotencia: "2b7e1516-28ae-4d2a-8f15-0a1b2c3d4e5f",
  procura: "cliente de teste dam-0311-4f7k",
  deTeste: false,
} satisfies typeof pedidos.$inferInsert;

/** O mesmo pedido, depois de o Stripe o confirmar. */
const PAGO_ONLINE = { ...PENDENTE, estado: "pago", pagoEm: PAGO, pagoOnlineCent: 1260 } as const;

const LINHA = {
  pedidoId: PENDENTE.id,
  posicao: 0,
  produtoId: "nata",
  varianteId: "unica",
  nome: "Pastel de nata",
  unidade: "un",
  quantidade: 12,
  precoUnitarioCent: 105,
  totalCent: 1260,
} satisfies typeof linhasPedido.$inferInsert;

const REEMBOLSO = {
  id: "reemb-1",
  pedidoId: PENDENTE.id,
  valorCent: 500,
  estado: "pendente",
  pedidoEm: new Date("2026-11-04T09:00:00Z"),
} satisfies typeof reembolsos.$inferInsert;

/** Insere o produto e um pedido; devolve o pedido inserido. */
async function comPedido(pedido: typeof pedidos.$inferInsert = PENDENTE) {
  await db.insert(produtos).values(NATA);
  await db.insert(pedidos).values(pedido);
  return pedido;
}

// ——— O que entra ———

describe("o que é válido entra", () => {
  it("um pedido pendente, com as linhas", async () => {
    await comPedido();
    await db.insert(linhasPedido).values([LINHA, { ...LINHA, posicao: 1, quantidade: 6, totalCent: 630 }]);

    const [guardado] = await db.select().from(pedidos);
    expect(guardado).toMatchObject({
      estado: "pendente",
      pagoOnlineCent: 0,
      chegouTarde: false,
      avisosTratados: [],
      reembolsoReservadoCent: 0,
      deTeste: false,
    });
    expect(await db.select().from(linhasPedido)).toHaveLength(2);
  });

  it("meio quilo numa linha ao quilo", async () => {
    await comPedido();
    await db.insert(linhasPedido).values({ ...LINHA, unidade: "kg", quantidade: 0.5, totalCent: 850 });
    const [linha] = await db.select().from(linhasPedido);
    expect(linha.quantidade).toBe(0.5);
  });

  it("cada estado, com as datas que ele pede", async () => {
    await db.insert(produtos).values(NATA);
    const outro = (n: number) => ({
      id: `6f1c1f5e-8c1b-4d5a-9a43-1d2f3c4b5a6${n}`,
      referencia: `DAM-0311-AAA${n + 2}`,
      chaveIdempotencia: `2b7e1516-28ae-4d2a-8f15-0a1b2c3d4e5${n}`,
    });
    await db.insert(pedidos).values([
      { ...PENDENTE, ...outro(1) },
      { ...PENDENTE, ...outro(2), estado: "expirado" },
      { ...PAGO_ONLINE, ...outro(3) },
      { ...PAGO_ONLINE, ...outro(4), estado: "entregue", entregueEm: PAGO },
      { ...PAGO_ONLINE, ...outro(5), estado: "cancelado", canceladoEm: PAGO, canceladoPor: "gerente" },
      /* Pago depois de expirar: chegou tarde, mas está pago. */
      { ...PAGO_ONLINE, ...outro(6), chegouTarde: true },
    ]);
    expect(await db.select().from(pedidos)).toHaveLength(6);
  });

  it("um reembolso com o estado do Stripe, de cada um dos cinco", async () => {
    await comPedido(PAGO_ONLINE);
    await db.insert(reembolsos).values([
      { ...REEMBOLSO, id: "r1", estadoStripe: "pending" },
      { ...REEMBOLSO, id: "r2", estadoStripe: "requires_action" },
      { ...REEMBOLSO, id: "r3", estado: "concluido", estadoStripe: "succeeded" },
      { ...REEMBOLSO, id: "r4", estado: "falhado", estadoStripe: "failed", motivo: "insufficient_funds" },
      { ...REEMBOLSO, id: "r5", estado: "falhado", estadoStripe: "canceled" },
      /* Dado por falhado por nós, sem o Stripe dizer nada. */
      { ...REEMBOLSO, id: "r6", estado: "falhado", motivo: "cedeu-a-reembolso-externo" },
      /* A gerente já viu a falha. */
      { ...REEMBOLSO, id: "r7", estado: "falhado", estadoStripe: "failed", falhaTratadaEm: PAGO },
    ]);
    expect(await db.select().from(reembolsos)).toHaveLength(7);
  });

  it("um email por enviar, e depois enviado", async () => {
    await comPedido(PAGO_ONLINE);
    const [email] = await db
      .insert(emailsPorEnviar)
      .values({ pedidoId: PENDENTE.id, modelo: "pago-cliente", destinatario: "cliente@example.com", criadoEm: PAGO })
      .returning();
    expect(email.tentativas).toBe(0);
    await db
      .update(emailsPorEnviar)
      .set({ tentativas: 1, enviadoEm: new Date(PAGO.getTime() + 1000) })
      .where(eq(emailsPorEnviar.id, email.id));
  });

  it("um evento do Stripe, com e sem a versão da API", async () => {
    await db.insert(eventosStripe).values([
      { id: "evt_1", tipo: "checkout.session.completed", apiVersion: "2026-10-28.acacia", recebidoEm: PAGO },
      { id: "evt_2", tipo: "refund.updated", recebidoEm: PAGO },
    ]);
    expect(await db.select().from(eventosStripe)).toHaveLength(2);
  });
});

// ——— Os pedidos ———

describe("um pedido recusa", () => {
  beforeEach(() => db.insert(produtos).values(NATA));

  const tenta = (mudanca: Partial<typeof pedidos.$inferInsert>) =>
    recusa(db.insert(pedidos).values({ ...PENDENTE, ...mudanca }));

  it("um estado que o contrato não tem", async () => {
    expect(await tenta({ estado: "reembolsado" })).toBe("pedidos_estado");
  });

  it("uma referência fora do formato, ou com letras que se confundem ao telefone", async () => {
    expect(await tenta({ referencia: "DAM-311-4F7K" })).toBe("pedidos_referencia");
    expect(await tenta({ referencia: "DAM-0311-4F0K" })).toBe("pedidos_referencia");
    expect(await tenta({ referencia: "DAM-0311-4FIK" })).toBe("pedidos_referencia");
  });

  it("um telefone que não está em E.164", async () => {
    expect(await tenta({ clienteTelefone: "911222333" })).toBe("pedidos_telefone");
    expect(await tenta({ clienteTelefone: "+0911222333" })).toBe("pedidos_telefone");
  });

  it("um NIF que não tem nove algarismos", async () => {
    expect(await tenta({ clienteNif: "12345678" })).toBe("pedidos_nif");
  });

  it("um modo de pagamento que não existe", async () => {
    expect(await tenta({ modoPagamento: "fiado" })).toBe("pedidos_modo_pagamento");
  });

  it("valores negativos", async () => {
    expect(await tenta({ totalCent: -1 })).toBe("pedidos_valores");
  });

  it("um pago sem data de pagamento, ou um pendente com ela", async () => {
    expect(await tenta({ estado: "pago", pagoOnlineCent: 1260 })).toBe("pedidos_pago_em");
    expect(await tenta({ pagoEm: PAGO })).toBe("pedidos_pago_em");
    expect(await tenta({ estado: "expirado", pagoEm: PAGO })).toBe("pedidos_pago_em");
  });

  it("um entregue sem data de entrega", async () => {
    expect(await tenta({ ...PAGO_ONLINE, estado: "entregue" })).toBe("pedidos_entregue_em");
  });

  it("um cancelado sem dizer quando ou por quem, e o contrário", async () => {
    expect(await tenta({ ...PAGO_ONLINE, estado: "cancelado", canceladoPor: "gerente" })).toBe("pedidos_cancelado");
    expect(await tenta({ ...PAGO_ONLINE, estado: "cancelado", canceladoEm: PAGO })).toBe("pedidos_cancelado");
    expect(await tenta({ ...PAGO_ONLINE, canceladoEm: PAGO, canceladoPor: "gerente" })).toBe("pedidos_cancelado");
    expect(
      await tenta({ ...PAGO_ONLINE, estado: "cancelado", canceladoEm: PAGO, canceladoPor: "balcao" }),
    ).toBe("pedidos_cancelado_por");
  });

  it("um chegou tarde que nunca foi pago", async () => {
    expect(await tenta({ estado: "expirado", chegouTarde: true })).toBe("pedidos_chegou_tarde");
  });

  it("um aviso tratado que o contrato não tem", async () => {
    expect(await tenta({ avisosTratados: ["chegou-tarde", "inventado"] })).toBe("pedidos_avisos_tratados");
  });

  it("reservar para reembolso mais do que se pagou online", async () => {
    expect(await tenta({ ...PAGO_ONLINE, reembolsoReservadoCent: 1261 })).toBe("pedidos_reembolso_reservado");
  });

  it("a mesma referência, a mesma chave de idempotência, ou a mesma sessão ou pagamento do Stripe", async () => {
    await db.insert(pedidos).values({ ...PENDENTE, stripeSessionId: "cs_test_1", stripePaymentIntentId: "pi_test_1" });
    const outro = {
      id: "6f1c1f5e-8c1b-4d5a-9a43-1d2f3c4b5a69",
      referencia: "DAM-0311-ZZZ9",
      chaveIdempotencia: "2b7e1516-28ae-4d2a-8f15-0a1b2c3d4e59",
    };
    expect(await tenta({ ...outro, referencia: PENDENTE.referencia })).toBe("pedidos_referencia_unique");
    expect(await tenta({ ...outro, chaveIdempotencia: PENDENTE.chaveIdempotencia })).toBe(
      "pedidos_chave_idempotencia_unique",
    );
    expect(await tenta({ ...outro, stripeSessionId: "cs_test_1" })).toBe("pedidos_stripe_session_id_unique");
    expect(await tenta({ ...outro, stripePaymentIntentId: "pi_test_1" })).toBe(
      "pedidos_stripe_payment_intent_id_unique",
    );
  });

  it("nascer sem dizer se é de teste", async () => {
    const semDizer: Partial<typeof PENDENTE> = { ...PENDENTE };
    delete semDizer.deTeste;
    expect(await recusa(db.insert(pedidos).values(semDizer as typeof PENDENTE))).toMatch(/de_teste/);
  });
});

describe("o de_teste de um pedido", () => {
  it("não muda depois de ele nascer, em nenhum sentido", async () => {
    await comPedido({ ...PENDENTE, deTeste: true });
    expect(await recusa(db.update(pedidos).set({ deTeste: false }))).toBe("pedidos_de_teste_imutavel");

    await cliente.exec("rollback; begin");
    await comPedido();
    expect(await recusa(db.update(pedidos).set({ deTeste: true }))).toBe("pedidos_de_teste_imutavel");
  });

  it("não impede o resto do pedido de mudar, nem de o gravar com o mesmo valor", async () => {
    await comPedido({ ...PENDENTE, deTeste: true });
    await db.update(pedidos).set({ estado: "expirado" });
    await db.update(pedidos).set({ deTeste: true, observacoes: "sem mudar" });
    const [pedido] = await db.select().from(pedidos);
    expect(pedido).toMatchObject({ estado: "expirado", deTeste: true });
  });
});

describe("um pedido nunca se apaga", () => {
  it("com linhas, a chave estrangeira recusa-o", async () => {
    await comPedido(PAGO_ONLINE);
    await db.insert(linhasPedido).values(LINHA);
    expect(await recusa(db.delete(pedidos))).toBe("linhas_pedido_pedido_id_pedidos_id_fk");
  });

  it("e uma linha não aponta para um produto que não existe", async () => {
    await comPedido();
    expect(await recusa(db.insert(linhasPedido).values({ ...LINHA, produtoId: "inventado" }))).toBe(
      "linhas_pedido_produto_id_produtos_id_fk",
    );
  });
});

// ——— As linhas ———

describe("uma linha recusa", () => {
  beforeEach(() => comPedido());

  const tenta = (mudanca: Partial<typeof linhasPedido.$inferInsert>) =>
    recusa(db.insert(linhasPedido).values({ ...LINHA, ...mudanca }));

  it("quantidade zero ou negativa", async () => {
    expect(await tenta({ quantidade: 0 })).toBe("linhas_pedido_quantidade");
  });

  it("preços negativos", async () => {
    expect(await tenta({ precoUnitarioCent: -1 })).toBe("linhas_pedido_precos");
  });

  it("uma unidade que não existe", async () => {
    expect(await tenta({ unidade: "duzia" })).toBe("linhas_pedido_unidade");
  });

  it("duas linhas na mesma posição", async () => {
    await db.insert(linhasPedido).values(LINHA);
    expect(await tenta({})).toBe("linhas_pedido_pedido_id_posicao_pk");
  });
});

// ——— Os reembolsos ———

describe("um reembolso recusa", () => {
  beforeEach(() => comPedido(PAGO_ONLINE));

  const tenta = (mudanca: Partial<typeof reembolsos.$inferInsert>) =>
    recusa(db.insert(reembolsos).values({ ...REEMBOLSO, ...mudanca }));

  it("um valor zero", async () => {
    expect(await tenta({ valorCent: 0 })).toBe("reembolsos_valor");
  });

  it("um estado que o contrato não tem", async () => {
    expect(await tenta({ estado: "devolvido" })).toBe("reembolsos_estado");
  });

  it("um estado do Stripe que não cai no nosso, segundo o pedidos.md", async () => {
    expect(await tenta({ estado: "falhado", estadoStripe: "succeeded" })).toBe("reembolsos_estado_stripe");
    expect(await tenta({ estado: "concluido", estadoStripe: "pending" })).toBe("reembolsos_estado_stripe");
    expect(await tenta({ estado: "pendente", estadoStripe: "failed" })).toBe("reembolsos_estado_stripe");
    expect(await tenta({ estadoStripe: "inventado" })).toBe("reembolsos_estado_stripe");
  });

  it("dar por tratada a falha de um reembolso que não falhou", async () => {
    expect(await tenta({ estado: "concluido", falhaTratadaEm: PAGO })).toBe("reembolsos_falha_tratada");
  });

  it("o mesmo reembolso do Stripe duas vezes", async () => {
    await db.insert(reembolsos).values({ ...REEMBOLSO, stripeRefundId: "re_1" });
    expect(await tenta({ id: "reemb-2", stripeRefundId: "re_1" })).toBe("reembolsos_stripe_refund_id_unique");
  });

  it("e mudar um concluído para falhado mantém o mapeamento (o `concluido → falhado` do #100)", async () => {
    await db.insert(reembolsos).values({ ...REEMBOLSO, estado: "concluido", estadoStripe: "succeeded" });
    await db.update(reembolsos).set({ estado: "falhado", estadoStripe: "failed", motivo: "expired_or_canceled_card" });
    expect(
      await recusa(db.update(reembolsos).set({ estado: "concluido" })),
    ).toBe("reembolsos_estado_stripe");
  });
});

// ——— Os emails e os eventos ———

describe("os emails por enviar e os eventos do Stripe recusam", () => {
  it("um email sem modelo ou sem destinatário", async () => {
    await comPedido(PAGO_ONLINE);
    const email = { pedidoId: PENDENTE.id, modelo: "pago-cliente", destinatario: "cliente@example.com", criadoEm: PAGO };
    expect(await recusa(db.insert(emailsPorEnviar).values({ ...email, modelo: "" }))).toBe(
      "emails_por_enviar_modelo",
    );
    expect(await recusa(db.insert(emailsPorEnviar).values({ ...email, destinatario: "" }))).toBe(
      "emails_por_enviar_modelo",
    );
    expect(
      await recusa(db.insert(emailsPorEnviar).values({ ...email, enviadoEm: new Date(PAGO.getTime() - 1) })),
    ).toBe("emails_por_enviar_datas");
  });

  it("um email de um pedido que não existe", async () => {
    expect(
      await recusa(
        db.insert(emailsPorEnviar).values({
          pedidoId: PENDENTE.id,
          modelo: "pago-cliente",
          destinatario: "cliente@example.com",
          criadoEm: PAGO,
        }),
      ),
    ).toBe("emails_por_enviar_pedido_id_pedidos_id_fk");
  });

  it("um evento repetido — é só esta violação que quer dizer «repetido»", async () => {
    const evento = { id: "evt_1", tipo: "checkout.session.completed", recebidoEm: PAGO };
    await db.insert(eventosStripe).values(evento);
    expect(await recusa(db.insert(eventosStripe).values(evento))).toBe("eventos_stripe_pkey");
  });

  it("um id que não é de um evento", async () => {
    expect(
      await recusa(db.insert(eventosStripe).values({ id: "cs_test_1", tipo: "x", recebidoEm: PAGO })),
    ).toBe("eventos_stripe_id");
  });
});

// ——— Os contadores ———

describe("um aviso de dinheiro", () => {
  const AVISO = { tipo: "disputa", stripeId: "dp_1", criadoEm: new Date("2026-11-03T10:00:00Z") };
  const inserir = async (mudanca: Partial<typeof avisosDinheiro.$inferInsert> = {}) =>
    db.insert(avisosDinheiro).values({ ...AVISO, pedidoId: PENDENTE.id, ...mudanca });

  beforeEach(async () => {
    await db.insert(pedidos).values(PENDENTE);
  });

  it("entra, sem estar tratado", async () => {
    await inserir({ detalhe: "fraudulent" });
    const [aviso] = await db.select().from(avisosDinheiro);
    expect(aviso).toMatchObject({ tipo: "disputa", detalhe: "fraudulent", tratadoEm: null });
  });

  it("os três tipos do contrato entram, e outro não", async () => {
    await inserir({ tipo: "apanhado-pela-verificacao", stripeId: "cs_1" });
    await inserir({ tipo: "pagamento-nao-bate", stripeId: "cs_1" });
    expect(await recusa(inserir({ tipo: "inventado", stripeId: "x" }))).toBe("avisos_dinheiro_tipo");
  });

  it("⚠️ o mesmo facto não entra duas vezes, e um segundo facto do mesmo tipo entra", async () => {
    await inserir();
    expect(await recusa(inserir())).toBe("avisos_dinheiro_facto");
    await inserir({ stripeId: "dp_2" });
    expect(await db.select().from(avisosDinheiro)).toHaveLength(2);
  });

  it("recusa um pedido que não existe, um id vazio e um tratado antes de existir", async () => {
    expect(await recusa(inserir({ pedidoId: "6f1c1f5e-8c1b-4d5a-9a43-1d2f3c4b5a69" }))).toBe(
      "avisos_dinheiro_pedido_id_pedidos_id_fk",
    );
    expect(await recusa(inserir({ stripeId: "" }))).toBe("avisos_dinheiro_stripe_id");
    expect(await recusa(inserir({ tratadoEm: new Date("2026-11-03T09:00:00Z") }))).toBe("avisos_dinheiro_tratado");
  });
});

describe("a última vaga decide-a a base de dados", () => {
  const INICIO = new Date("2026-11-07T15:00:00Z");

  /** Como o `criarPedido` vai reservar: somar, sem ler antes, com o limite de agora. */
  const reservar = (n: number, limite: number | null) =>
    db
      .insert(vagas)
      .values({ inicio: INICIO, ocupadas: n, limite })
      .onConflictDoUpdate({
        target: vagas.inicio,
        set: { ocupadas: sql`${vagas.ocupadas} + ${n}`, limite },
      });

  it("enche até ao limite, e a seguinte é recusada", async () => {
    await reservar(1, 2);
    await reservar(1, 2);
    expect(await recusa(reservar(1, 2))).toBe("vagas_no_limite");
    const [vaga] = await db.select().from(vagas);
    expect(vaga.ocupadas).toBe(2);
  });

  it("sem limite, não enche", async () => {
    for (let i = 0; i < 5; i++) await reservar(1, null);
    const [vaga] = await db.select().from(vagas);
    expect(vaga.ocupadas).toBe(5);
  });

  it("descontar abaixo de zero é recusado", async () => {
    await reservar(1, 2);
    expect(await recusa(db.update(vagas).set({ ocupadas: sql`${vagas.ocupadas} - 2` }))).toBe("vagas_ocupadas");
  });

  /** Como o `marcarPago` vai voltar a ocupar: sobe o limite até caber, se houver limite. */
  const limiteDeQuemVoltaAOcupar = (n: number) =>
    sql`case when ${vagas.limite} is null then null else greatest(${vagas.limite}, ${vagas.ocupadas} + ${n}) end`;

  it("pago depois de expirar sobe o limite até caber, e nunca falha", async () => {
    await reservar(2, 2);
    await db
      .update(vagas)
      .set({ ocupadas: sql`${vagas.ocupadas} + 1`, limite: limiteDeQuemVoltaAOcupar(1) })
      .where(eq(vagas.inicio, INICIO));
    const [vaga] = await db.select().from(vagas);
    expect(vaga).toMatchObject({ ocupadas: 3, limite: 3 });
  });

  /* ⚠️ O `GREATEST` ignora os `NULL`: `GREATEST(NULL, 3)` dá 3. Sem o `CASE`, uma
     vaga sem limite ficava cheia às 3, e um reagendar para lá era recusado com a
     gerente sem limite nenhum ligado. */
  it("pago depois de expirar não inventa um limite onde não havia", async () => {
    await reservar(2, null);
    await db
      .update(vagas)
      .set({ ocupadas: sql`${vagas.ocupadas} + 1`, limite: limiteDeQuemVoltaAOcupar(1) })
      .where(eq(vagas.inicio, INICIO));
    const [vaga] = await db.select().from(vagas);
    expect(vaga).toMatchObject({ ocupadas: 3, limite: null });
  });

  it("as quantidades por dia e totais, ao quilo também", async () => {
    await db.insert(produtos).values(NATA);
    await db.insert(quantidadesDia).values({ produtoId: "nata", dia: "2026-11-07", ocupadas: 1.5, limite: 2 });
    expect(
      await recusa(db.update(quantidadesDia).set({ ocupadas: sql`${quantidadesDia.ocupadas} + 1` })),
    ).toBe("quantidades_dia_no_limite");

    await db.insert(quantidadesTotal).values({ produtoId: "nata", ocupadas: 10, limite: 10 });
    expect(
      await recusa(db.update(quantidadesTotal).set({ ocupadas: sql`${quantidadesTotal.ocupadas} + 0.5` })),
    ).toBe("quantidades_total_no_limite");
    expect(
      await recusa(db.insert(quantidadesTotal).values({ produtoId: "inventado", ocupadas: 1 })),
    ).toBe("quantidades_total_produto_id_produtos_id_fk");
  });
});

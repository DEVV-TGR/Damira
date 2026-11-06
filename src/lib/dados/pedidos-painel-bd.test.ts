import { TZDate } from "@date-fns/tz";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { casa, pedidos, reembolsos, vagas } from "@/db/esquema";
import { porDevolverCent } from "@/lib/painel";
import { criarPedidosDoPainelBd } from "./bd-painel-pedidos";
import { baseComPedidos, idDeTeste as u, type CasaDeTeste } from "./fontes-de-teste";
import type { ContextoPainel, Pedido } from "./tipos";

/**
 * # O que só a base de dados garante, nos pedidos do painel (#31)
 *
 * O contrato está no `pedidos-painel.test.ts`, que corre contra as duas fontes.
 * Aqui fica o que a fonte dos JSON não tem como provar: os contadores certos
 * depois de cada mudança, duas ações ao mesmo tempo, e a decisão ser da base de
 * dados mesmo quando a leitura de antes estava desatualizada.
 */

/* Quarta, 7 de outubro de 2026, às 10h00 de Lisboa. */
const AGORA = new TZDate(2026, 9, 7, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const BALCAO: ContextoPainel = { papel: "funcionario", agora: AGORA };
const lisboa = (dia: number, h: number, m = 0) => new TZDate(2026, 9, dia, h, m, "Europe/Lisbon");
const QUINTA = lisboa(8, 15);
const SEXTA = lisboa(9, 11);

const pedido = (nome: string, alteracoes: Partial<Pedido> = {}): Pedido => ({
  id: u(nome),
  referencia: `DAM-0710-${nome.toUpperCase().padEnd(4, "A").slice(0, 4)}`,
  estado: "pago",
  criadoEm: lisboa(6, 9),
  levantamentoEm: QUINTA,
  cliente: { nome: "Cliente de Teste", email: "teste@example.com", telefone: "+351910000001", nif: null, contaId: null },
  linhas: [
    {
      produtoId: "festa-premium",
      varianteId: "20",
      nome: "Kit Premium",
      variante: "20 pessoas",
      escolhas: [],
      unidade: "un",
      quantidade: 1,
      precoUnitarioCent: 33500,
      totalCent: 33500,
      notas: null,
    },
  ],
  observacoes: null,
  totalCent: 33500,
  modoPagamento: "total",
  pagoOnlineCent: 33500,
  reembolsadoCent: 0,
  chegouTarde: false,
  pagoEm: lisboa(6, 9, 5),
  impressoEm: null,
  entregueEm: null,
  canceladoEm: null,
  canceladoPor: null,
  reembolsos: [],
  avisosTratados: [],
  reagendadoEm: null,
  ...alteracoes,
});

async function montar(lista: Pedido[], casaDeTeste?: CasaDeTeste) {
  const { db, fonte } = await baseComPedidos(lista, casaDeTeste);
  const ocupadas = async (inicio: Date) =>
    (await db.select().from(vagas).where(eq(vagas.inicio, inicio)))[0]?.ocupadas ?? 0;
  const versao = async () => (await db.select({ versao: casa.versaoPedidos }).from(casa))[0].versao;
  return { db, fonte, ocupadas, versao };
}

describe("duas ações ao mesmo tempo", () => {
  it("dois tablets a entregar entregam uma vez, e a versão sobe uma vez", async () => {
    const { fonte, versao } = await montar([pedido("a")]);
    const antes = await versao();
    const [um, outro] = await Promise.all([
      fonte.marcarEntregue(u("a"), false, BALCAO),
      fonte.marcarEntregue(u("a"), false, { ...BALCAO, agora: lisboa(7, 10, 1) }),
    ]);
    expect(um.ok && outro.ok).toBe(true);
    expect(await versao()).toBe(antes + 1);
  });

  it("dois a cancelar libertam a vaga uma vez", async () => {
    const { fonte, ocupadas } = await montar([pedido("a"), pedido("b")]);
    const [um, outro] = await Promise.all([
      fonte.cancelarPedido(u("a"), 0, GERENTE),
      fonte.cancelarPedido(u("a"), 0, GERENTE),
    ]);
    expect([um.ok, outro.ok].sort()).toEqual([false, true]);
    expect(await ocupadas(QUINTA)).toBe(1);
  });

  it("dois reembolsos que juntos passam o pago: o segundo não existe", async () => {
    const { fonte, db } = await montar([pedido("a")]);
    const resultados = await Promise.all([
      fonte.reembolsarPedido(u("a"), 20000, GERENTE),
      fonte.reembolsarPedido(u("a"), 20000, GERENTE),
    ]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.select().from(reembolsos)).toHaveLength(1);
    const [{ reservado }] = await db.select({ reservado: pedidos.reembolsoReservadoCent }).from(pedidos);
    expect(reservado).toBe(20000);
  });
});

describe("a decisão é da base de dados, mesmo com a leitura desatualizada", () => {
  it("o teto do reembolso: quem passa do pago bate no CHECK, e responde o mesmo", async () => {
    const { fonte, db } = await montar([pedido("a")]);
    /* O reservado já vai quase no fim, e a lista de reembolsos ainda não o diz. */
    await db.update(pedidos).set({ reembolsoReservadoCent: 33000 });
    expect(await fonte.reembolsarPedido(u("a"), 1000, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["valorCent"],
    });
    expect(await fonte.cancelarPedido(u("a"), 1000, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["reembolsoCent"],
    });
    expect(await db.select().from(reembolsos)).toHaveLength(0);
  });

  it("a última vaga ao reagendar: o CHECK recusa, e nada se mexe", async () => {
    const { db, fonte, ocupadas } = await montar(
      [pedido("a"), pedido("b", { levantamentoEm: SEXTA })],
      { limitePorVaga: 1 },
    );
    const desatualizada = criarPedidosDoPainelBd(db, {
      configuracao: fonte.configuracaoDoPainel,
      ocupacao: async () => [],
    });
    expect(await desatualizada.reagendarPedido(u("a"), SEXTA.toISOString(), GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["levantamentoEm"],
    });
    expect(await ocupadas(QUINTA)).toBe(1);
    expect(await ocupadas(SEXTA)).toBe(1);
    const [lido] = await db.select().from(pedidos).where(eq(pedidos.id, u("a")));
    expect(lido.levantamentoEm).toEqual(QUINTA);
    expect(lido.reagendadoEm).toBeNull();
  });

  it("outro aparelho moveu o pedido a meio: estado-mudou, e não desconta a vaga errada", async () => {
    const { db, fonte, ocupadas } = await montar([pedido("a"), pedido("b")]);
    const SABADO = lisboa(10, 11);
    const aMeio = criarPedidosDoPainelBd(db, {
      configuracao: async (ctx) => {
        await fonte.reagendarPedido(u("a"), SABADO.toISOString(), ctx);
        return fonte.configuracaoDoPainel(ctx);
      },
      ocupacao: fonte.ocupacao,
    });
    expect(await aMeio.reagendarPedido(u("a"), SEXTA.toISOString(), GERENTE)).toEqual({ ok: false, erro: "estado-mudou" });
    expect(await ocupadas(QUINTA)).toBe(1);
    expect(await ocupadas(SABADO)).toBe(1);
    expect(await ocupadas(SEXTA)).toBe(0);
  });
});

describe("os contadores", () => {
  it("reagendar liberta a vaga antiga e ocupa a nova, numa mudança só", async () => {
    const { fonte, ocupadas, versao } = await montar([pedido("a")]);
    const antes = await versao();
    expect((await fonte.reagendarPedido(u("a"), SEXTA.toISOString(), GERENTE)).ok).toBe(true);
    expect(await ocupadas(QUINTA)).toBe(0);
    expect(await ocupadas(SEXTA)).toBe(1);
    expect(await versao()).toBe(antes + 1);
  });

  it("reagendar para a mesma hora não mexe na vaga, mesmo com ela cheia", async () => {
    const { fonte, ocupadas } = await montar([pedido("a")], { limitePorVaga: 1 });
    const resultado = await fonte.reagendarPedido(u("a"), QUINTA.toISOString(), GERENTE);
    expect(resultado.ok && resultado.valor.reagendadoEm).toEqual(AGORA);
    expect(await ocupadas(QUINTA)).toBe(1);
  });

  it("baixar o limite e depois cancelar nunca falha: descontar não mexe no limite", async () => {
    const { db, fonte, ocupadas } = await montar([pedido("a"), pedido("b")], { limitePorVaga: 2 });
    await db.update(casa).set({ limitePorVaga: 1 });
    expect((await fonte.cancelarPedido(u("a"), 0, GERENTE)).ok).toBe(true);
    expect(await ocupadas(QUINTA)).toBe(1);
  });

  it("os 5 minutos do balcão incluem o último instante", async () => {
    const { fonte } = await montar([pedido("a", { estado: "entregue", entregueEm: AGORA })]);
    expect((await fonte.desfazerEntregue(u("a"), { ...BALCAO, agora: lisboa(7, 10, 5) })).ok).toBe(true);
  });

  it("entregar e desfazer não mexem na vaga", async () => {
    const { fonte, ocupadas } = await montar([pedido("a")]);
    await fonte.marcarEntregue(u("a"), false, BALCAO);
    expect(await ocupadas(QUINTA)).toBe(1);
    await fonte.desfazerEntregue(u("a"), BALCAO);
    expect(await ocupadas(QUINTA)).toBe(1);
  });
});

describe("o reembolso", () => {
  it("nasce pendente: o estado vem do webhook, e o reembolsado só soma os concluídos", async () => {
    const { db, fonte, ocupadas } = await montar([pedido("a")]);
    const resultado = await fonte.cancelarPedido(u("a"), 10000, GERENTE);
    if (!resultado.ok) throw new Error("devia cancelar");
    expect(resultado.valor).toMatchObject({
      estado: "cancelado",
      reembolsadoCent: 0,
      reembolsos: [expect.objectContaining({ valorCent: 10000, estado: "pendente", pedidoEm: AGORA })],
    });
    expect(porDevolverCent(resultado.valor)).toBe(23500);
    expect(await ocupadas(QUINTA)).toBe(0);
    /* O contador bate com a soma dos pendentes e concluídos (`base-de-dados.md`). */
    const [{ reservado }] = await db.select({ reservado: pedidos.reembolsoReservadoCent }).from(pedidos);
    expect(reservado).toBe(10000);
  });

  it("cancelar sem reembolso não cria reembolso nenhum", async () => {
    const { db, fonte } = await montar([pedido("a")]);
    await fonte.cancelarPedido(u("a"), 0, GERENTE);
    expect(await db.select().from(reembolsos)).toHaveLength(0);
  });

  it("um pendente ou um expirado não se reembolsa", async () => {
    const { fonte } = await montar([
      pedido("a", { estado: "pendente", pagoEm: null, pagoOnlineCent: 0, chegouTarde: false }),
    ]);
    expect(await fonte.reembolsarPedido(u("a"), 1, GERENTE)).toEqual({ ok: false, erro: "estado-mudou" });
  });
});

describe("o aviso de reembolso falhado trata-se por reembolso", () => {
  const falhado = (id: string) => ({ id, valorCent: 1000, estado: "falhado" as const, pedidoEm: lisboa(6, 12) });
  const entregue = { estado: "entregue" as const, entregueEm: lisboa(6, 20) };

  it("aparece mesmo depois do levantamento, e sai quando é tratado", async () => {
    const { fonte, versao } = await montar([pedido("a", { ...entregue, levantamentoEm: lisboa(6, 15), reembolsos: [falhado("r1")] })]);
    expect(await fonte.precisaDeAtencao(GERENTE)).toMatchObject({ valor: [{ tipo: "reembolso-falhado", pedidoId: u("a") }] });
    const antes = await versao();
    const tratado = await fonte.tratarAviso(u("a"), "reembolso-falhado", GERENTE);
    expect(tratado.ok && tratado.valor.avisosTratados).toEqual(["reembolso-falhado"]);
    expect(await fonte.precisaDeAtencao(GERENTE)).toEqual({ ok: true, valor: [] });
    expect(await versao()).toBe(antes + 1);
  });

  it("⚠️ um segundo reembolso falhado volta a avisar: o primeiro, tratado, não o esconde", async () => {
    const { db, fonte } = await montar([pedido("a", { ...entregue, reembolsos: [falhado("r1")] })]);
    await fonte.tratarAviso(u("a"), "reembolso-falhado", GERENTE);
    await db.insert(reembolsos).values({ ...falhado("r2"), pedidoId: u("a") });
    expect(await fonte.precisaDeAtencao(GERENTE)).toMatchObject({ valor: [{ tipo: "reembolso-falhado" }] });
    const lido = await fonte.pedidoDoPainel(u("a"), GERENTE);
    expect(lido.ok && lido.valor.avisosTratados).toEqual([]);
  });

  it("tratar duas vezes o mesmo aviso não sobe a versão nem o repete", async () => {
    const { fonte, versao } = await montar([pedido("a", { chegouTarde: true })]);
    await fonte.tratarAviso(u("a"), "chegou-tarde", GERENTE);
    const antes = await versao();
    const segunda = await fonte.tratarAviso(u("a"), "chegou-tarde", GERENTE);
    expect(segunda.ok && segunda.valor.avisosTratados).toEqual(["chegou-tarde"]);
    expect(await versao()).toBe(antes);
  });
});

describe("listar", () => {
  it("o cursor não salta nem repete pedidos à mesma hora, mesmo com um novo a entrar", async () => {
    const { db, fonte } = await montar(["a", "b", "c", "d"].map((nome) => pedido(nome)));
    const vistos: string[] = [];
    let cursor: string | null = null;
    do {
      const pagina: Awaited<ReturnType<typeof fonte.listarPedidos>> = await fonte.listarPedidos({ limite: 1, cursor }, BALCAO);
      if (!pagina.ok) throw new Error("devia listar");
      vistos.push(...pagina.valor.pedidos.map((p) => p.id));
      cursor = pagina.valor.seguinte;
      /* Um pedido que entra a meio, antes do que já se viu, não desloca as páginas. */
      if (vistos.length === 2) {
        await db.execute(sql`update pedidos set levantamento_em = ${lisboa(7, 15).toISOString()}::timestamptz where id = ${u("d")}::uuid`);
      }
    } while (cursor !== null);
    expect(vistos).toEqual([u("a"), u("b"), u("c")]);
  });

  it("o arquivo pagina do último para trás, com empates pelo id", async () => {
    const { fonte } = await montar([pedido("a"), pedido("b"), pedido("c", { criadoEm: lisboa(6, 12) })]);
    const primeira = await fonte.listarPedidos({ ordem: "recentes", limite: 2 }, GERENTE);
    if (!primeira.ok) throw new Error("devia listar");
    expect(primeira.valor.pedidos.map((p) => p.id)).toEqual([u("c"), u("a")]);
    const segunda = await fonte.listarPedidos({ ordem: "recentes", limite: 2, cursor: primeira.valor.seguinte }, GERENTE);
    expect(segunda.ok && segunda.valor.pedidos.map((p) => p.id)).toEqual([u("b")]);
    expect(segunda.ok && segunda.valor.seguinte).toBeNull();
  });

  it("um % ou um _ na procura são texto, e não coringas", async () => {
    const { fonte } = await montar([pedido("a")]);
    for (const texto of ["%%", "__", "c_iente"]) {
      const resultado = await fonte.listarPedidos({ texto }, BALCAO);
      expect(resultado.ok && resultado.valor.pedidos).toEqual([]);
    }
    const certo = await fonte.listarPedidos({ texto: "cliente de" }, BALCAO);
    expect(certo.ok && certo.valor.pedidos).toHaveLength(1);
  });

  it("não faz uma consulta por pedido: as linhas e os reembolsos vêm em lote", async () => {
    const { db, fonte } = await montar(["a", "b", "c", "d", "e", "f"].map((nome) => pedido(nome)));
    const consultas = vi.spyOn(db, "select");
    await fonte.listarPedidos({}, BALCAO);
    expect(consultas).toHaveBeenCalledTimes(3);
  });
});

describe("um id que não é um uuid vem de um browser a inventar", () => {
  it("diz que não existe, em todas, sem rebentar na coluna", async () => {
    const { fonte } = await montar([pedido("a")]);
    const inventado = "1; drop table pedidos";
    for (const tentativa of [
      fonte.pedidoDoPainel(inventado, GERENTE),
      fonte.marcarEntregue(inventado, false, GERENTE),
      fonte.desfazerEntregue(inventado, GERENTE),
      fonte.tratarAviso(inventado, "chegou-tarde", GERENTE),
      fonte.reagendarPedido(inventado, SEXTA.toISOString(), GERENTE),
      fonte.cancelarPedido(inventado, 0, GERENTE),
      fonte.reembolsarPedido(inventado, 1, GERENTE),
    ]) {
      expect(await tentativa).toEqual({ ok: false, erro: "nao-existe" });
    }
  });

  it("um uuid que não está na base de dados também", async () => {
    const { fonte } = await montar([]);
    expect(await fonte.marcarEntregue(u("zz"), false, GERENTE)).toEqual({ ok: false, erro: "nao-existe" });
    expect(await fonte.desfazerEntregue(u("zz"), GERENTE)).toEqual({ ok: false, erro: "nao-existe" });
  });
});

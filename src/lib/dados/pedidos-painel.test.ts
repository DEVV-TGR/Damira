import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { CONFIGURACAO_JSON, criarFonteJson } from "./json";
import { protegerPainel } from "./papeis";
import type { ContextoPainel, FonteDeDados, Papel, Pedido } from "./tipos";

/*
 * Os pedidos no painel, vistos como o `index.ts` os expõe. São a especificação
 * da implementação sobre a base de dados (#31): devem passar contra ela.
 */

/* Quarta, 7 de outubro de 2026, às 10h00 de Lisboa. */
const AGORA = new TZDate(2026, 9, 7, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const BALCAO: ContextoPainel = { papel: "funcionario", agora: AGORA };
const lisboa = (dia: number, h: number, m = 0) => new TZDate(2026, 9, dia, h, m, "Europe/Lisbon");

const pedido = (id: string, alteracoes: Partial<Pedido> = {}): Pedido => ({
  id,
  referencia: `DAM-0710-${id.toUpperCase().padEnd(4, "A").slice(0, 4)}`,
  estado: "pago",
  criadoEm: lisboa(6, 9),
  levantamentoEm: lisboa(8, 15),
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

const fonte = (pedidos: Pedido[]): FonteDeDados => {
  const base = criarFonteJson({ pedidos });
  return { ...base, ...protegerPainel(base) };
};

const ids = (resultado: Awaited<ReturnType<FonteDeDados["listarPedidos"]>>) =>
  resultado.ok ? resultado.valor.pedidos.map((p) => p.id) : resultado;

describe("quem vê os pedidos", () => {
  it("só a gerente vê o «precisa de atenção»", async () => {
    const f = fonte([pedido("a", { chegouTarde: true })]);
    expect(await f.precisaDeAtencao(BALCAO)).toEqual({ ok: false, erro: "sem-permissao" });
    expect(await f.precisaDeAtencao(GERENTE)).toEqual({
      ok: true,
      valor: [{ tipo: "chegou-tarde", pedidoId: "a", referencia: "DAM-0710-AAAA" }],
    });
  });

  it("um papel que não existe não lê pedidos — têm nomes e telefones", async () => {
    const f = fonte([pedido("a")]);
    const intruso = { papel: "cliente" as Papel, agora: AGORA };
    expect(await f.listarPedidos({}, intruso)).toEqual({ ok: false, erro: "sem-permissao" });
    expect(await f.pedidoDoPainel("a", intruso)).toEqual({ ok: false, erro: "sem-permissao" });
  });
});

describe("listar e procurar", () => {
  const varios = () =>
    fonte([
      pedido("c", { levantamentoEm: lisboa(9, 10), criadoEm: lisboa(6, 8) }),
      pedido("a", { levantamentoEm: lisboa(7, 15), criadoEm: lisboa(6, 10) }),
      pedido("b", { levantamentoEm: lisboa(8, 11), criadoEm: lisboa(6, 12), estado: "entregue" }),
      pedido("d", { levantamentoEm: lisboa(20, 11), estado: "cancelado" }),
    ]);

  it("filtra por estado e por dia de levantamento, o mais cedo primeiro", async () => {
    const f = varios();
    expect(ids(await f.listarPedidos({ estados: ["pago"] }, BALCAO))).toEqual(["a", "c"]);
    expect(ids(await f.listarPedidos({ levantamentoDesde: lisboa(8, 0), levantamentoAte: lisboa(9, 23) }, BALCAO))).toEqual(
      ["b", "c"],
    );
  });

  it("o arquivo lê-se do último criado para trás", async () => {
    const f = varios();
    expect(ids(await f.listarPedidos({ estados: ["entregue", "cancelado", "pago"], ordem: "recentes", limite: 3 }, GERENTE))).toEqual(
      /* «d» foi criado às 9h00 do dia 6, entre o «a» (10h00) e o «c» (8h00). */
      ["b", "a", "d"],
    );
  });

  it("pagina com um cursor que o browser devolve sem o ler", async () => {
    const f = varios();
    const primeira = await f.listarPedidos({ limite: 3 }, GERENTE);
    if (!primeira.ok) throw new Error("devia listar");
    expect(primeira.valor.pedidos).toHaveLength(3);
    expect(primeira.valor.seguinte).not.toBeNull();
    const segunda = await f.listarPedidos({ limite: 3, cursor: primeira.valor.seguinte }, GERENTE);
    expect(segunda.ok && segunda.valor).toMatchObject({ seguinte: null });
    expect(ids(segunda)).toEqual(["d"]);
  });

  it("um cursor inventado ou uma procura de uma letra são recusados", async () => {
    const f = varios();
    expect(await f.listarPedidos({ cursor: "abc" }, BALCAO)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["cursor"],
    });
    expect(await f.listarPedidos({ texto: "a" }, BALCAO)).toMatchObject({ ok: false, campos: ["texto"] });
  });

  it("procura pela referência ou pelo nome, sem maiúsculas nem acentos", async () => {
    const f = fonte([
      pedido("marc", { cliente: { ...pedido("x").cliente, nome: "Márcia Sousa" } }),
      pedido("4f7k", { referencia: "DAM-0710-4F7K" }),
    ]);
    expect(ids(await f.listarPedidos({ texto: "marcia" }, BALCAO))).toEqual(["marc"]);
    expect(ids(await f.listarPedidos({ texto: "4f7k" }, BALCAO))).toEqual(["4f7k"]);
  });

  it("um pedido que não existe diz que não existe", async () => {
    expect(await fonte([]).pedidoDoPainel("nao-existe", BALCAO)).toEqual({ ok: false, erro: "nao-existe" });
  });
});

describe("entregar", () => {
  it("um entregue continua a ocupar a vaga: o «desfazer» nunca esbarra no limite", async () => {
    const f = fonte([pedido("a")]);
    await f.marcarEntregue("a", false, BALCAO);
    expect(await f.ocupacao(lisboa(8, 15), lisboa(8, 15))).toEqual([{ inicio: lisboa(8, 15), pedidos: 1 }]);
  });

  it("passa a entregue com a hora, e um segundo toque não faz nada de novo", async () => {
    const f = fonte([pedido("a")]);
    const primeiro = await f.marcarEntregue("a", false, BALCAO);
    expect(primeiro.ok && primeiro.valor).toMatchObject({ estado: "entregue", entregueEm: AGORA });
    const depois = { ...BALCAO, agora: lisboa(7, 10, 1) };
    const segundo = await f.marcarEntregue("a", false, depois);
    expect(segundo.ok && segundo.valor.entregueEm).toEqual(AGORA);
  });

  it("um pedido cancelado não se entrega", async () => {
    const f = fonte([pedido("a", { estado: "cancelado", canceladoEm: lisboa(6, 20), canceladoPor: "gerente" })]);
    expect(await f.marcarEntregue("a", false, BALCAO)).toEqual({ ok: false, erro: "estado-mudou" });
  });

  it("com dinheiro em falta, só depois de confirmar que se cobrou", async () => {
    const comSinal = pedido("a", { modoPagamento: "sinal", pagoOnlineCent: 10050 });
    const f = fonte([comSinal]);
    expect(await f.marcarEntregue("a", false, BALCAO)).toEqual({ ok: false, erro: "falta-cobrar" });
    expect((await f.marcarEntregue("a", true, BALCAO)).ok).toBe(true);
  });
});

describe("desfazer o entregue", () => {
  const entregue = () => pedido("a", { estado: "entregue", entregueEm: AGORA });

  it("o balcão desfaz nos 5 minutos, e o pedido volta a pago", async () => {
    const f = fonte([entregue()]);
    const resultado = await f.desfazerEntregue("a", { ...BALCAO, agora: lisboa(7, 10, 4) });
    expect(resultado.ok && resultado.valor).toMatchObject({ estado: "pago", entregueEm: null });
  });

  it("depois dos 5 minutos, o balcão já não; a gerente sim, a qualquer hora", async () => {
    const f = fonte([entregue()]);
    expect(await f.desfazerEntregue("a", { ...BALCAO, agora: lisboa(7, 10, 6) })).toEqual({
      ok: false,
      erro: "fora-do-prazo",
    });
    expect((await f.desfazerEntregue("a", { ...GERENTE, agora: lisboa(8, 18) })).ok).toBe(true);
  });

  it("não se desfaz o que não foi entregue", async () => {
    expect(await fonte([pedido("a")]).desfazerEntregue("a", GERENTE)).toEqual({ ok: false, erro: "estado-mudou" });
  });
});

describe("a versão do polling", () => {
  it("muda quando um pedido muda, e não pede papel", async () => {
    const f = fonte([pedido("a")]);
    const antes = await f.versaoPedidos();
    await f.marcarEntregue("a", false, BALCAO);
    const depoisDeEntregar = await f.versaoPedidos();
    expect(depoisDeEntregar).not.toBe(antes);
    await f.desfazerEntregue("a", BALCAO);
    expect(await f.versaoPedidos()).not.toBe(depoisDeEntregar);
  });

  it("um toque que não muda nada não muda a versão", async () => {
    const f = fonte([pedido("a", { estado: "cancelado" })]);
    const antes = await f.versaoPedidos();
    await f.marcarEntregue("a", false, BALCAO);
    expect(await f.versaoPedidos()).toBe(antes);
  });
});

describe("as decisões da gerente", () => {
  it("só a gerente decide: o balcão não cancela, não reembolsa, não muda datas nem trata avisos", async () => {
    const f = fonte([pedido("a", { chegouTarde: true })]);
    for (const tentativa of [
      await f.cancelarPedido("a", 0, BALCAO),
      await f.reembolsarPedido("a", 100, BALCAO),
      await f.reagendarPedido("a", lisboa(9, 10).toISOString(), BALCAO),
      await f.tratarAviso("a", "chegou-tarde", BALCAO),
    ]) {
      expect(tentativa).toEqual({ ok: false, erro: "sem-permissao" });
    }
  });

  it("aceitar um pago que chegou tarde tira-o da atenção, e o facto fica", async () => {
    const f = fonte([pedido("a", { chegouTarde: true })]);
    const tratado = await f.tratarAviso("a", "chegou-tarde", GERENTE);
    expect(tratado.ok && tratado.valor).toMatchObject({ chegouTarde: true, avisosTratados: ["chegou-tarde"] });
    expect(await f.precisaDeAtencao(GERENTE)).toEqual({ ok: true, valor: [] });
  });

  it("cancelar com reembolso total: cancelado, reembolsado e a vaga livre", async () => {
    const f = fonte([pedido("a")]);
    const resultado = await f.cancelarPedido("a", 33500, GERENTE);
    expect(resultado.ok && resultado.valor).toMatchObject({
      estado: "cancelado",
      canceladoPor: "gerente",
      reembolsadoCent: 33500,
      reembolsos: [expect.objectContaining({ valorCent: 33500, estado: "concluido" })],
    });
    expect(await f.ocupacao(lisboa(8, 15), lisboa(8, 15))).toEqual([]);
  });

  it("cancelar sem reembolso, e nunca reembolsar mais do que foi pago", async () => {
    const f = fonte([pedido("a"), pedido("b")]);
    expect((await f.cancelarPedido("a", 0, GERENTE)).ok).toBe(true);
    expect(await f.cancelarPedido("b", 33501, GERENTE)).toEqual({ ok: false, erro: "dados-invalidos", campos: ["reembolsoCent"] });
    expect(await f.cancelarPedido("b", 10.5, GERENTE)).toMatchObject({ ok: false });
  });

  it("um reembolso parcial sem cancelar, e o que sobra para devolver diminui", async () => {
    const f = fonte([pedido("a", { estado: "entregue", entregueEm: AGORA })]);
    expect((await f.reembolsarPedido("a", 3500, GERENTE)).ok).toBe(true);
    const segundo = await f.reembolsarPedido("a", 30000, GERENTE);
    expect(segundo.ok && segundo.valor.reembolsadoCent).toBe(33500);
    expect(await f.reembolsarPedido("a", 1, GERENTE)).toMatchObject({ ok: false, campos: ["valorCent"] });
  });

  it("cancelar um pedido que já não está pago diz que mudou", async () => {
    const f = fonte([pedido("a", { estado: "entregue", entregueEm: AGORA })]);
    expect(await f.cancelarPedido("a", 0, GERENTE)).toEqual({ ok: false, erro: "estado-mudou" });
  });

  it("mudar o levantamento para uma hora da loja, no futuro", async () => {
    const f = fonte([pedido("a")]);
    const resultado = await f.reagendarPedido("a", lisboa(9, 11).toISOString(), GERENTE);
    expect(resultado.ok && resultado.valor).toMatchObject({ levantamentoEm: lisboa(9, 11), reagendadoEm: AGORA });
  });

  it("não se muda para uma hora fechada, para o passado, nem para uma vaga cheia", async () => {
    const f = fonte([pedido("a"), pedido("b", { levantamentoEm: lisboa(9, 11) })]);
    expect((await f.reagendarPedido("a", lisboa(9, 23).toISOString(), GERENTE)).ok).toBe(false);
    expect((await f.reagendarPedido("a", lisboa(6, 11).toISOString(), GERENTE)).ok).toBe(false);
    expect((await f.reagendarPedido("a", "amanhã", GERENTE)).ok).toBe(false);
    const comLimite = criarFonteJson({
      pedidos: [pedido("a"), pedido("b", { levantamentoEm: lisboa(9, 11) })],
      configuracao: { ...CONFIGURACAO_JSON, limitePorVaga: 1 },
    });
    const g = { ...comLimite, ...protegerPainel(comLimite) };
    expect(await g.reagendarPedido("a", lisboa(9, 11).toISOString(), GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["levantamentoEm"],
    });
  });
});


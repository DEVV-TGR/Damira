import { TZDate } from "@date-fns/tz";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { casa, pedidos, vagas } from "@/db/esquema";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { montarFonteBd, type OpcoesDaFonteBd } from "./bd";
import { expirarPedido, type LeituraDoPedido } from "./bd-pedidos";
import { comExemplo, fonteDoAmbiente } from "./exemplo";
import { PRAZO_DO_PEDIDO_MS } from "./regras";
import type { VagaOcupada } from "@/lib/horarios";
import { FORMATO_REFERENCIA, type EntradaPedido } from "./tipos";

/**
 * # Os pedidos da loja na base de dados (#29, #41)
 *
 * O mesmo cenário dos testes do `criarPedido` dos JSON (`dados.test.ts` › criar o
 * pedido) — a mesma segunda-feira, o mesmo kit, o mesmo total —, contra um
 * PGlite com o catálogo importado. E o que só a base de dados garante: a última
 * vaga com uma leitura desatualizada, os limites por IP e por email, a limpeza
 * aos 31 minutos e o `de_teste`.
 *
 * Os produtos importados não têm tempos de produção (a casa ainda não os deu):
 * como no site, quem os dá é o modo de teste (`comExemplo`).
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

/* Segunda, 5 de outubro de 2026, às 10h00 de Lisboa. O Kit Premium de exemplo
   leva 2 dias de cozinha: o primeiro levantamento é quarta às 7h30. */
const AGORA = new TZDate(2026, 9, 5, 10, 0, "Europe/Lisbon");
const QUARTA_7H30 = new TZDate(2026, 9, 7, 7, 30, "Europe/Lisbon");
const QUINTA_7H30 = new TZDate(2026, 9, 8, 7, 30, "Europe/Lisbon");
const CONTEXTO = { agora: AGORA, ip: "203.0.113.1", contaId: null };
const EM_TESTE = { LOJA_EM_TESTE: "1" };

let chaves = 0;
/* Uma chave de idempotência nova a cada chamada: cada uma é um pedido novo. */
const novaChave = () => `4f1b2c3d-1111-4222-8333-${String(++chaves).padStart(12, "0")}`;

const entrada = (alteracoes: Partial<EntradaPedido> = {}): EntradaPedido => ({
  linhas: [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }],
  levantamentoEm: QUARTA_7H30.toISOString(),
  cliente: { nome: "Márcia de Teste", email: "teste@example.com", telefone: "+351912345678" },
  chaveIdempotencia: novaChave(),
  armadilha: "",
  ...alteracoes,
});

/* O relógio das leituras sem `agora` (a `ocupacao`, que corre a limpeza). */
let relogio: Date = AGORA;
beforeEach(() => {
  relogio = AGORA;
});
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * A fonte da base de dados com a leitura do modo de teste — como o site a monta
 * —, e com o que cada teste quiser trocar na leitura: o limite por vaga, ou uma
 * ocupação desatualizada.
 */
async function montar(
  troca: { limitePorVaga?: number | null; ocupacao?: (desde: Date, ate: Date) => Promise<VagaOcupada[]> } = {},
  opcoes: Partial<OpcoesDaFonteBd> = {},
) {
  const { db } = await modelo.copia();
  const fonte = montarFonteBd(db, loteEmTransacao(db), {
    deTeste: true,
    leitura: () => leitura,
    relogio: () => relogio,
    ...opcoes,
  });
  const exemplo = comExemplo(fonte, EM_TESTE);
  const leitura: LeituraDoPedido = {
    listarProdutos: exemplo.listarProdutos,
    definicoesLoja: fonte.definicoesLoja,
    /* Sem os pedidos de exemplo do calendário: cada teste sabe o que ocupa. */
    ocupacao: troca.ocupacao ?? fonte.ocupacao,
    async configuracaoDaCasa() {
      const config = await exemplo.configuracaoDaCasa();
      return "limitePorVaga" in troca ? { ...config, limitePorVaga: troca.limitePorVaga! } : config;
    },
  };
  return { fonte, db };
}

const criado = async (resultado: Awaited<ReturnType<Awaited<ReturnType<typeof montar>>["fonte"]["criarPedido"]>>) => {
  if (!resultado.ok) throw new Error(`devia ter criado o pedido: ${resultado.erro}`);
  return resultado.pedido;
};

describe("criar o pedido", () => {
  it("cria o pedido pendente com o total do servidor, e guarda-o como a fonte dos JSON", async () => {
    const { fonte, db } = await montar();
    const pedido = await criado(await fonte.criarPedido(entrada(), CONTEXTO));

    expect(pedido).toMatchObject({ estado: "pendente", totalCent: 33500, modoPagamento: "total", pagoOnlineCent: 0 });
    expect(pedido.referencia).toMatch(FORMATO_REFERENCIA);
    expect(pedido.referencia.startsWith("DAM-0510-")).toBe(true);
    expect(pedido.linhas[0]).toMatchObject({ nome: "Kit Premium", variante: "20 pessoas", precoUnitarioCent: 33500 });

    /* O que se lê de volta é exatamente o que se devolveu. */
    expect(await fonte.pedidoPorReferencia(pedido.referencia)).toEqual(pedido);

    const [linha] = await db.select().from(pedidos);
    expect(linha).toMatchObject({ deTeste: true, ip: "203.0.113.1", procura: `marcia de teste ${pedido.referencia.toLowerCase()}` });
  });

  it("ocupa a vaga e sobe a versão do painel, no mesmo lote", async () => {
    const { fonte, db } = await montar();
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([{ inicio: QUARTA_7H30, pedidos: 1 }]);
    const [{ versao }] = await db.select({ versao: casa.versaoPedidos }).from(casa);
    expect(versao).toBe(1);
  });

  it("a referência leva o dia de Lisboa, não o de UTC", async () => {
    const { fonte } = await montar();
    // 23h30 UTC de segunda já é 00h30 de terça em Lisboa
    const agora = new Date("2026-10-05T23:30:00Z");
    const pedido = await criado(
      await fonte.criarPedido(entrada({ levantamentoEm: QUINTA_7H30.toISOString() }), { ...CONTEXTO, agora }),
    );
    expect(pedido.referencia.startsWith("DAM-0610-")).toBe(true);
  });

  it("a mesma chave devolve o mesmo pedido, e não ocupa duas vagas", async () => {
    const { fonte, db } = await montar();
    const pedido = entrada();
    const [primeiro, segundo] = await Promise.all([
      fonte.criarPedido(pedido, CONTEXTO),
      fonte.criarPedido(pedido, CONTEXTO),
    ]);
    expect((await criado(segundo)).id).toBe((await criado(primeiro)).id);
    expect(await db.select().from(pedidos)).toHaveLength(1);
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([{ inicio: QUARTA_7H30, pedidos: 1 }]);
  });

  it("sem os tempos da casa nem o modo de teste, responde indisponível em vez de inventar", async () => {
    const { db } = await modelo.copia();
    const crua = montarFonteBd(db, loteEmTransacao(db), { deTeste: false });
    expect(await crua.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "indisponivel" });
    expect(await db.select().from(pedidos)).toHaveLength(0);
  });

  it("recusa o que a fonte dos JSON recusa, sem gravar nada", async () => {
    const { fonte, db } = await montar();
    expect(await fonte.criarPedido(entrada({ armadilha: "x" }), CONTEXTO)).toEqual({ ok: false, erro: "recusado" });
    expect(
      await fonte.criarPedido(
        { ...entrada(), linhas: [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1, preco: 1 }] },
        CONTEXTO,
      ),
    ).toEqual({ ok: false, erro: "dados-invalidos" });
    const sobOrcamento = await fonte.criarPedido(
      entrada({ linhas: [{ produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1 }] }),
      CONTEXTO,
    );
    expect(sobOrcamento.ok === false && sobOrcamento.erro).toBe("sob-orcamento");
    const terca = new TZDate(2026, 9, 6, 7, 30, "Europe/Lisbon").toISOString();
    expect(await fonte.criarPedido(entrada({ levantamentoEm: terca }), CONTEXTO)).toEqual({
      ok: false,
      erro: "indisponivel",
    });
    expect(await db.select().from(pedidos)).toHaveLength(0);
  });

  it("recusa a loja em pausa", async () => {
    const { fonte } = await montar();
    await fonte.pausarLoja(new Date(AGORA.getTime() + 30 * 60_000), { papel: "funcionario", agora: AGORA });
    expect(await fonte.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "loja-em-pausa" });
  });

  it("sem o modo de teste, grava o pedido como verdadeiro", async () => {
    const { fonte, db } = await montar({}, { deTeste: false });
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    const [linha] = await db.select().from(pedidos);
    expect(linha.deTeste).toBe(false);
  });
});

describe("a última vaga decide-a a base de dados (regra 5)", () => {
  it("com limite 1, a segunda é recusada", async () => {
    const { fonte } = await montar({ limitePorVaga: 1 });
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    expect(await fonte.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "vaga-cheia" });
  });

  it("e recusa-a mesmo quando a leitura de antes dizia que havia vaga", async () => {
    /* Dois clientes ao mesmo tempo: os dois leram a vaga livre. O motor de
       horários deixa passar os dois; o `CHECK` deixa passar um. */
    const { fonte, db } = await montar({ limitePorVaga: 1, ocupacao: async () => [] });
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    expect(await fonte.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "vaga-cheia" });
    /* E o lote caiu inteiro: nem pedido, nem linhas, nem meia reserva. */
    expect(await db.select().from(pedidos)).toHaveLength(1);
    const [vaga] = await db.select().from(vagas);
    expect(vaga).toMatchObject({ ocupadas: 1, limite: 1 });
  });
});

describe("os limites de criar pedidos", () => {
  it("três pendentes do mesmo email, e o quarto é recusado", async () => {
    const { fonte, db } = await montar({ limitePorVaga: null });
    for (let i = 0; i < 3; i++) {
      await criado(await fonte.criarPedido(entrada(), { ...CONTEXTO, ip: `203.0.113.${i + 10}` }));
    }
    expect(await fonte.criarPedido(entrada(), { ...CONTEXTO, ip: "203.0.113.99" })).toEqual({
      ok: false,
      erro: "demasiados-pedidos",
    });
    expect(await db.select().from(pedidos)).toHaveLength(3);
  });

  it("cinco pendentes do mesmo IP, e o sexto é recusado — sem IP, não conta", async () => {
    const { fonte } = await montar({ limitePorVaga: null });
    const de = (i: number) => entrada({ cliente: { nome: "Outro", email: `c${i}@example.com`, telefone: "+351912345678" } });
    for (let i = 0; i < 5; i++) await criado(await fonte.criarPedido(de(i), CONTEXTO));
    expect(await fonte.criarPedido(de(5), CONTEXTO)).toEqual({ ok: false, erro: "demasiados-pedidos" });
    await criado(await fonte.criarPedido(de(6), { ...CONTEXTO, ip: null }));
  });

  it("um pendente que expirou deixa de contar", async () => {
    const { fonte } = await montar({ limitePorVaga: null });
    for (let i = 0; i < 3; i++) await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    const depois = new Date(AGORA.getTime() + PRAZO_DO_PEDIDO_MS + 1000);
    await criado(await fonte.criarPedido(entrada(), { ...CONTEXTO, agora: depois }));
  });
});

describe("a limpeza: o pedido expira aos 31 minutos, e nem um segundo antes", () => {
  it("aos 30 min 59 s continua a ocupar; aos 31 min 1 s expira e liberta a vaga", async () => {
    const { fonte, db } = await montar();
    const pedido = await criado(await fonte.criarPedido(entrada(), CONTEXTO));

    relogio = new Date(AGORA.getTime() + 30 * 60_000 + 59_000);
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([{ inicio: QUARTA_7H30, pedidos: 1 }]);
    expect((await fonte.pedidoPorReferencia(pedido.referencia))?.estado).toBe("pendente");

    relogio = new Date(AGORA.getTime() + 31 * 60_000 + 1000);
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([]);
    expect((await fonte.pedidoPorReferencia(pedido.referencia))?.estado).toBe("expirado");
    const [vaga] = await db.select().from(vagas).where(eq(vagas.inicio, QUARTA_7H30));
    expect(vaga.ocupadas).toBe(0);
  });

  it("descontar duas vezes não desconta duas vezes", async () => {
    const { fonte, db } = await montar();
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    relogio = new Date(AGORA.getTime() + 40 * 60_000);
    await Promise.all([fonte.ocupacao(QUARTA_7H30, QUARTA_7H30), fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)]);
    const [vaga] = await db.select().from(vagas);
    expect(vaga.ocupadas).toBe(0);
    /* Uma subida da versão para criar, outra para expirar — e não três. */
    const [{ versao }] = await db.select({ versao: casa.versaoPedidos }).from(casa);
    expect(versao).toBe(2);
  });

  it("criar um pedido também limpa: a vaga do abandonado volta a estar livre", async () => {
    const { fonte } = await montar({ limitePorVaga: 1 });
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    const depois = new Date(AGORA.getTime() + PRAZO_DO_PEDIDO_MS + 1000);
    await criado(await fonte.criarPedido(entrada(), { ...CONTEXTO, agora: depois }));
  });
});

describe("se a limpeza falhar, o site continua a vender", () => {
  /* Um contador abaixo do que a limpeza desconta: o `CHECK vagas_ocupadas` recusa
     a instrução inteira. É o que acontecia com um comando de lançamento que
     descontasse os pedidos de teste e os deixasse pendentes. */
  async function comALimpezaAFalhar() {
    const montada = await montar();
    await criado(await montada.fonte.criarPedido(entrada(), CONTEXTO));
    await montada.db.update(vagas).set({ ocupadas: 0 }).where(eq(vagas.inicio, QUARTA_7H30));
    relogio = new Date(AGORA.getTime() + 40 * 60_000);
    return { ...montada, log: vi.spyOn(console, "error").mockImplementation(() => {}) };
  }

  it("a ocupação responde na mesma, e o pedido fica pendente até a limpeza voltar a passar", async () => {
    const { fonte, db, log } = await comALimpezaAFalhar();
    await expect(fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).resolves.toEqual([]);
    const [pedido] = await db.select({ estado: pedidos.estado }).from(pedidos);
    expect(pedido.estado).toBe("pendente");
    expect(log).toHaveBeenCalledOnce();
  });

  it("criar um pedido também continua a funcionar", async () => {
    const { fonte } = await comALimpezaAFalhar();
    const depois = new Date(AGORA.getTime() + 40 * 60_000);
    await criado(await fonte.criarPedido(entrada({ levantamentoEm: QUINTA_7H30.toISOString() }), { ...CONTEXTO, agora: depois }));
  });

  it("o log diz a regra que falhou, e nunca a mensagem do erro, que traz os parâmetros", async () => {
    const { fonte, log } = await comALimpezaAFalhar();
    await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30);
    const escrito = log.mock.calls.flat().map(String).join(" ");
    expect(escrito).toContain("vagas_ocupadas");
    expect(escrito).not.toContain("update pedidos");
    expect(log.mock.calls[0]).toHaveLength(1);
  });
});

describe("expirar um pedido pelo id", () => {
  it("expira esse e só esse, e liberta a vaga dele, antes de passar o prazo", async () => {
    const { fonte, db } = await montar();
    const este = await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    const outro = await criado(await fonte.criarPedido(entrada({ levantamentoEm: QUINTA_7H30.toISOString() }), CONTEXTO));

    expect(await expirarPedido(db, este.id)).toBe(true);
    expect(await expirarPedido(db, este.id)).toBe(false);

    expect((await fonte.pedidoPorReferencia(este.referencia))?.estado).toBe("expirado");
    expect((await fonte.pedidoPorReferencia(outro.referencia))?.estado).toBe("pendente");
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([]);
    expect(await fonte.ocupacao(QUINTA_7H30, QUINTA_7H30)).toEqual([{ inicio: QUINTA_7H30, pedidos: 1 }]);
  });

  it("duas vezes só desconta uma, e um pedido pago não se expira", async () => {
    const { fonte, db } = await montar();
    const este = await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    await expirarPedido(db, este.id);
    await expirarPedido(db, este.id);
    expect(await fonte.ocupacao(QUARTA_7H30, QUARTA_7H30)).toEqual([{ inicio: QUARTA_7H30, pedidos: 1 }]);

    const pago = await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    await db.update(pedidos).set({ estado: "pago", pagoEm: AGORA }).where(eq(pedidos.id, pago.id));
    await expirarPedido(db, pago.id);
    expect((await fonte.pedidoPorReferencia(pago.referencia))?.estado).toBe("pago");
  });
});

describe("a referência que já existe", () => {
  /* Quatro letras: o `gerarReferencia` pede quatro números ao acaso. */
  const sorteios = (valor: number) => [valor, valor, valor, valor];

  it("tenta outra, e o pedido nasce na mesma, sem meia reserva da tentativa falhada", async () => {
    const { fonte, db } = await montar();
    const acaso = vi.spyOn(Math, "random");
    sorteios(0).forEach((n) => acaso.mockReturnValueOnce(n));
    const primeiro = await criado(await fonte.criarPedido(entrada(), CONTEXTO));

    [...sorteios(0), ...sorteios(0.5)].forEach((n) => acaso.mockReturnValueOnce(n));
    const segundo = await criado(await fonte.criarPedido(entrada(), CONTEXTO));

    expect(segundo.referencia).not.toBe(primeiro.referencia);
    expect(segundo.referencia).toMatch(FORMATO_REFERENCIA);
    const [vaga] = await db.select().from(vagas).where(eq(vagas.inicio, QUARTA_7H30));
    expect(vaga.ocupadas).toBe(2);
  });

  it("ao fim de cinco colisões desiste com um erro, em vez de ficar às voltas", async () => {
    const { fonte } = await montar();
    vi.spyOn(Math, "random").mockReturnValue(0);
    await criado(await fonte.criarPedido(entrada(), CONTEXTO));
    await expect(fonte.criarPedido(entrada(), CONTEXTO)).rejects.toThrow("referências seguidas");
  });
});

describe("a fonte que o site monta", () => {
  it("com DATABASE_URL e o modo de teste, o pedido confere-se com os tempos de exemplo e grava-se como de teste", async () => {
    const { db } = await modelo.copia();
    const fonte = fonteDoAmbiente({ ...EM_TESTE, DATABASE_URL: "postgres://teste" }, AGORA, (_endereco, opcoes) =>
      montarFonteBd(db, loteEmTransacao(db), opcoes),
    );
    /* Uma quinta sem pedidos de exemplo a encher a hora: a vista do modo de
       teste soma-os à ocupação, e é por ela que o pedido se confere. */
    const resultado = await fonte.criarPedido(entrada({ levantamentoEm: QUINTA_7H30.toISOString() }), CONTEXTO);
    const pedido = await criado(resultado);
    const [linha] = await db.select().from(pedidos).where(eq(pedidos.id, pedido.id));
    expect(linha.deTeste).toBe(true);
  });

  it("com DATABASE_URL e sem o modo de teste, confere-se com a base de dados como está", async () => {
    const { db } = await modelo.copia();
    const fonte = fonteDoAmbiente({ DATABASE_URL: "postgres://teste" }, AGORA, (_endereco, opcoes) =>
      montarFonteBd(db, loteEmTransacao(db), opcoes),
    );
    expect(await fonte.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "indisponivel" });
  });
});

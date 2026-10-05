import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TZDate } from "@date-fns/tz";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import ementaJson from "@/data/ementa.json";
import encomendasJson from "@/data/encomendas.json";
import { fonteDeExemplo, fonteDoAmbiente } from "./exemplo";
import { fonteDaLoja, NA_BASE_DE_DADOS } from "./fontes-de-teste";
import { CATALOGO_JSON, CONFIGURACAO_JSON, criarFonteJson } from "./json";
import { FORMATO_REFERENCIA, type EntradaPedido, type FonteDeDados } from "./tipos";

/* Segunda, 5 de outubro de 2026, às 10h00 de Lisboa. A cozinha de exemplo abre
   às 8h00 e os kits de festa de exemplo levam 2 dias: o primeiro levantamento é
   quarta às 7h00, à abertura da loja. */
const AGORA = new TZDate(2026, 9, 5, 10, 0, "Europe/Lisbon");
const QUARTA_7H = new TZDate(2026, 9, 7, 7, 0, "Europe/Lisbon").toISOString();
const TERCA_7H = new TZDate(2026, 9, 6, 7, 0, "Europe/Lisbon").toISOString();
const CONTEXTO = { agora: AGORA, ip: "203.0.113.1", contaId: null };

const entrada = (alteracoes: Partial<EntradaPedido> = {}): EntradaPedido => ({
  linhas: [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }],
  levantamentoEm: QUARTA_7H,
  cliente: { nome: "Cliente de Teste", email: "teste@example.com" },
  chaveIdempotencia: "4f1b2c3d-1111-4222-8333-444455556666",
  armadilha: "",
  ...alteracoes,
});

/* Só na volta dos JSON: é a fonte dos JSON; a importação compara-a com a base de dados (importar-catalogo.test.ts). */
describe.skipIf(NA_BASE_DE_DADOS)("o catálogo, tal como sai dos JSON", () => {
  it("tem os 95 artigos da ementa e os 12 produtos de encomenda, com ids únicos", () => {
    expect(CATALOGO_JSON.filter((p) => p.origem === "ementa")).toHaveLength(95);
    expect(CATALOGO_JSON.filter((p) => p.origem === "encomendas")).toHaveLength(12);
    expect(new Set(CATALOGO_JSON.map((p) => p.id)).size).toBe(CATALOGO_JSON.length);
  });

  it("cada preço em cêntimos é o euro do JSON vezes cem, sem arredondar nada", () => {
    /* A verificação da migração que o pedidos.md pede, contra o ficheiro cru. A
       tolerância é do lado do teste: 4,15 × 100 em vírgula flutuante dá
       415,00000000000006, e é exatamente por isso que o site passa a cêntimos. */
    for (const artigo of ementaJson) {
      const produto = CATALOGO_JSON.find((p) => p.id === artigo.id)!;
      if (artigo.variantes) {
        for (const variante of artigo.variantes) {
          const nossa = produto.variantes.find((v) => v.id === variante.chave)!;
          expect(nossa.precoCent).toBeCloseTo(variante.preco * 100, 6);
        }
      } else {
        if (artigo.preco === null) expect(produto.variantes[0].precoCent).toBeNull();
        else expect(produto.variantes[0].precoCent).toBeCloseTo(artigo.preco * 100, 6);
      }
    }
    for (const kit of encomendasJson.kitsFesta) {
      const produto = CATALOGO_JSON.find((p) => p.id === `festa-${kit.id}`)!;
      expect(produto.variantes.map((v) => v.precoCent)).toEqual(
        kit.escaloes.map((e) => Math.round(e.preco * 100)),
      );
    }
  });

  it("todos os preços são cêntimos inteiros", () => {
    for (const produto of CATALOGO_JSON) {
      for (const variante of produto.variantes) {
        if (variante.precoCent !== null) expect(Number.isInteger(variante.precoCent)).toBe(true);
      }
    }
  });

  it("os kits de festa têm uma variante por escalão, de 20, 40 e 70 pessoas", () => {
    const premium = CATALOGO_JSON.find((p) => p.id === "festa-premium")!;
    expect(premium.variantes.map((v) => [v.id, v.pessoas, v.precoCent])).toEqual([
      ["20", 20, 33500],
      ["40", 40, 65000],
      ["70", 70, 110000],
    ]);
    expect(premium.variantes[0].rotulo).toEqual({ pt: "20 pessoas", en: "20 people" });
  });

  it("cada escalão leva a sua composição, e o de 70 não é o de 20", () => {
    const kit = encomendasJson.kitsFesta.find((k) => k.id === "premium")!;
    const premium = CATALOGO_JSON.find((p) => p.id === "festa-premium")!;
    premium.variantes.forEach((variante, i) => {
      expect(variante.composicao.map((g) => g.grupo)).toEqual(["salgados", "doces"]);
      expect(variante.composicao[0].linhas).toEqual(kit.escaloes[i].salgados);
      expect(variante.composicao[1].linhas).toEqual(kit.escaloes[i].doces);
    });
  });

  it("o kit de bolo traz quantidade por item, a box traz-la no nome", () => {
    const kitBolo = CATALOGO_JSON.find((p) => p.id === "bolo-bolo-premium")!;
    const box = CATALOGO_JSON.find((p) => p.id === "box-aniversario")!;
    const jsonBox = encomendasJson.boxes.find((b) => b.id === "aniversario")!;
    expect(kitBolo.variantes[0].composicao[0].linhas[0].quantidade).not.toBeNull();
    expect(box.variantes[0].composicao).toEqual([
      { grupo: "itens", linhas: jsonBox.itens.map((nome) => ({ nome, quantidade: null })) },
    ]);
  });

  it("a subcategoria da ementa passa tal e qual", () => {
    for (const artigo of ementaJson) {
      const produto = CATALOGO_JSON.find((p) => p.id === artigo.id)!;
      expect(produto.subcategoria).toBe(artigo.subcategoria ?? null);
    }
  });

  it("o bolo inteiro é ao quilo, e o bolo por medida é sob orçamento — não zero", () => {
    expect(CATALOGO_JSON.find((p) => p.id === "vegan-tarte-de-nata")).toMatchObject({
      unidade: "kg",
      quantidadeMinima: 1,
      multiplo: 0.5,
    });
    const medida = CATALOGO_JSON.find((p) => p.id === "bolo-por-medida")!;
    expect(medida.variantes).toEqual([
      { id: "unica", rotulo: null, pessoas: null, precoCent: null, composicao: [] },
    ]);
    expect(medida.nome.pt).toBe("Bolo por medida");
  });

  it("o que a casa não deu fica por preencher, e não se inventa", () => {
    for (const produto of CATALOGO_JSON) {
      expect(produto.tempoProducao).toBeNull();
      // `null` e não `[]`: o JSON diz «por preencher», não «sem alergénios».
      expect(produto.alergenios).toBeNull();
      expect(produto.sinalPercent).toBeNull();
    }
    expect(CONFIGURACAO_JSON.cozinha).toBeNull();
  });

  it("o que se encomenda é o que a tabela de categorias deixa", () => {
    expect(CATALOGO_JSON.find((p) => p.id === "bolo-de-cenoura")).toMatchObject({
      aVendaOnline: true,
      quantidadeMinima: 12,
      multiplo: 6,
    });
    expect(CATALOGO_JSON.find((p) => p.id === "milkshake")?.aVendaOnline).toBe(false);
  });

  it("a loja vem do casa.json, das 7h às 21h", () => {
    expect(CONFIGURACAO_JSON.loja.segunda).toEqual([{ abre: "07:00", fecha: "21:00" }]);
  });
});

describe("as leituras", () => {
  it("filtram por origem e por família", async () => {
    const fonte = await fonteDaLoja();
    expect(await fonte.listarProdutos({ familia: "festa" })).toHaveLength(3);
    expect(await fonte.listarProdutos({ origem: "ementa", aVendaOnline: true })).toHaveLength(70);
    expect(await fonte.produtoPorId("nao-existe")).toBeNull();
  });

  it("dão a ordem da ementa, que não é a do catálogo, e cobre todas as cartas e categorias", async () => {
    const fonte = await fonteDaLoja();
    const ordem = await fonte.ordemDaEmenta();
    expect(ordem.categorias.slice(0, 4)).toEqual(["pausa", "salgados", "pratos", "doces"]);
    const ementa = await fonte.listarProdutos({ origem: "ementa" });
    for (const produto of ementa) {
      expect(ordem.cartas).toContain(produto.carta);
      expect(ordem.categorias).toContain(produto.categoria);
      if (produto.subcategoria) expect(ordem.subcategorias).toContain(produto.subcategoria);
    }
  });
});

describe("cotar o cesto: o preço calcula-se no servidor", () => {
  let fonte: FonteDeDados;
  beforeAll(async () => {
    fonte = await fonteDaLoja();
  });

  it("soma em cêntimos, e ao quilo multiplica pelos quilos", async () => {
    const resultado = await fonte.cotarCesto([
      { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 18 },
      { produtoId: "vegan-tarte-de-nata", varianteId: "unica", quantidade: 1.5 },
      { produtoId: "chocolate-do-dubai", varianteId: "150g", quantidade: 2 },
    ]);
    expect(resultado.ok && resultado.cotacao).toMatchObject({
      valida: true,
      semPreco: 0,
      // 18 × 300 + 1,5 × 1700 + 2 × 1075
      totalCent: 5400 + 2550 + 2150,
    });
  });

  it("um preço mandado pelo browser é recusado, não ignorado", async () => {
    const resultado = await fonte.cotarCesto([
      { produtoId: "box-aniversario", varianteId: "unica", quantidade: 1, preco: 0.01 },
    ]);
    expect(resultado).toEqual({ ok: false, erro: "dados-invalidos" });
  });

  it.each([
    ["produto-desconhecido", { produtoId: "nao-existe", varianteId: "unica", quantidade: 1 }],
    ["variante-desconhecida", { produtoId: "festa-premium", varianteId: "30", quantidade: 1 }],
    ["fora-de-venda", { produtoId: "milkshake", varianteId: "unica", quantidade: 1 }],
    ["abaixo-do-minimo", { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 6 }],
    ["fora-do-multiplo", { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 13 }],
    ["fora-do-multiplo", { produtoId: "vegan-tarte-de-nata", varianteId: "unica", quantidade: 1.25 }],
  ])("marca a linha com %s", async (erro, linha) => {
    const resultado = await fonte.cotarCesto([linha]);
    expect(resultado.ok && resultado.cotacao.valida).toBe(false);
    expect(resultado.ok && resultado.cotacao.linhas[0].erro).toBe(erro);
  });

  it("sob orçamento conta-se à parte, e nunca como zero no total", async () => {
    const resultado = await fonte.cotarCesto([
      { produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1 },
      { produtoId: "box-aniversario", varianteId: "unica", quantidade: 1 },
    ]);
    expect(resultado.ok && resultado.cotacao).toMatchObject({ totalCent: 3500, semPreco: 1, valida: true });
  });
});

/* Só na volta dos JSON: os pedidos ainda não estão na base de dados. */
describe.skipIf(NA_BASE_DE_DADOS)("criar o pedido", () => {
  it("sem a cozinha e os tempos da casa, responde indisponível em vez de inventar", async () => {
    const resultado = await criarFonteJson().criarPedido(entrada(), CONTEXTO);
    expect(resultado).toEqual({ ok: false, erro: "indisponivel" });
  });

  it("com os valores de exemplo, cria o pedido pendente com o total do servidor", async () => {
    const resultado = await fonteDeExemplo().criarPedido(entrada(), CONTEXTO);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.pedido).toMatchObject({
      estado: "pendente",
      totalCent: 33500,
      modoPagamento: "total",
      pagoOnlineCent: 0,
    });
    expect(resultado.pedido.referencia).toMatch(FORMATO_REFERENCIA);
    expect(resultado.pedido.referencia.startsWith("DAM-0510-")).toBe(true);
    expect(resultado.pedido.linhas[0]).toMatchObject({
      nome: "Kit Premium",
      variante: "20 pessoas",
      precoUnitarioCent: 33500,
    });
  });

  it("a referência leva o dia de Lisboa, não o de UTC", async () => {
    // 23h30 UTC de segunda já é 00h30 de terça em Lisboa
    const agora = new Date("2026-10-05T23:30:00Z");
    const resultado = await fonteDeExemplo().criarPedido(
      entrada({ levantamentoEm: new TZDate(2026, 9, 8, 7, 0, "Europe/Lisbon").toISOString() }),
      { ...CONTEXTO, agora },
    );
    expect(resultado.ok && resultado.pedido.referencia.startsWith("DAM-0610-")).toBe(true);
  });

  it("a mesma chave devolve o mesmo pedido", async () => {
    const fonte = fonteDeExemplo();
    const primeiro = await fonte.criarPedido(entrada(), CONTEXTO);
    const segundo = await fonte.criarPedido(entrada(), CONTEXTO);
    expect(primeiro.ok && segundo.ok && segundo.pedido.id).toBe(primeiro.ok && primeiro.pedido.id);
  });

  it("o pedido fica a ocupar a vaga, e com limite 1 a seguinte é recusada", async () => {
    const fonte = fonteDeExemplo({
      configuracao: { ...CONFIGURACAO_JSON, limitePorVaga: 1 },
    });
    await fonte.criarPedido(entrada(), CONTEXTO);
    const quando = new Date(QUARTA_7H);
    expect(await fonte.ocupacao(quando, quando)).toEqual([{ inicio: quando, pedidos: 1 }]);
    const outro = await fonte.criarPedido(
      entrada({ chaveIdempotencia: "4f1b2c3d-1111-4222-8333-999999999999" }),
      CONTEXTO,
    );
    expect(outro).toEqual({ ok: false, erro: "vaga-cheia" });
  });

  it("recusa uma vaga antes de o kit estar pronto", async () => {
    const resultado = await fonteDeExemplo().criarPedido(entrada({ levantamentoEm: TERCA_7H }), CONTEXTO);
    expect(resultado).toEqual({ ok: false, erro: "indisponivel" });
  });

  it("recusa a armadilha preenchida", async () => {
    const resultado = await fonteDeExemplo().criarPedido(entrada({ armadilha: "x" }), CONTEXTO);
    expect(resultado).toEqual({ ok: false, erro: "recusado" });
  });

  it("recusa um cesto com um artigo sob orçamento", async () => {
    const resultado = await fonteDeExemplo().criarPedido(
      entrada({ linhas: [{ produtoId: "bolo-por-medida", varianteId: "unica", quantidade: 1 }] }),
      CONTEXTO,
    );
    expect(resultado.ok === false && resultado.erro).toBe("sob-orcamento");
  });

  it("recusa a loja em pausa", async () => {
    const fonte = fonteDeExemplo({
      definicoes: {
        aceitarCancelamentosSite: false,
        devolverSinalAoCancelar: false,
        valorMinimoCent: null,
        pausaAte: new Date(AGORA.getTime() + 30 * 60_000),
      },
    });
    expect(await fonte.criarPedido(entrada(), CONTEXTO)).toEqual({ ok: false, erro: "loja-em-pausa" });
  });

  it("recusa um preço no meio das linhas", async () => {
    const resultado = await fonteDeExemplo().criarPedido(
      { ...entrada(), linhas: [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1, preco: 1 }] },
      CONTEXTO,
    );
    expect(resultado).toEqual({ ok: false, erro: "dados-invalidos" });
  });

  it("guarda-o para ser encontrado pela referência", async () => {
    const fonte = fonteDeExemplo();
    const resultado = await fonte.criarPedido(entrada(), CONTEXTO);
    if (!resultado.ok) throw new Error("devia ter criado o pedido");
    expect(await fonte.pedidoPorReferencia(resultado.pedido.referencia)).toBe(resultado.pedido);
  });
});

/* Só na volta dos JSON: o modo de teste ainda não fica por cima da base de dados (revisão do #57). */
describe.skipIf(NA_BASE_DE_DADOS)("os valores de exemplo", () => {
  const original = process.env.VERCEL_ENV;
  afterEach(() => {
    process.env.VERCEL_ENV = original;
  });

  it("no ar, recusam-se a correr sem o modo de teste", () => {
    expect(() => fonteDeExemplo({}, { VERCEL_ENV: "production" })).toThrow(/modo de teste/);
    expect(() => fonteDeExemplo({}, { VERCEL_ENV: "production", LOJA_EM_TESTE: "0" })).toThrow(
      /modo de teste/,
    );
  });

  it("no ar, com o modo de teste ligado, correm", () => {
    expect(() => fonteDeExemplo({}, { VERCEL_ENV: "production", LOJA_EM_TESTE: "1" })).not.toThrow();
  });

  it("nunca trocam um tempo que a casa já tenha dado", async () => {
    const dado = { unidade: "horas" as const, valor: 6 };
    const catalogo = CATALOGO_JSON.map((p) => (p.id === "festa-premium" ? { ...p, tempoProducao: dado } : p));
    const fonte = fonteDeExemplo({ catalogo });
    expect((await fonte.produtoPorId("festa-premium"))?.tempoProducao).toEqual(dado);
    expect((await fonte.produtoPorId("festa-medio"))?.tempoProducao).toEqual({ unidade: "dias", valor: 2 });
  });
});

/* Só na volta dos JSON: lê o tipos.ts, não depende da fonte. */
describe.skipIf(NA_BASE_DE_DADOS)("os tipos não trazem dados para o browser", () => {
  it("tipos.ts só importa zod e tipos", () => {
    const fonte = readFileSync(fileURLToPath(new URL("./tipos.ts", import.meta.url)), "utf8");
    const imports = [...fonte.matchAll(/^import (type )?[\s\S]*?from "([^"]+)";$/gm)];
    expect(imports.length).toBeGreaterThan(1);
    for (const [linha, soTipo, modulo] of imports) {
      expect(soTipo === "type " || modulo === "zod", linha).toBe(true);
    }
  });
});

/* Só na volta dos JSON: o modo de teste ainda não fica por cima da base de dados (revisão do #57). */
describe.skipIf(NA_BASE_DE_DADOS)("o interruptor LOJA_EM_TESTE escolhe a fonte", () => {
  it("desligado, a cozinha e os tempos ficam por preencher, e o calendário não se calcula", async () => {
    const fonte = fonteDoAmbiente({ VERCEL_ENV: "production" });
    expect((await fonte.configuracaoDaCasa()).cozinha).toBeNull();
    expect((await fonte.produtoPorId("festa-premium"))?.tempoProducao).toBeNull();
  });

  it("ligado, entram o horário e os tempos de exemplo, também no ar", async () => {
    const fonte = fonteDoAmbiente({ VERCEL_ENV: "production", LOJA_EM_TESTE: "1" });
    expect((await fonte.configuracaoDaCasa()).cozinha).not.toBeNull();
    expect((await fonte.produtoPorId("festa-premium"))?.tempoProducao).toEqual({ unidade: "dias", valor: 2 });
  });

  it("só o valor 1 liga — «true», «sim» ou vazio não ligam por engano", async () => {
    for (const valor of ["true", "sim", "", "0"]) {
      const fonte = fonteDoAmbiente({ VERCEL_ENV: "production", LOJA_EM_TESTE: valor });
      expect((await fonte.configuracaoDaCasa()).cozinha).toBeNull();
    }
  });
});

/* Só na volta dos JSON: o modo de teste ainda não fica por cima da base de dados (revisão do #57). */
describe.skipIf(NA_BASE_DE_DADOS)("os pedidos de exemplo do modo de teste", () => {
  const desde = new Date("2026-10-05T00:00:00Z");
  const ate = new Date("2026-11-04T23:00:00Z");
  const ligado = { VERCEL_ENV: "production", LOJA_EM_TESTE: "1" };

  it("só existem com o modo de teste ligado", async () => {
    expect(await fonteDoAmbiente({ VERCEL_ENV: "production" }).ocupacao(desde, ate)).toEqual([]);
    expect((await fonteDoAmbiente(ligado).ocupacao(desde, ate)).length).toBeGreaterThan(100);
  });

  it("nunca passam o limite por vaga, e há horas cheias", async () => {
    const ocupadas = await fonteDoAmbiente(ligado).ocupacao(desde, ate);
    expect(Math.max(...ocupadas.map((o) => o.pedidos))).toBe(4);
    expect(ocupadas.every((o) => o.pedidos >= 1 && o.pedidos <= 4)).toBe(true);
  });

  it("são sempre os mesmos — o calendário não muda a cada visita", async () => {
    const uma = await fonteDoAmbiente(ligado).ocupacao(desde, ate);
    const outra = await fonteDoAmbiente(ligado).ocupacao(desde, ate);
    expect(outra).toEqual(uma);
  });

  it("as cores dos dias misturam-se, sem semanas inteiras da mesma cor", async () => {
    const ocupadas = await fonteDoAmbiente(ligado).ocupacao(desde, ate);
    const porDia = new Map<string, number>();
    for (const o of ocupadas) {
      const dia = o.inicio.toISOString().slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + o.pedidos);
    }
    // de dia para dia a carga muda: em 30 dias, nunca sete seguidos parecidos
    const cargas = [...porDia.values()];
    const parecidos = (a: number, b: number) => Math.abs(a - b) < 6;
    let seguidos = 1, pior = 1;
    for (let i = 1; i < cargas.length; i++) {
      seguidos = parecidos(cargas[i], cargas[i - 1]) ? seguidos + 1 : 1;
      pior = Math.max(pior, seguidos);
    }
    expect(pior).toBeLessThan(7);
  });

  it("variam de dia para dia: há dias calmos e dias cheios", async () => {
    const ocupadas = await fonteDoAmbiente(ligado).ocupacao(desde, ate);
    const porDia = new Map<string, number>();
    for (const o of ocupadas) {
      const dia = o.inicio.toISOString().slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + o.pedidos);
    }
    expect(Math.max(...porDia.values()) - Math.min(...porDia.values())).toBeGreaterThan(20);
  });
});

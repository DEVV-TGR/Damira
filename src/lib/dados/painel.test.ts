import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { fonteDeExemplo } from "./exemplo";
import { CATALOGO_JSON, CONFIGURACAO_JSON } from "./json";
import { protegerPainel } from "./papeis";
import type { ContextoPainel, EntradaPedido, EntradaProduto, FonteDeDados, Produto } from "./tipos";

/*
 * O painel visto de fora, como o `index.ts` o expõe: a fonte com o papel
 * verificado por cima. São a especificação da implementação sobre a base de
 * dados (#31) — devem passar contra qualquer fonte.
 */

/* Segunda, 5 de outubro de 2026, às 10h00 de Lisboa. A cozinha de exemplo abre
   às 8h00 e a loja às 7h00. */
const AGORA = new TZDate(2026, 9, 5, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const BALCAO: ContextoPainel = { papel: "funcionario", agora: AGORA };
const CONTEXTO_PEDIDO = { agora: AGORA, ip: "203.0.113.1", contaId: null };

/* Um artigo da carta que fica pronto numa hora, para haver vagas no próprio dia
   — é aí que se vê o «esgotado hoje». */
const RAPIDO = "bolo-de-cenoura";

const fonte = (): FonteDeDados => {
  const base = fonteDeExemplo({
    catalogo: CATALOGO_JSON.map((p) =>
      p.id === RAPIDO ? { ...p, tempoProducao: { unidade: "horas" as const, valor: 1 } } : p,
    ),
  });
  return { ...base, ...protegerPainel(base) };
};

const hojeAs = (h: number) => new TZDate(2026, 9, 5, h, 0, "Europe/Lisbon").toISOString();
const amanhaAs = (h: number) => new TZDate(2026, 9, 6, h, 0, "Europe/Lisbon").toISOString();

let chave = 0;
const pedido = (produtoId: string, levantamentoEm: string, quantidade = 12): EntradaPedido => ({
  linhas: [{ produtoId, varianteId: "unica", quantidade }],
  levantamentoEm,
  cliente: { nome: "Cliente de Teste", email: "teste@example.com" },
  chaveIdempotencia: `4f1b2c3d-1111-4222-8333-${String(++chave).padStart(12, "0")}`,
  armadilha: "",
});

const novoBolo = (alteracoes: Partial<EntradaProduto> = {}): EntradaProduto => ({
  origem: "encomendas",
  familia: "bolo",
  nome: { pt: "Bolo de Bolacha", en: null },
  descricao: null,
  carta: null,
  categoria: null,
  subcategoria: null,
  unidade: "un",
  variantes: [{ rotulo: null, pessoas: null, precoCent: 2500, composicao: [] }],
  escolhas: [],
  tempoProducao: { unidade: "dias", valor: 2 },
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: true,
  apareceNaEmenta: false,
  alergenios: ["glúten", "ovo"],
  vegan: false,
  semGluten: false,
  fotos: [],
  sinalPercent: null,
  limite: null,
  ...alteracoes,
});

/* O produto como a gerente o abre para editar: sem o que tem função própria. */
const paraEntrada = (produto: Produto): EntradaProduto => {
  const entrada: Partial<Produto> = { ...produto };
  delete entrada.id;
  delete entrada.arquivado;
  delete entrada.foraDeVenda;
  delete entrada.esgotadoNoDia;
  return entrada as EntradaProduto;
};

const precoDe = async (f: FonteDeDados, produtoId: string, varianteId: string, quantidade = 1) => {
  const cotado = await f.cotarCesto([{ produtoId, varianteId, quantidade }]);
  if (!cotado.ok) throw new Error("cotação inválida");
  return cotado.cotacao.linhas[0];
};

describe("o papel verifica-se no servidor, antes de a fonte ser chamada", () => {
  it("o balcão não cria, não edita, não arquiva, não mexe em horários nem em definições — e nada muda", async () => {
    const f = fonte();
    const antes = await f.produtosDoPainel(BALCAO);
    const premium = (await f.produtoPorId("festa-premium"))!;

    const tentativas = [
      await f.criarProduto(novoBolo(), BALCAO),
      await f.editarProduto("festa-premium", { ...paraEntrada(premium), alergenios: [] }, BALCAO),
      await f.arquivarProduto("festa-premium", true, BALCAO),
      await f.guardarHorarios({ ...CONFIGURACAO_JSON, limitePorVaga: 1 }, BALCAO),
      await f.guardarDefinicoes(
        { aceitarCancelamentosSite: true, devolverSinalAoCancelar: true, valorMinimoCent: 1000 },
        BALCAO,
      ),
    ];
    for (const resultado of tentativas) expect(resultado).toEqual({ ok: false, erro: "sem-permissao" });

    expect(await f.produtosDoPainel(BALCAO)).toEqual(antes);
    expect((await f.definicoesLoja()).valorMinimoCent).toBeNull();
    expect((await f.configuracaoDaCasa()).limitePorVaga).not.toBe(1);
  });

  it("o balcão esgota, tira de venda e pausa a loja", async () => {
    const f = fonte();
    expect((await f.marcarEsgotadoHoje(RAPIDO, true, BALCAO)).ok).toBe(true);
    expect((await f.tirarDeVenda(RAPIDO, true, BALCAO)).ok).toBe(true);
    expect((await f.pausarLoja(new Date(AGORA.getTime() + 30 * 60_000), BALCAO)).ok).toBe(true);
  });
});

describe("criar e editar produtos", () => {
  it("o id sai do nome, sem acentos, e nunca repete; a variante única chama-se «unica»", async () => {
    const f = fonte();
    const primeiro = await f.criarProduto(novoBolo(), GERENTE);
    const segundo = await f.criarProduto(novoBolo(), GERENTE);
    const pao = await f.criarProduto(novoBolo({ nome: { pt: "Pão de Ló", en: null } }), GERENTE);
    expect(primeiro.ok && primeiro.valor.id).toBe("bolo-de-bolacha");
    expect(segundo.ok && segundo.valor.id).toBe("bolo-de-bolacha-2");
    expect(pao.ok && pao.valor.id).toBe("pao-de-lo");
    expect(primeiro.ok && primeiro.valor.variantes[0].id).toBe("unica");
  });

  it("um produto novo aparece na loja e cobra o preço que a gerente escreveu", async () => {
    const f = fonte();
    await f.criarProduto(novoBolo(), GERENTE);
    expect(await f.produtoPorId("bolo-de-bolacha")).not.toBeNull();
    expect((await precoDe(f, "bolo-de-bolacha", "unica")).totalCent).toBe(2500);
  });

  it("sem alergénios respondidos não vai à venda online — e «sem alergénios» é uma resposta", async () => {
    const f = fonte();
    expect(await f.criarProduto(novoBolo({ alergenios: null }), GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["alergenios"],
    });
    expect((await f.criarProduto(novoBolo({ alergenios: null, aVendaOnline: false }), GERENTE)).ok).toBe(true);
    expect((await f.criarProduto(novoBolo({ alergenios: [] }), GERENTE)).ok).toBe(true);
  });

  it("a entrada não traz id nem o arquivado: esses não se escrevem por aqui", async () => {
    const f = fonte();
    const comId = { ...novoBolo(), id: "outro" };
    const resultado = await f.criarProduto(comId, GERENTE);
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro).toBe("dados-invalidos");
  });

  it("um preço editado é o que o checkout cobra a seguir, e os ids das variantes não mudam", async () => {
    const f = fonte();
    expect((await precoDe(f, "festa-premium", "20")).totalCent).toBe(33500);
    const premium = (await f.produtoPorId("festa-premium"))!;
    const entrada = paraEntrada(premium);
    const editado = await f.editarProduto(
      "festa-premium",
      {
        ...entrada,
        alergenios: [],
        variantes: entrada.variantes.map((v) => (v.id === "20" ? { ...v, precoCent: 30000 } : v)),
      },
      GERENTE,
    );
    expect(editado.ok && editado.valor.variantes.map((v) => v.id)).toEqual(["20", "40", "70"]);
    expect((await precoDe(f, "festa-premium", "20")).totalCent).toBe(30000);
  });

  it("um id de variante que o produto não tem é recusado, e um produto que não existe também", async () => {
    const f = fonte();
    const premium = (await f.produtoPorId("festa-premium"))!;
    const entrada = { ...paraEntrada(premium), alergenios: [] };
    const inventada = { ...entrada, variantes: [{ ...entrada.variantes[0], id: "inventada" }] };
    expect(await f.editarProduto("festa-premium", inventada, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["variantes"],
    });
    expect(await f.editarProduto("nao-existe", entrada, GERENTE)).toEqual({ ok: false, erro: "nao-existe" });
  });
});

describe("arquivar, tirar de venda", () => {
  it("arquivado sai do site e do checkout, mas não do painel; desarquivar devolve-o", async () => {
    const f = fonte();
    await f.arquivarProduto("festa-premium", true, GERENTE);
    expect(await f.produtoPorId("festa-premium")).toBeNull();
    expect((await f.listarProdutos({ familia: "festa" })).map((p) => p.id)).not.toContain("festa-premium");
    expect((await precoDe(f, "festa-premium", "20")).erro).toBe("fora-de-venda");
    expect((await f.produtosDoPainel(GERENTE)).find((p) => p.id === "festa-premium")?.arquivado).toBe(true);
    expect((await f.listarProdutos({ incluirArquivados: true })).map((p) => p.id)).toContain("festa-premium");

    await f.arquivarProduto("festa-premium", false, GERENTE);
    expect(await f.produtoPorId("festa-premium")).not.toBeNull();
  });

  it("tirado de venda pelo balcão não se vende, e volta quando alguém o põe", async () => {
    const f = fonte();
    await f.tirarDeVenda(RAPIDO, true, BALCAO);
    expect((await precoDe(f, RAPIDO, "unica", 12)).erro).toBe("fora-de-venda");
    await f.tirarDeVenda(RAPIDO, false, BALCAO);
    expect((await precoDe(f, RAPIDO, "unica", 12)).erro).toBeNull();
  });
});

describe("esgotado hoje", () => {
  it("tira as vagas de hoje e deixa as de amanhã", async () => {
    const f = fonte();
    expect((await f.criarPedido(pedido(RAPIDO, hojeAs(15)), CONTEXTO_PEDIDO)).ok).toBe(true);
    await f.marcarEsgotadoHoje(RAPIDO, true, BALCAO);
    expect(await f.criarPedido(pedido(RAPIDO, hojeAs(16)), CONTEXTO_PEDIDO)).toMatchObject({ ok: false });
    expect((await f.criarPedido(pedido(RAPIDO, amanhaAs(15)), CONTEXTO_PEDIDO)).ok).toBe(true);
  });

  it("amanhã volta sozinho, sem ninguém o repor", async () => {
    const f = fonte();
    await f.marcarEsgotadoHoje(RAPIDO, true, BALCAO);
    const amanha = { ...CONTEXTO_PEDIDO, agora: new TZDate(2026, 9, 6, 10, 0, "Europe/Lisbon") };
    expect((await f.criarPedido(pedido(RAPIDO, amanhaAs(15)), amanha)).ok).toBe(true);
  });

  it("o dia é o de Lisboa: às 23h30 UTC de verão já é amanhã", async () => {
    const f = fonte();
    const meiaNoiteEMeia = { papel: "funcionario" as const, agora: new Date("2026-07-15T23:30:00Z") };
    const resultado = await f.marcarEsgotadoHoje(RAPIDO, true, meiaNoiteEMeia);
    expect(resultado.ok && resultado.valor.esgotadoNoDia).toBe("2026-07-16");
    const limpo = await f.marcarEsgotadoHoje(RAPIDO, false, meiaNoiteEMeia);
    expect(limpo.ok && limpo.valor.esgotadoNoDia).toBeNull();
  });
});

describe("horários, definições e pausa", () => {
  it("um período que fecha antes de abrir é recusado, com o campo marcado", async () => {
    const f = fonte();
    const casa = await f.configuracaoDaCasa();
    const errado = { ...casa, loja: { ...casa.loja, segunda: [{ abre: "18:00", fecha: "08:00" }] } };
    expect(await f.guardarHorarios(errado, GERENTE)).toEqual({ ok: false, erro: "dados-invalidos", campos: ["loja"] });
  });

  it("os degraus das cores têm de subir", async () => {
    const f = fonte();
    const casa = await f.configuracaoDaCasa();
    const errado = { ...casa, limiaresAfluencia: { livre: 60, media: 50 } };
    expect(await f.guardarHorarios(errado, GERENTE)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["limiaresAfluencia"],
    });
  });

  it("um horário gravado é o que a casa passa a ter, e o calendário lê", async () => {
    const f = fonte();
    const casa = await f.configuracaoDaCasa();
    const resultado = await f.guardarHorarios({ ...casa, limitePorVaga: 2, diasAFrente: 14 }, GERENTE);
    expect(resultado.ok).toBe(true);
    expect(await f.configuracaoDaCasa()).toMatchObject({ limitePorVaga: 2, diasAFrente: 14 });
  });

  it("as definições gravam-se sem mexer na pausa", async () => {
    const f = fonte();
    const ate = new Date(AGORA.getTime() + 60 * 60_000);
    await f.pausarLoja(ate, BALCAO);
    await f.guardarDefinicoes(
      { aceitarCancelamentosSite: true, devolverSinalAoCancelar: false, valorMinimoCent: 1500 },
      GERENTE,
    );
    expect(await f.definicoesLoja()).toEqual({
      aceitarCancelamentosSite: true,
      devolverSinalAoCancelar: false,
      valorMinimoCent: 1500,
      pausaAte: ate,
    });
  });

  it("com a loja em pausa não se criam pedidos; ao retomar, sim", async () => {
    const f = fonte();
    await f.pausarLoja(new Date(AGORA.getTime() + 30 * 60_000), BALCAO);
    expect(await f.criarPedido(pedido(RAPIDO, amanhaAs(15)), CONTEXTO_PEDIDO)).toEqual({
      ok: false,
      erro: "loja-em-pausa",
    });
    await f.pausarLoja(null, BALCAO);
    expect((await f.criarPedido(pedido(RAPIDO, amanhaAs(15)), CONTEXTO_PEDIDO)).ok).toBe(true);
  });

  it("uma pausa que já acabou é recusada", async () => {
    const f = fonte();
    expect(await f.pausarLoja(new Date(AGORA.getTime() - 1), BALCAO)).toEqual({
      ok: false,
      erro: "dados-invalidos",
      campos: ["pausaAte"],
    });
  });
});

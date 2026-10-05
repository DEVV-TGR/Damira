import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { afterAll, describe, expect, it } from "vitest";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { criarFonteBd, pedidosAindaNaoGuardados } from "./bd";
import { comExemplo, COZINHA_DE_EXEMPLO, fonteDoAmbiente, LIMITE_POR_VAGA_DE_EXEMPLO, TEMPOS_DE_EXEMPLO } from "./exemplo";
import { EsquemaProduto, type ContextoPainel, type EntradaProduto, type FonteDeDados, type Produto } from "./tipos";

/**
 * # O modo de teste por cima da base de dados (decidido a 05/10, #57)
 *
 * Com a base de dados, a fonte é sempre ela, e o exemplo é uma camada que tapa
 * só o que falta nas leituras da loja. Aqui prova-se o que importa: o
 * calendário funciona, o painel vê a casa como está gravada, e **nada de
 * exemplo chega à base de dados** — nem quando a gerente grava.
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

const AGORA = new TZDate(2026, 9, 7, 10, 0, "Europe/Lisbon");
const GERENTE: ContextoPainel = { papel: "gerente", agora: AGORA };
const EM_TESTE = { LOJA_EM_TESTE: "1" };

/* O que a gerente vê ao abrir um produto, pronto a gravar: sem o id e os
   interruptores do balcão, e com os alergénios respondidos. */
const SO_DA_ENTRADA = EsquemaProduto.omit({ id: true, arquivado: true, foraDeVenda: true, esgotadoNoDia: true });
const entradaDe = (produto: Produto, mudanca: Partial<EntradaProduto> = {}): EntradaProduto => ({
  ...SO_DA_ENTRADA.parse(produto),
  alergenios: [],
  ...mudanca,
});

/* A base de dados como o site a teria, numa cópia limpa do catálogo importado. */
async function daBaseDeDados(): Promise<FonteDeDados> {
  const { db } = await modelo.copia();
  return { ...pedidosAindaNaoGuardados, ...criarFonteBd(db, loteEmTransacao(db)) };
}

describe("a camada tapa só as leituras da loja", () => {
  it("os produtos da loja ganham os tempos de exemplo; os do painel ficam por preencher", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    const daLoja = await fonte.listarProdutos();
    expect(daLoja.every((p) => p.tempoProducao !== null)).toBe(true);
    expect((await fonte.produtoPorId("festa-premium"))?.tempoProducao).toEqual(TEMPOS_DE_EXEMPLO.festa);

    const doPainel = await fonte.produtosDoPainel(GERENTE);
    expect(doPainel.every((p) => p.tempoProducao === null)).toBe(true);
  });

  it("a casa da loja tem a cozinha e o limite de exemplo; a do painel, como está gravada", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    expect(await fonte.configuracaoDaCasa()).toMatchObject({
      cozinha: COZINHA_DE_EXEMPLO,
      limitePorVaga: LIMITE_POR_VAGA_DE_EXEMPLO,
    });
    expect(await fonte.configuracaoDoPainel(GERENTE)).toMatchObject({ cozinha: null, limitePorVaga: null });
  });

  it("o calendário tem pedidos de exemplo, e nenhuma hora passa o limite", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    const ocupadas = await fonte.ocupacao(AGORA, addDays(AGORA, 30));
    expect(ocupadas.length).toBeGreaterThan(0);
    expect(Math.max(...ocupadas.map((o) => o.pedidos))).toBeLessThanOrEqual(LIMITE_POR_VAGA_DE_EXEMPLO);
  });
});

describe("nada de exemplo chega à base de dados", () => {
  it("a gerente grava os horários, e a cozinha continua por dar", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    /* O que o «Horários» lhe mostra — a casa gravada — com uma coisa mudada. */
    const gravada = await fonte.configuracaoDoPainel(GERENTE);
    const resultado = await fonte.guardarHorarios(
      { ...gravada, diasFechados: [{ data: "2026-12-25", fecha: "ambas" }] },
      GERENTE,
    );
    expect(resultado.ok).toBe(true);
    expect(await fonte.configuracaoDoPainel(GERENTE)).toMatchObject({ cozinha: null, limitePorVaga: null });
    /* E a loja continua a ter o exemplo por cima, agora com o Natal fechado. */
    expect((await fonte.configuracaoDaCasa()).cozinha).toEqual(COZINHA_DE_EXEMPLO);
  });

  it("a gerente grava um produto, e o tempo continua por preencher", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    const kit = (await fonte.produtosDoPainel(GERENTE)).find((p) => p.id === "festa-premium")!;
    const gravado = await fonte.editarProduto("festa-premium", entradaDe(kit), GERENTE);
    expect(gravado.ok && gravado.valor.tempoProducao).toBeNull();
  });

  it("um tempo que a casa já deu nunca é trocado pelo de exemplo", async () => {
    const fonte = comExemplo(await daBaseDeDados(), EM_TESTE);
    const kit = (await fonte.produtosDoPainel(GERENTE)).find((p) => p.id === "festa-premium")!;
    const dela = { unidade: "dias" as const, valor: 4 };
    await fonte.editarProduto("festa-premium", entradaDe(kit, { tempoProducao: dela }), GERENTE);
    expect((await fonte.produtoPorId("festa-premium"))?.tempoProducao).toEqual(dela);
  });
});

describe("os pedidos, enquanto não estão na base de dados", () => {
  it("o painel vê zero pedidos, sem avisos, e o site não cria pedidos guardados", async () => {
    const fonte = await daBaseDeDados();
    expect(await fonte.listarPedidos({}, GERENTE)).toEqual({ ok: true, valor: { pedidos: [], seguinte: null } });
    expect(await fonte.precisaDeAtencao(GERENTE)).toEqual({ ok: true, valor: [] });
    expect(await fonte.versaoPedidos()).toBe(0);
    expect(await fonte.marcarEntregue("qualquer", false, GERENTE)).toEqual({ ok: false, erro: "nao-existe" });
    expect(await fonte.criarPedido({}, { agora: AGORA, ip: null, contaId: null })).toEqual({
      ok: false,
      erro: "indisponivel",
    });
  });
});

describe("a fonte que o site escolhe", () => {
  const comBase = async () => {
    const fonte = await daBaseDeDados();
    return () => fonte;
  };

  it("com DATABASE_URL e o modo de teste: a base de dados, com a camada por cima — e sem os pedidos de exemplo do painel", async () => {
    const fonte = fonteDoAmbiente({ ...EM_TESTE, DATABASE_URL: "postgres://teste" }, AGORA, await comBase());
    expect((await fonte.configuracaoDaCasa()).cozinha).toEqual(COZINHA_DE_EXEMPLO);
    expect((await fonte.configuracaoDoPainel(GERENTE)).cozinha).toBeNull();
    expect(fonte.simularPedidoPago).toBeUndefined();
    expect(await fonte.listarPedidos({}, GERENTE)).toMatchObject({ ok: true, valor: { pedidos: [] } });
  });

  it("com DATABASE_URL e sem o modo de teste: a base de dados como está", async () => {
    const fonte = fonteDoAmbiente({ DATABASE_URL: "postgres://teste" }, AGORA, await comBase());
    expect((await fonte.configuracaoDaCasa()).cozinha).toBeNull();
  });

  it("sem DATABASE_URL e com o modo de teste: os JSON, com os pedidos de exemplo do painel, como até aqui", async () => {
    const fonte = fonteDoAmbiente(EM_TESTE, AGORA, () => {
      throw new Error("não devia ir à base de dados");
    });
    expect(fonte.simularPedidoPago).toBeTypeOf("function");
  });

  it("no ar, sem o modo de teste, a camada recusa-se a correr", async () => {
    expect(() => comExemplo(pedidosAindaNaoGuardados as unknown as FonteDeDados, { VERCEL_ENV: "production" })).toThrow(
      /modo de teste/,
    );
  });
});

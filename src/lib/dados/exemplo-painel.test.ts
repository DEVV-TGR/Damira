import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { avisosDosPedidos, diaDeLisboa, organizarBalcao } from "@/lib/painel";
import { fonteDeExemplo, fonteDoAmbiente, pedidosDoPainelDeExemplo } from "./exemplo";
import { CONFIGURACAO_JSON } from "./json";
import { protegerPainel } from "./papeis";
import { EsquemaPedido, FORMATO_REFERENCIA, type FonteDeDados, type Pedido } from "./tipos";

/* Quarta, 7 de outubro de 2026, às 10h00 de Lisboa. */
const AGORA = new TZDate(2026, 9, 7, 10, 0, "Europe/Lisbon");
const GERENTE = { papel: "gerente" as const, agora: AGORA };

const doModoDeTeste = async (ambiente: Record<string, string | undefined> = { LOJA_EM_TESTE: "1" }) => {
  const fonte = fonteDoAmbiente(ambiente, AGORA);
  const resultado = await protegerPainel(fonte).listarPedidos({ limite: 100 }, GERENTE);
  if (!resultado.ok) throw new Error("devia listar");
  return { fonte, pedidos: resultado.valor.pedidos };
};

describe("os pedidos de exemplo do painel", () => {
  it("existem com o modo de teste ligado, e só com ele", async () => {
    expect((await doModoDeTeste()).pedidos.length).toBeGreaterThanOrEqual(12);
    expect((await doModoDeTeste({})).pedidos).toEqual([]);
  });

  it("são pedidos válidos, com referências únicas e no formato da casa", async () => {
    const { pedidos } = await doModoDeTeste();
    for (const pedido of pedidos) {
      expect(() => EsquemaPedido.parse(pedido), pedido.id).not.toThrow();
      expect(pedido.referencia).toMatch(FORMATO_REFERENCIA);
    }
    expect(new Set(pedidos.map((p) => p.referencia)).size).toBe(pedidos.length);
    expect(pedidos.every((p) => p.cliente.email.endsWith("@example.com"))).toBe(true);
  });

  it("cada linha custa o que o site cobraria hoje", async () => {
    const { fonte, pedidos } = await doModoDeTeste();
    for (const linha of pedidos.flatMap((p) => p.linhas)) {
      const cotado = await (fonte as FonteDeDados).cotarCesto([
        { produtoId: linha.produtoId, varianteId: linha.varianteId, quantidade: linha.quantidade },
      ]);
      expect(cotado.ok && cotado.cotacao.linhas[0].totalCent, linha.produtoId).toBe(linha.totalCent);
    }
  });

  it("enchem os três separadores do balcão, e o «precisa de atenção»", async () => {
    const { fonte, pedidos } = await doModoDeTeste();
    const produtos = await protegerPainel(fonte).produtosDoPainel(GERENTE);
    const casa = await fonte.configuracaoDaCasa();
    const balcao = organizarBalcao(pedidos, produtos, casa, AGORA);
    expect(balcao.levantamHoje.length).toBeGreaterThan(0);
    expect(balcao.levantamHoje.some((p) => p.estado === "cancelado")).toBe(true);
    expect(balcao.produzirHoje.length).toBeGreaterThan(0);
    expect(balcao.proximos.length).toBeGreaterThan(0);
    expect(balcao.semInicio).toEqual([]);

    const tipos = avisosDosPedidos(pedidos, casa, AGORA).map((a) => a.tipo);
    expect(tipos).toContain("chegou-tarde");
    expect(tipos).toContain("possivel-duplicado");
  });

  it("há um com dinheiro em falta, e entregues para o arquivo", async () => {
    const { pedidos } = await doModoDeTeste();
    expect(pedidos.some((p: Pedido) => p.totalCent > p.pagoOnlineCent)).toBe(true);
    expect(pedidos.filter((p) => p.estado === "entregue").length).toBeGreaterThanOrEqual(2);
  });

  it("são sempre os mesmos para o mesmo dia", async () => {
    const [a, b] = await Promise.all([doModoDeTeste(), doModoDeTeste()]);
    expect(a.pedidos.map((p) => p.referencia)).toEqual(b.pedidos.map((p) => p.referencia));
  });

  it("sem catálogo não se inventam produtos", () => {
    expect(pedidosDoPainelDeExemplo(AGORA, [], CONFIGURACAO_JSON)).toEqual([]);
  });

  it("nenhum cai num dia em que a loja está fechada", async () => {
    /* De quarta, «daqui a 4 dias» é domingo: com o domingo fechado, passa a segunda. */
    const semDomingo = { ...CONFIGURACAO_JSON, loja: { ...CONFIGURACAO_JSON.loja, domingo: [] } };
    const fonte = fonteDeExemplo({ configuracao: semDomingo, pedidosDoPainel: true }, { LOJA_EM_TESTE: "1" }, AGORA);
    const resultado = await protegerPainel(fonte).listarPedidos({ limite: 100 }, GERENTE);
    if (!resultado.ok) throw new Error("devia listar");
    const dias = resultado.valor.pedidos.map((p) => diaDeLisboa(p.levantamentoEm));
    expect(dias).not.toContain("2026-10-11");
    expect(dias).toContain("2026-10-12");
  });
});

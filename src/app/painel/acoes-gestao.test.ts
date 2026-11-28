import { beforeEach, describe, expect, it, vi } from "vitest";

const simulado = vi.hoisted(() => ({
  guardar: vi.fn(), revalidar: vi.fn(), contexto: vi.fn(), pedido: vi.fn(), horas: vi.fn(),
}));
vi.mock("@/lib/dados", () => ({ guardarHorarios: simulado.guardar, pedidoDoPainel: simulado.pedido }));
vi.mock("next/cache", () => ({ revalidatePath: simulado.revalidar }));
vi.mock("@/lib/painel-servidor", () => ({
  contextoDoPainel: simulado.contexto,
  comSessao: async (acao: (ctx: unknown) => unknown) => acao(await simulado.contexto()),
}));
vi.mock("@/lib/sessao-painel", () => ({ sessao: {} }));
vi.mock("@/lib/emails/depois", () => ({ enviarDepois: vi.fn() }));
vi.mock("@/lib/vagas-servidor", () => ({ horasParaPedido: simulado.horas }));
import { gravarHorarios, horasParaMudar } from "./acoes-gestao";

beforeEach(() => vi.resetAllMocks());
describe("a janela da nota e as horas da gerente", () => {
  it("revalida as páginas estáticas quando os horários mudam", async () => {
    simulado.guardar.mockResolvedValue({ ok: true, valor: {} });
    await gravarHorarios({ diasAFrente: 15 });
    expect(simulado.revalidar).toHaveBeenCalledWith("/", "layout");
  });
  it("não revalida uma gravação recusada", async () => {
    simulado.guardar.mockResolvedValue({ ok: false, erro: "sem-permissao" });
    await gravarHorarios({});
    expect(simulado.revalidar).not.toHaveBeenCalled();
  });
  it("o balcão não lê os avisos de reagendamento nem o pedido", async () => {
    simulado.contexto.mockResolvedValue({ papel: "funcionario" });
    expect(await horasParaMudar("2026-12-23", "pedido")).toEqual({ horas: [], produtosBloqueados: [] });
    expect(simulado.pedido).not.toHaveBeenCalled();
    expect(simulado.horas).not.toHaveBeenCalled();
  });
});

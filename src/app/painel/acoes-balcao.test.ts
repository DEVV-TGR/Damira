import { beforeEach, describe, expect, it, vi } from "vitest";

/* A fronteira, a sessão e o emissor são de mentira: o que se prova aqui é que o
   «sim» do balcão pede o envio da fila depois de gravar, e só se gravou. */
const responderPedido = vi.fn();
const enviarDepois = vi.fn();
const sessao = { ok: true as boolean };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dados", () => ({ responderPedido }));
vi.mock("@/lib/emails/depois", () => ({ enviarDepois }));
vi.mock("@/lib/painel-servidor", () => ({
  comSessao: async (acao: (ctx: unknown) => Promise<unknown>) =>
    sessao.ok ? acao({ papel: "funcionario", agora: new Date() }) : { ok: false, erro: "sem-sessao" },
}));
const { confirmar } = await import("./acoes-balcao");

describe("o «sim» do balcão", () => {
  beforeEach(() => {
    responderPedido.mockReset();
    enviarDepois.mockReset();
    sessao.ok = true;
  });

  it("confirma tal como está e pede o envio do email", async () => {
    responderPedido.mockResolvedValue({ ok: true, valor: {} });
    expect(await confirmar("p1")).toEqual({ ok: true, valor: {} });
    expect(responderPedido).toHaveBeenCalledWith("p1", { precos: [], levantamentoEm: null }, expect.anything());
    expect(enviarDepois).toHaveBeenCalledTimes(1);
  });

  it("uma confirmação recusada não pede envio nenhum", async () => {
    responderPedido.mockResolvedValue({ ok: false, erro: "estado-mudou" });
    expect(await confirmar("p1")).toEqual({ ok: false, erro: "estado-mudou" });
    expect(enviarDepois).not.toHaveBeenCalled();
  });

  it("sem sessão, nem chega à fronteira", async () => {
    sessao.ok = false;
    expect(await confirmar("p1")).toEqual({ ok: false, erro: "sem-sessao" });
    expect(responderPedido).not.toHaveBeenCalled();
    expect(enviarDepois).not.toHaveBeenCalled();
  });
});

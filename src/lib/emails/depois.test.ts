import { beforeEach, describe, expect, it, vi } from "vitest";
const { agendar, enviar } = vi.hoisted(() => ({ agendar: vi.fn(), enviar: vi.fn().mockResolvedValue({ enviados: 1, falhados: 0, saltados: 0 }) }));
vi.mock("next/server", () => ({ after: agendar }));
vi.mock("./enviar", () => ({ enviarEmailsPendentes: enviar }));
import { enviarDepois } from "./depois";
beforeEach(() => { agendar.mockReset(); enviar.mockClear(); });
describe("depois de gravar", () => {
  it("só envia quando o Next executa a tarefa posterior", async () => {
    enviarDepois(); expect(enviar).not.toHaveBeenCalled();
    await agendar.mock.calls[0][0]();
    expect(enviar).toHaveBeenCalledWith({ agora: expect.any(Date), limite: 10 });
  });
  it("uma falha do after nunca chega ao browser", () => {
    agendar.mockImplementation(() => { throw new Error("pessoa@example.com"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => enviarDepois()).not.toThrow();
    expect(log).toHaveBeenCalledWith("[emails] after-indisponivel"); log.mockRestore();
  });
});

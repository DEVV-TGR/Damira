import { expect, it, vi } from "vitest";
const { ler } = vi.hoisted(() => ({ ler: vi.fn().mockResolvedValue([]) }));
vi.mock("./exemplo", () => ({ fonteDoAmbiente: () => ({ emailsFalhados: ler }) }));
import { emailsFalhados } from "./index";
it("o balcão não consulta os falhados que podem conter destinatários", async () => {
  expect(await emailsFalhados(10, { papel: "funcionario", agora: new Date() })).toEqual({ ok: false, erro: "sem-permissao" });
  expect(ler).not.toHaveBeenCalled();
  expect(await emailsFalhados(10, { papel: "gerente", agora: new Date() })).toEqual({ ok: true, valor: [] });
  expect(ler).toHaveBeenCalledWith(10);
});

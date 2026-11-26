import { beforeEach, describe, expect, it, vi } from "vitest";

/* A fronteira e o polling são de mentira: o que se prova aqui é que a ação nunca rebenta para o
   browser (`robustez.md` › Erros), falhe a base de dados ou falte a chave. */
const aceitarProposta = vi.fn();
const recusarProposta = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dados", () => ({ aceitarProposta, recusarProposta }));
vi.mock("@/lib/painel-versao", () => ({ avisarQuePedidosMudaram: vi.fn() }));
const { caminhoDaProposta } = await import("@/lib/proposta");
const { aceitar, recusar } = await import("./acoes");

const REF = "DAM-0212-K7Q2";
const credencial = () => caminhoDaProposta(REF, 1).split("/").at(-1)!;

describe("as ações do link da proposta", () => {
  beforeEach(() => {
    vi.stubEnv("PROPOSTA_SEGREDO", "uma-chave-de-teste-com-mais-de-32-caracteres");
    aceitarProposta.mockReset();
    recusarProposta.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("aceita com um link válido", async () => {
    aceitarProposta.mockResolvedValue({ ok: true, pedido: {} });
    expect(await aceitar(REF, credencial())).toEqual({ ok: true });
    expect(aceitarProposta).toHaveBeenCalledWith(REF, 1, expect.any(Date));
  });

  it("um link adulterado não chega à fronteira", async () => {
    expect(await aceitar(REF, credencial().replace(/^1-/, "2-"))).toEqual({ ok: false, erro: "link-invalido" });
    expect(aceitarProposta).not.toHaveBeenCalled();
  });

  it("com a base de dados em baixo, devolve «falhou» sem escrever o erro", async () => {
    recusarProposta.mockRejectedValue(new Error("ligação recusada: cliente@example.com"));
    expect(await recusar(REF, credencial())).toEqual({ ok: false, erro: "falhou" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("example.com");
  });

  it("sem a PROPOSTA_SEGREDO, devolve «falhou»", async () => {
    const c = credencial();
    vi.stubEnv("PROPOSTA_SEGREDO", "");
    expect(await aceitar(REF, c)).toEqual({ ok: false, erro: "falhou" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { caminhoDaProposta, versaoDoLink } = await import("./proposta");

const REF = "DAM-0212-K7Q2";
const credencial = (ref: string, versao: number) => caminhoDaProposta(ref, versao).split("/").at(-1)!;

describe("o link do aceite", () => {
  beforeEach(() => {
    vi.stubEnv("PROPOSTA_SEGREDO", "uma-chave-de-teste-com-mais-de-32-caracteres");
  });

  it("não tem pontos no caminho: o proxy.ts deixava-o de fora, e a página dava 404", () => {
    expect(caminhoDaProposta(REF, 12)).not.toContain(".");
  });

  it("devolve a versão que assina", () => {
    expect(versaoDoLink(REF, credencial(REF, 1))).toBe(1);
    expect(versaoDoLink(REF, credencial(REF, 7))).toBe(7);
  });

  it("não aceita o link de outra referência, nem uma versão trocada à mão", () => {
    expect(versaoDoLink("DAM-0212-K7Q3", credencial(REF, 1))).toBeNull();
    const assinatura = credencial(REF, 1).slice(2);
    expect(versaoDoLink(REF, `2-${assinatura}`)).toBeNull();
  });

  it("não aceita um link assinado com outra chave", () => {
    const antigo = credencial(REF, 1);
    vi.stubEnv("PROPOSTA_SEGREDO", "outra-chave-de-teste-com-mais-de-32-caracteres");
    expect(versaoDoLink(REF, antigo)).toBeNull();
  });

  it.each(["", "1", "1-", "0-abc", "abc-def", `1-${"a".repeat(42)}`, `1-${"a".repeat(44)}`, `1.${"a".repeat(43)}`])("recusa o mal formado %j", (c) => {
    expect(versaoDoLink(REF, c)).toBeNull();
  });

  it("falha fechado sem chave, ou com uma chave curta", () => {
    vi.stubEnv("PROPOSTA_SEGREDO", "");
    expect(() => caminhoDaProposta(REF, 1)).toThrow("PROPOSTA_SEGREDO");
    vi.stubEnv("PROPOSTA_SEGREDO", "curta");
    expect(() => caminhoDaProposta(REF, 1)).toThrow("PROPOSTA_SEGREDO");
  });
});

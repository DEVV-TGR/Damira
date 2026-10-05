import { describe, expect, it } from "vitest";
import { telefoneValido } from "./pedidos";
import { aoEscrever, bandeira, paises, telefoneArrumado } from "./telefone";

describe("o telefone, com o país", () => {
  it("um português arruma-se de 3 em 3 e guarda-se em E.164", () => {
    expect(aoEscrever("911222333", "PT")).toBe("911 222 333");
    expect(telefoneValido("911 222 333", "PT")).toBe("+351911222333");
    expect(telefoneArrumado("+351911222333")).toBe("+351 911 222 333");
  });

  it("um estrangeiro vale com o país dele, no formato dele", () => {
    expect(telefoneValido("07400 123456", "GB")).toBe("+447400123456");
    expect(telefoneArrumado("+447400123456")).toBe("+44 7400 123456");
    expect(telefoneValido("+34 612 34 56 78", "PT")).toBe("+34612345678");
  });

  it("o servidor recusa o que não é um telefone do país — também o que só tem o tamanho certo", () => {
    expect(telefoneValido("811 222 333", "PT")).toBeNull();
    expect(telefoneValido("91122233", "PT")).toBeNull();
    expect(telefoneValido("abc", "PT")).toBeNull();
  });

  it("a lista abre em Portugal, com bandeira e indicativo", () => {
    const [primeiro] = paises("pt-PT");
    expect(primeiro).toMatchObject({ codigo: "PT", nome: "Portugal", indicativo: "+351" });
    expect(bandeira("PT")).toBe("🇵🇹");
  });
});

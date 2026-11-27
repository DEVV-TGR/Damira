import { beforeEach, describe, expect, it } from "vitest";
import { chaveDaCompra, concluirCompra } from "./chave-compra";

const dados = new Map<string, string>();
const armazenamento = {
  getItem: (nome: string) => dados.get(nome) ?? null,
  setItem: (nome: string, valor: string) => { dados.set(nome, valor); },
  removeItem: (nome: string) => { dados.delete(nome); },
};
beforeEach(() => dados.clear());

describe("a chave de envio do checkout", () => {
  it("recarregar e repetir o envio mantém a chave até haver sucesso", () => {
    const primeira = chaveDaCompra(armazenamento, "visitante");
    expect(primeira).toMatch(/^[a-f0-9-]{36}$/);
    expect(chaveDaCompra(armazenamento, "visitante")).toBe(primeira);
    concluirCompra(armazenamento, "visitante", primeira);
    expect(chaveDaCompra(armazenamento, "visitante")).not.toBe(primeira);
  });

  it("separa pessoas no mesmo aparelho e não apaga a tentativa mais recente", () => {
    const primeira = chaveDaCompra(armazenamento, "pessoa-a");
    expect(chaveDaCompra(armazenamento, "pessoa-b")).not.toBe(primeira);
    concluirCompra(armazenamento, "pessoa-a", primeira);
    const segunda = chaveDaCompra(armazenamento, "pessoa-a");
    concluirCompra(armazenamento, "pessoa-a", primeira);
    expect(chaveDaCompra(armazenamento, "pessoa-a")).toBe(segunda);
  });

  it("um valor guardado inválido não impede encomendar", () => {
    dados.set("damira:compra:visitante", "estragada");
    expect(chaveDaCompra(armazenamento, "visitante")).not.toBe("estragada");
  });

  it("sem armazenamento disponível mantém a chave da tentativa em memória", () => {
    const chave = chaveDaCompra(null, "visitante");
    const avariado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); }, removeItem: () => {} };
    expect(chaveDaCompra(avariado, "visitante", chave)).toBe(chave);
    expect(() => concluirCompra(avariado, "visitante", chave)).not.toThrow();
  });
});

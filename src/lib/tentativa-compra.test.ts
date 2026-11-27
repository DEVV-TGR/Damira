import { describe, expect, it } from "vitest";
import { normalizarCesto } from "./cesto";
import { guardarTentativa, lerTentativa, apagarTentativa, podeEsvaziarCesto, type TentativaCompra } from "./tentativa-compra";

const itens = normalizarCesto([{ id: "festa-premium:20", produtoId: "festa-premium", varianteId: "20", quantidade: 1, nome: "Kit", precoCent: 33500 }]);
const tentativa: TentativaCompra = {
  pessoa: "visitante", chave: "318b63e4-eccf-45d5-bb8b-b92812bf3760", itens,
  dados: { linhas: '[{"produtoId":"festa-premium","varianteId":"20","quantidade":1,"escolhas":[],"notas":null}]', levantamento: "2026-10-07T06:30:00Z", nome: "Cliente de Teste" },
};
const armazenamento = () => {
  const dados = new Map<string, string>();
  return { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); }, removeItem: (k: string) => { dados.delete(k); } };
};

describe("recuperar um envio cuja resposta se perdeu", () => {
  it("o reload e o login recuperam o envio original, incluindo chave e hora, sem consultar vagas novas", () => {
    const local = armazenamento();
    guardarTentativa(local, tentativa);
    expect(lerTentativa(local)).toEqual(tentativa);
    apagarTentativa(local, tentativa.chave);
    expect(lerTentativa(local)).toBeNull();
  });

  it("a recuperação não apaga um cesto entretanto alterado, nem o cesto de outra conta", () => {
    expect(podeEsvaziarCesto(tentativa, itens, "visitante")).toBe(true);
    expect(podeEsvaziarCesto(tentativa, itens, "entrou-na-conta")).toBe(true);
    expect(podeEsvaziarCesto(tentativa, [{ ...itens[0], quantidade: 2 }], "visitante")).toBe(false);
    expect(podeEsvaziarCesto({ ...tentativa, pessoa: "pessoa-a" }, itens, "pessoa-b")).toBe(false);
  });

  it("não apaga uma tentativa mais recente com uma resposta atrasada", () => {
    const local = armazenamento();
    guardarTentativa(local, tentativa);
    apagarTentativa(local, "outra-chave");
    expect(lerTentativa(local)).toEqual(tentativa);
  });

  it("ignora armazenamento inválido ou bloqueado", () => {
    const local = { getItem: () => '{"dados":{}}', setItem: () => {}, removeItem: () => {} };
    expect(lerTentativa(local)).toBeNull();
    const bloqueado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); }, removeItem: () => { throw new Error("bloqueado"); } };
    expect(lerTentativa(bloqueado)).toBeNull();
    expect(() => guardarTentativa(bloqueado, tentativa)).not.toThrow();
    expect(() => apagarTentativa(bloqueado, tentativa.chave)).not.toThrow();
  });
});

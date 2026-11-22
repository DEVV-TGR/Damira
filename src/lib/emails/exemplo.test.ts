import { describe, expect, it } from "vitest";
import { lerArgumentosTeste } from "./argumentos-teste";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "./exemplo";
import { escreverEmail } from "./modelos";

it("lista 23 exemplos distintos, com a loja apenas em português", () => {
  const exemplos = exemplosEmail();
  expect(exemplos).toHaveLength(23);
  expect(new Set(exemplos.map(({ modelo, locale, variante }) => `${modelo}/${locale}/${variante}`)).size).toBe(23);
  expect(exemplos.filter(({ modelo }) => modelo.endsWith("-loja")).every(({ locale }) => locale === "pt")).toBe(true);
});

it.each(exemplosEmail())("escreve $modelo · $locale · $variante com aviso de teste", ({ modelo, locale, variante }) => {
  const dados = { ...exemploEmail(modelo, variante), modoDeTeste: true };
  const email = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
  expect(email.assunto).toMatch(/^\[TESTE\] /);
  expect(email.texto).toMatch(/^⚠️ (MODO DE TESTE|TEST MODE) — /);
});

describe("argumentos do envio de teste", () => {
  it("recusa a falta de destinatário", () => {
    expect(() => lerArgumentosTeste([])).toThrow("--para");
  });

  it("recusa mais de cinco destinatários", () => {
    expect(() => lerArgumentosTeste(["--para", Array.from({ length: 6 }, (_, indice) => `teste${indice}@exemplo.pt`).join(",")]))
      .toThrow("no máximo 5");
  });

  it("mantém o envio desligado por defeito", () => {
    expect(lerArgumentosTeste(["--para", "teste@exemplo.pt"]).enviar).toBe(false);
  });

  it("aceita cinco destinatários, filtros e endereço de resposta", () => {
    expect(lerArgumentosTeste([
      "--para", "a@exemplo.pt, b@exemplo.pt,c@exemplo.pt,d@exemplo.pt,e@exemplo.pt",
      "--modelo", "cancelado-cliente", "--lingua", "en", "--responder-para", "resposta@exemplo.pt",
    ])).toEqual({
      para: ["a@exemplo.pt", "b@exemplo.pt", "c@exemplo.pt", "d@exemplo.pt", "e@exemplo.pt"],
      enviar: false, modelo: "cancelado-cliente", lingua: "en", responderPara: "resposta@exemplo.pt",
    });
  });

  it.each([
    ["--para", "invalido"], ["--para", "teste@exemplo.pt,"],
    ["--para", "teste@exemplo.pt\nBcc:outro@exemplo.pt"],
    ["--para", "teste@exemplo.pt", "--responder-para", "invalido"],
    ["--para", "teste@exemplo.pt", "--modelo", "inexistente"],
    ["--para", "teste@exemplo.pt", "--lingua", "fr"],
    ["--para", "--enviar"], ["--para", "teste@exemplo.pt", "--outro"],
    ["--para", "teste@exemplo.pt", "--para", "outro@exemplo.pt"],
  ])("recusa argumentos inválidos: %j", (...argumentos) => {
    expect(() => lerArgumentosTeste(argumentos)).toThrow();
  });
});

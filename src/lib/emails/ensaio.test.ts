import { expect, it } from "vitest";
import { validarEnsaioDaFila } from "./ensaio";
const ambiente = { DATABASE_URL: "postgresql://exemplo:inventado@ep-desenvolvimento.eu-west-2.aws.neon.tech/neondb", EMAILS_SO_PARA: "ensaio@example.com", RESEND_API_KEY: "inventada", LOJA_EM_TESTE: "1" };
const argumentos = ["--enviar", "--desenvolvimento", "--servidor-desenvolvimento=ep-desenvolvimento.eu-west-2.aws.neon.tech"];
it("sem --enviar não faz consultas nem precisa de configuração", () => {
  expect(validarEnsaioDaFila([], {})).toBeNull();
});
it("exige modo de teste para o aviso [TESTE] chegar à caixa", () => {
  expect(() => validarEnsaioDaFila(argumentos, { ...ambiente, LOJA_EM_TESTE: "" })).toThrow("modo-de-teste");
});
it("o servidor tem de ser o de desenvolvimento confirmado pelo utilizador", () => {
  expect(() => validarEnsaioDaFila(argumentos.slice(0, 2), ambiente)).toThrow("servidor");
  expect(() => validarEnsaioDaFila(argumentos, { ...ambiente, DATABASE_URL: "postgresql://exemplo:inventado@ep-production.eu-west-2.aws.neon.tech/neondb" })).toThrow("servidor");
  expect(validarEnsaioDaFila(argumentos, ambiente)).toEqual({ servidor: "ep-desenvolvimento.eu-west-2.aws.neon.tech", base: "neondb" });
});
it("recusa production e ausência de chave ou caixa, sem revelar credenciais", () => {
  for (const env of [{ ...ambiente, VERCEL_ENV: "production" }, { ...ambiente, RESEND_API_KEY: "" }, { ...ambiente, EMAILS_SO_PARA: "" }]) {
    expect(() => validarEnsaioDaFila(argumentos, env)).toThrow();
  }
});

import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/emails/recuperacao-servidor", () => { throw new Error("modulo-dos-dados-importado-antes-dos-guardas"); });
import { GET } from "./route";
afterEach(() => vi.unstubAllEnvs());

it("sem autorização nem sequer importa o módulo que pode consultar a BD", async () => {
  vi.stubEnv("CRON_SECRET", "segredo-inventado-exclusivo-dos-testes-123456");
  expect((await GET(new Request("https://exemplo.test/api/tarefas/emails"))).status).toBe(401);
});
it("mesmo autenticado, desligado não importa o módulo dos dados", async () => {
  vi.stubEnv("CRON_SECRET", "segredo-inventado-exclusivo-dos-testes-123456");
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("EMAILS_RECUPERACAO_ATIVA", "");
  const resposta = await GET(new Request("https://exemplo.test/api/tarefas/emails", {
    headers: { authorization: "Bearer segredo-inventado-exclusivo-dos-testes-123456" },
  }));
  expect(resposta.status).toBe(503);
});

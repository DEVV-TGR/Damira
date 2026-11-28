import { afterEach, describe, expect, it, vi } from "vitest";
const { enviar } = vi.hoisted(() => ({ enviar: vi.fn() }));
vi.mock("@/lib/emails/recuperacao-servidor", () => ({ recuperarEmailsDoAmbiente: enviar }));
import { GET } from "./route";

afterEach(() => { vi.unstubAllEnvs(); enviar.mockReset(); });
describe("rota da recuperação", () => {
  it("um pedido sem autorização nunca chega ao emissor", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-inventado-exclusivo-dos-testes-123456");
    expect((await GET(new Request("https://exemplo.test/api/tarefas/emails"))).status).toBe(401);
    expect(enviar).not.toHaveBeenCalled();
  });
  it("liga a execução autenticada ao emissor e responde sem cache", async () => {
    for (const [nome, valor] of Object.entries({ VERCEL_ENV: "production", EMAILS_RECUPERACAO_ATIVA: "1",
      CRON_SECRET: "segredo-inventado-exclusivo-dos-testes-123456", DATABASE_URL: "postgresql://inventado:inventado@ep-inventado.neon.tech/neondb",
      RESEND_API_KEY: "inventada", EMAIL_REMETENTE: "emissor@example.com", LOJA_EM_TESTE: "1", EMAILS_SO_PARA: "ensaio@example.com" })) vi.stubEnv(nome, valor);
    enviar.mockResolvedValue({ enviados: 0, falhados: 0, saltados: 0, voltas: 1, paragem: "sem-trabalho" });
    const resposta = await GET(new Request("https://exemplo.test/api/tarefas/emails", {
      headers: { authorization: "Bearer segredo-inventado-exclusivo-dos-testes-123456" },
    }));
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
    expect(enviar).toHaveBeenCalledExactlyOnceWith(expect.any(Date));
  });
});

import { describe, expect, it, vi } from "vitest";
import { atenderRecuperacaoEmails } from "./recuperacao-http";

const segredo = "segredo-inventado-exclusivo-dos-testes-123456";
const ambiente = { VERCEL_ENV: "production", EMAILS_RECUPERACAO_ATIVA: "1", CRON_SECRET: segredo,
  DATABASE_URL: "postgresql://inventado:inventado@ep-inventado.neon.tech/neondb",
  RESEND_API_KEY: "inventada", EMAIL_REMETENTE: "emissor@example.com", EMAILS_SO_PARA: "ensaio@example.com", LOJA_EM_TESTE: "1" };
const pedido = (autorizacao = `Bearer ${segredo}`) => new Request("https://exemplo.test/api/tarefas/emails?limite=9999&destino=nao@example.com", { headers: { authorization: autorizacao } });
const vazio = { enviados: 0, falhados: 0, saltados: 0, voltas: 1, paragem: "sem-trabalho" as const };

describe("entrada autenticada da recuperação", () => {
  it.each(["", "Bearer errado", `bearer ${segredo}`, `Bearer ${segredo}x`])("recusa autorização inválida antes de qualquer consulta (%s)", async autorizacao => {
    const executar = vi.fn().mockResolvedValue(vazio);
    const resposta = await atenderRecuperacaoEmails(pedido(autorizacao), ambiente, executar);
    expect(resposta.status).toBe(401); expect(executar).not.toHaveBeenCalled();
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([
    { CRON_SECRET: "" }, { CRON_SECRET: "curto" }, { CRON_SECRET: `${segredo}\n` },
    { EMAILS_RECUPERACAO_ATIVA: "" }, { VERCEL_ENV: "preview" }, { DATABASE_URL: "" },
    { DATABASE_URL: "https://exemplo.test" }, { RESEND_API_KEY: "" }, { EMAIL_REMETENTE: "invalido" },
    { EMAILS_SO_PARA: "" }, { EMAILS_SO_PARA: "invalido" },
  ])("configuração insegura não consulta a fila (%j)", async extra => {
    const executar = vi.fn().mockResolvedValue(vazio);
    const resposta = await atenderRecuperacaoEmails(pedido(), { ...ambiente, ...extra }, executar);
    expect(resposta.status).toBeGreaterThanOrEqual(400); expect(executar).not.toHaveBeenCalled();
  });
  it("executa só com configuração válida e ignora parâmetros do URL", async () => {
    const executar = vi.fn().mockResolvedValue(vazio);
    const agora = new Date("2026-11-26T12:00:00Z");
    const resposta = await atenderRecuperacaoEmails(pedido(), ambiente, executar, agora);
    expect(resposta.status).toBe(200); expect(await resposta.json()).toEqual({ ok: true, ...vazio });
    expect(executar).toHaveBeenCalledExactlyOnceWith(agora);
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  });
  it("produção real pode usar o destinatário gravado sem caixa de desvio", async () => {
    const executar = vi.fn().mockResolvedValue(vazio);
    expect((await atenderRecuperacaoEmails(pedido(), { ...ambiente, LOJA_EM_TESTE: "", EMAILS_SO_PARA: "" }, executar)).status).toBe(200);
  });
  it.each(["falha", "bloqueado", "limite-de-tempo", "limite-de-voltas", "intervencao-necessaria"] as const)("não anuncia sucesso operacional ao terminar por %s", async paragem => {
    const resposta = await atenderRecuperacaoEmails(pedido(), ambiente, async () => ({ ...vazio, paragem }));
    expect(resposta.status).toBe(503); expect(await resposta.json()).toMatchObject({ ok: false, paragem });
  });
  it("uma exceção inesperada vira erro controlado, sem corpo privado nem credenciais", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const resposta = await atenderRecuperacaoEmails(pedido(), ambiente, async () => { throw new Error("privado-inventado"); });
      expect(resposta.status).toBe(503);
      expect(await resposta.text()).not.toContain("privado-inventado");
      expect(JSON.stringify(log.mock.calls)).not.toContain("privado-inventado");
    } finally { log.mockRestore(); }
  });
});

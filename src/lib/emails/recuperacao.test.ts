import { describe, expect, it, vi } from "vitest";
import { recuperarEmailsAutomaticamente } from "./recuperacao";

const agora = new Date("2026-11-26T11:00:00Z");
const vazio = { enviados: 0, falhados: 0, saltados: 0 };

describe("recuperação automática da fila", () => {
  it("escoa mais de um lote e usa o instante atualizado sem depender de visitas", async () => {
    let volta = 0;
    const instantes: Date[] = [];
    const resumo = await recuperarEmailsAutomaticamente(agora, {
      enviar: async opcoes => {
        instantes.push(opcoes.agora);
        return ++volta === 1 ? { ...vazio, enviados: 10 } : volta === 2 ? { ...vazio, enviados: 3 } : vazio;
      },
      decorrido: () => (volta === 0 ? 0 : volta === 1 ? 1200 : 2500), esperar: async () => {},
    });
    expect(resumo).toEqual({ enviados: 13, falhados: 0, saltados: 0, voltas: 3, paragem: "sem-trabalho" });
    expect(instantes.map(d => d.toISOString())).toEqual(["2026-11-26T11:00:00.000Z", "2026-11-26T11:00:01.200Z", "2026-11-26T11:00:02.500Z"]);
  });
  it("uma falha termina novos lotes para não insistir no fornecedor durante a mesma chamada", async () => {
    let chamadas = 0;
    const resumo = await recuperarEmailsAutomaticamente(agora, {
      enviar: async () => { if (++chamadas > 1) throw new Error("insistencia"); return { ...vazio, enviados: 2, falhados: 1 }; },
    });
    expect(resumo).toEqual({ enviados: 2, falhados: 1, saltados: 0, voltas: 1, paragem: "falha" });
  });
  it("um bloqueio de configuração não entra num ciclo de novas tentativas", async () => {
    const resumo = await recuperarEmailsAutomaticamente(agora, { enviar: async () => ({ ...vazio, bloqueado: "sem-chave-resend" }) });
    expect(resumo).toMatchObject({ voltas: 1, paragem: "bloqueado", bloqueado: "sem-chave-resend" });
  });
  it("a fila sempre cheia fica limitada a 120 emails por execução", async () => {
    const resumo = await recuperarEmailsAutomaticamente(agora, {
      enviar: async () => ({ ...vazio, enviados: 10 }), decorrido: () => 0, esperar: async () => {},
    });
    expect(resumo).toEqual({ enviados: 120, falhados: 0, saltados: 0, voltas: 12, paragem: "limite-de-voltas" });
  });
  it("não inicia outro lote após o orçamento de tempo, incluindo a pausa entre lotes", async () => {
    let tempo = 0;
    const resumo = await recuperarEmailsAutomaticamente(agora, {
      enviar: async () => { tempo = 179_900; return { ...vazio, enviados: 10 }; },
      esperar: async ms => { tempo += ms; }, decorrido: () => tempo,
    });
    expect(resumo).toEqual({ enviados: 10, falhados: 0, saltados: 0, voltas: 1, paragem: "limite-de-tempo" });
  });
  it("um lote rejeitado não expõe o erro nem apaga o progresso anterior", async () => {
    let chamadas = 0;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const resumo = await recuperarEmailsAutomaticamente(agora, {
        enviar: async () => { if (++chamadas === 2) throw new Error("segredo-inventado"); return { ...vazio, enviados: 1 }; },
        esperar: async () => {},
      });
      expect(resumo).toEqual({ enviados: 1, falhados: 1, saltados: 0, voltas: 2, paragem: "falha" });
      expect(JSON.stringify(log.mock.calls)).not.toContain("segredo-inventado");
    } finally { log.mockRestore(); }
  });
});

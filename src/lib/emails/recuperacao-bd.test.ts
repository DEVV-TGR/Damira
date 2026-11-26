import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emailsPorEnviar } from "@/db/esquema";
import { baseComPedidos } from "@/lib/dados/fontes-de-teste";
import { criarEmailsBd, haEmailsDefinitivamenteFalhados } from "@/lib/dados/bd-emails";
import { executarEmissor } from "./executar";
import { recuperarEmailsAutomaticamente } from "./recuperacao";
import { agora, pedidoDeEmail, linhaDeEmail } from "./exemplo-emissor-teste";

let base: Awaited<ReturnType<typeof baseComPedidos>>;
let fonte: ReturnType<typeof criarEmailsBd>;
const ambiente = { VERCEL_ENV: "preview", EMAILS_SO_PARA: "ensaio@example.com", RESEND_API_KEY: "inventada", LOJA_EM_TESTE: "1" };
const casa = { nome: "Casa", morada: "Rua", localidade: "Local", telefone: "+351912000000", email: "casa@example.com" };
const sucesso = () => vi.fn<typeof fetch>().mockImplementation(async () => new Response('{"id":"inventado"}', { status: 200 }));
const hora = (n: number) => new Date(+agora + n * 3_600_000);
const recuperar = (data: Date, buscar: typeof fetch) => recuperarEmailsAutomaticamente(data, {
  enviar: opcoes => executarEmissor(opcoes, { fonte, ambiente, casa, buscar, decorrido: () => 0, esperar: async () => {} }),
  decorrido: () => 0, esperar: async () => {},
});
async function preparar(quantas = 1) {
  await base.db.delete(emailsPorEnviar);
  await base.db.insert(emailsPorEnviar).values(Array.from({ length: quantas }, (_, i) => ({ ...linhaDeEmail(),
    id: `00000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`, criadoEm: new Date(+agora + i),
  })));
}
beforeAll(async () => { base = await baseComPedidos([pedidoDeEmail()]); fonte = criarEmailsBd(base.db); });
afterAll(() => vi.restoreAllMocks());

describe("recuperação horária com Postgres e emissor reais", () => {
  it("uma falha terminal não fica escondida atrás de mais de 100 transitórias", async () => {
    await preparar(102);
    await base.db.update(emailsPorEnviar).set({ tentativas: 1, ultimaTentativaEm: agora, ultimoErro: "resend-503" });
    await base.db.update(emailsPorEnviar).set({ tentativas: 5, ultimoErro: "resend-422" })
      .where(eq(emailsPorEnviar.id, "00000000-0000-4000-8000-000000000103"));
    expect(await haEmailsDefinitivamenteFalhados(base.db, hora(1))).toBe(true);
    await base.db.update(emailsPorEnviar).set({ modelo: "resposta-cliente" })
      .where(eq(emailsPorEnviar.id, "00000000-0000-4000-8000-000000000103"));
    expect(await haEmailsDefinitivamenteFalhados(base.db, hora(1))).toBe(false);
  });
  it("mantém um sinal de intervenção depois de esgotar as tentativas", async () => {
    await preparar();
    expect(await haEmailsDefinitivamenteFalhados(base.db, agora)).toBe(false);
    const reserva = (await fonte.reservarEmail(linhaDeEmail().id, agora))!;
    await fonte.registarFalhaEmail(reserva, "resend-422", true);
    expect(await haEmailsDefinitivamenteFalhados(base.db, hora(1))).toBe(true);
    await recuperar(hora(2), sucesso());
    expect(await haEmailsDefinitivamenteFalhados(base.db, hora(2))).toBe(true);
  });
  it("um email saltado não é uma avaria e uma última reserva ainda ativa também não", async () => {
    await preparar();
    const reserva = (await fonte.reservarEmail(linhaDeEmail().id, agora))!;
    await fonte.registarFalhaEmail(reserva, "saltado: lembrete-sem-espera", true);
    expect(await haEmailsDefinitivamenteFalhados(base.db, hora(1))).toBe(false);
    await preparar();
    await base.db.update(emailsPorEnviar).set({ tentativas: 5, ultimaTentativaEm: agora });
    expect(await haEmailsDefinitivamenteFalhados(base.db, new Date(+agora + 119_999))).toBe(false);
    expect(await haEmailsDefinitivamenteFalhados(base.db, new Date(+agora + 120_000))).toBe(true);
  });
  it("recupera uma linha cujo produtor morreu antes de chamar after", async () => {
    await preparar(); const buscar = sucesso();
    const resumo = await recuperar(hora(1), buscar);
    expect(resumo).toMatchObject({ enviados: 1, falhados: 0, paragem: "sem-trabalho" });
    expect((await base.db.select().from(emailsPorEnviar))[0]).toMatchObject({ enviadoEm: hora(1), tentativas: 1, ultimoErro: null });
    await recuperar(hora(2), buscar); expect(buscar).toHaveBeenCalledTimes(1);
  });
  it("um 503 recupera na hora seguinte, sem nova visita nem mudança de chave", async () => {
    await preparar(); const buscar = sucesso(); buscar.mockResolvedValueOnce(new Response("", { status: 503 }));
    expect(await recuperar(agora, buscar)).toMatchObject({ falhados: 1, paragem: "falha" });
    expect((await base.db.select().from(emailsPorEnviar))[0]).toMatchObject({ tentativas: 1, enviadoEm: null, ultimoErro: "resend-503" });
    expect(await recuperar(hora(1), buscar)).toMatchObject({ enviados: 1, falhados: 0 });
    const [linha] = await base.db.select().from(emailsPorEnviar);
    expect(linha).toMatchObject({ tentativas: 2, enviadoEm: hora(1), ultimoErro: null });
    expect(buscar.mock.calls.map(([, o]) => new Headers(o?.headers).get("Idempotency-Key"))).toEqual([linhaDeEmail().id, linhaDeEmail().id]);
  });
  it("uma reserva abandonada fica recuperável sem a repor artificialmente", async () => {
    await preparar(); const buscar = sucesso();
    await fonte.reservarEmail(linhaDeEmail().id, agora);
    await recuperar(new Date(+agora + 119_999), buscar); expect(buscar).not.toHaveBeenCalled();
    await recuperar(hora(1), buscar);
    expect((await base.db.select().from(emailsPorEnviar))[0]).toMatchObject({ enviadoEm: hora(1), tentativas: 2 });
  });
  it("25 emails escoam em vários lotes, sem a ordem se perder", async () => {
    await preparar(25); const buscar = sucesso();
    expect(await recuperar(hora(1), buscar)).toMatchObject({ enviados: 25, falhados: 0, voltas: 4, paragem: "sem-trabalho" });
    const linhas = await base.db.select().from(emailsPorEnviar);
    expect(linhas.every(l => l.enviadoEm && l.tentativas === 1)).toBe(true);
    expect(buscar.mock.calls.map(([, o]) => new Headers(o?.headers).get("Idempotency-Key")))
      .toEqual(Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`));
  });
  it("duas recuperações sobrepostas não enviam a mesma linha duas vezes", async () => {
    await preparar(); const buscar = sucesso();
    await Promise.all([recuperar(hora(1), buscar), recuperar(hora(1), buscar)]);
    expect(buscar).toHaveBeenCalledTimes(1);
    expect((await base.db.select().from(emailsPorEnviar))[0].tentativas).toBe(1);
  });
  it("cinco horas com falha esgotam as tentativas, sem apagar a linha", async () => {
    await preparar(); const buscar = vi.fn<typeof fetch>().mockRejectedValue(new Error("rede-simulada"));
    for (const n of [0, 1, 2, 3, 4, 5]) await recuperar(hora(n), buscar);
    expect(buscar).toHaveBeenCalledTimes(5);
    expect((await fonte.emailsFalhados(10))[0]).toMatchObject({ tentativas: 5, enviadoEm: null, ultimoErro: "resend-rede" });
  });
  it("não contorna a janela de idempotência quando a tarefa esteve parada mais de 24 h", async () => {
    await preparar(); const buscar = sucesso();
    const reserva = (await fonte.reservarEmail(linhaDeEmail().id, agora))!;
    await fonte.registarFalhaEmail(reserva, "falha-interna", false);
    expect(await recuperar(hora(25), buscar)).toMatchObject({ falhados: 1, enviados: 0 });
    expect(buscar).not.toHaveBeenCalled();
    const [linha] = await base.db.select().from(emailsPorEnviar).where(eq(emailsPorEnviar.id, reserva.id));
    expect(linha).toMatchObject({ tentativas: 5, enviadoEm: null, ultimoErro: "idempotencia-expirada" });
  });
});

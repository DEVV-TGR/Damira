import { describe, expect, it } from "vitest";
import { dadosDoEmail, esperaDaTentativa, MAXIMO_TENTATIVAS, podeTentarEmail } from "./emissor";
import { escreverEmail } from "./modelos";
import { CASA_EXEMPLO } from "./exemplo";
import { MODELOS_EMAIL } from "./tipos";

import { agora, pedidoDeEmail, linhaDeEmail } from "./exemplo-emissor-teste";

describe("dados do emissor", () => {
  it("usa nomes, detalhes, dinheiro e datas gravados sem recalcular", () => {
    const pedido = pedidoDeEmail();
    pedido.totalCent = 3555;
    const dados = dadosDoEmail(pedido, linhaDeEmail(), { agora, modoDeTeste: true });
    expect(dados).toMatchObject({ totalCent: 3555, modoDeTeste: true, expiraEm: pedido.expiraEm,
      levantamentoEm: pedido.levantamentoEm, criadoEm: agora,
      linhas: [{ nome: "Nome guardado", detalhe: "Grande · Baunilha · Nota guardada", precoUnitCent: 1700, totalCent: 3400, aoQuilo: true }] });
  });
  it.each(MODELOS_EMAIL.filter(m => !["resposta-cliente", "reagendado-cliente", "reagendado-loja"].includes(m)))("monta %s e o modelo aceita", modelo => {
    const pedido = { ...pedidoDeEmail(), aceiteEm: agora, canceladoPor: "gerente" as const };
    const dados = dadosDoEmail(pedido, { ...linhaDeEmail(), modelo }, { agora, modoDeTeste: false });
    expect("saltar" in dados).toBe(false);
    if (!("saltar" in dados)) expect(escreverEmail(modelo, dados, CASA_EXEMPLO, "pt").html).toContain("cid:");
  });
  it("não perde preços por orçar e o modelo recusa confirmação incompleta", () => {
    const pedido = pedidoDeEmail();
    pedido.linhas[0].precoUnitarioCent = null; pedido.linhas[0].totalCent = null;
    const dados = dadosDoEmail(pedido, linhaDeEmail(), { agora, modoDeTeste: false });
    expect(dados).toMatchObject({ faltamPrecos: true, linhas: [{ precoUnitCent: null, totalCent: null }] });
    if (!("saltar" in dados)) expect(() => escreverEmail("confirmado-cliente", dados, CASA_EXEMPLO, "pt")).toThrow();
  });
  it.each(["2026-10-24T09:00:00Z", "2027-03-27T10:00:00Z"])("passa instantes gravados através da mudança da hora: %s", iso => {
    const criadoEm = new Date(iso); const expiraEm = new Date(+criadoEm + 48 * 3600000);
    const dados = dadosDoEmail({ ...pedidoDeEmail(), criadoEm, expiraEm, levantamentoEm: expiraEm }, linhaDeEmail(), { agora: criadoEm, modoDeTeste: false });
    expect(dados).toMatchObject({ criadoEm, expiraEm, levantamentoEm: expiraEm });
  });
  it("conserva o recibo por confirmar mesmo depois de confirmado", () => {
    const dados = dadosDoEmail({ ...pedidoDeEmail(), estado: "confirmado", confirmadoEm: agora }, linhaDeEmail(), { agora, modoDeTeste: false });
    expect(dados).toMatchObject({ estado: "por-confirmar" });
  });
  it("salta lembrete depois de mudar o estado", () => {
    expect(dadosDoEmail({ ...pedidoDeEmail(), estado: "confirmado" }, { ...linhaDeEmail(), modelo: "lembrete-loja" }, { agora, modoDeTeste: false })).toEqual({ saltar: "lembrete-sem-espera" });
  });
  it("resposta fica por suportar enquanto não entrar #139", () => {
    expect(() => dadosDoEmail(pedidoDeEmail(), { ...linhaDeEmail(), modelo: "resposta-cliente" }, { agora, modoDeTeste: false })).toThrow("modelo-nao-suportado");
  });
  it("não inventa a hora anterior de um reagendamento", () => {
    const dados = dadosDoEmail(pedidoDeEmail(), linhaDeEmail(), { agora, modoDeTeste: false });
    if (!("saltar" in dados)) expect(() => escreverEmail("reagendado-cliente", dados, CASA_EXEMPLO, "pt")).toThrow("levantamentoAnteriorEm");
  });
});

describe("novas tentativas", () => {
  it("espera crescente, no mínimo a reserva de dois minutos", () => {
    expect([1, 2, 3, 4].map(esperaDaTentativa)).toEqual([120000, 240000, 480000, 960000]);
    const linha = { ...linhaDeEmail(), tentativas: 1, ultimaTentativaEm: agora };
    expect(podeTentarEmail(linha, new Date(+agora + 119999))).toBe(false);
    expect(podeTentarEmail(linha, new Date(+agora + 120000))).toBe(true);
  });
  it("para no máximo e não repete depois das 24 horas do Resend", () => {
    expect(podeTentarEmail({ ...linhaDeEmail(), tentativas: MAXIMO_TENTATIVAS }, agora)).toBe(false);
    expect(podeTentarEmail({ ...linhaDeEmail(), tentativas: 1 }, new Date(+agora + 86400000))).toBe(false);
  });
});

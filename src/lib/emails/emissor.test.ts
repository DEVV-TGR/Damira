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
  it("não inventa a hora anterior de um reagendamento, nem lhe dá a de uma proposta", () => {
    // A hora pedida que a proposta guardou não é a hora de antes de um reagendamento.
    const pedido = { ...pedidoComProposta(), estado: "confirmado" as const, confirmadoEm: agora, aceiteEm: agora };
    const dados = dadosDoEmail(pedido, { ...linhaDeEmail(), modelo: "reagendado-cliente" }, opcoesProposta);
    expect(dados).not.toHaveProperty("levantamentoAnteriorEm");
    if (!("saltar" in dados)) expect(() => escreverEmail("reagendado-cliente", dados, CASA_EXEMPLO, "pt")).toThrow("levantamentoAnteriorEm");
  });
});

/** Um pedido com a segunda versão de uma proposta: preço fixado e hora mudada. */
function pedidoComProposta() {
  const pedido = pedidoDeEmail();
  return {
    ...pedido, estado: "a-aguardar-aceite" as const, propostaVersao: 2, propostaEm: agora,
    expiraEm: new Date(+agora + 24 * 3_600_000),
    levantamentoAnteriorEm: pedido.levantamentoEm, levantamentoEm: new Date("2026-10-27T12:00:00Z"),
    linhas: [{ ...pedido.linhas[0], precoDaProposta: true }],
  };
}
const linhaDaProposta = () => ({ ...linhaDeEmail(), modelo: "resposta-cliente" });
const linkDaProposta = (referencia: string, versao: number) => `https://site.example/pedido/proposta/${referencia}/${versao}-assinatura`;
const opcoesProposta = { agora, modoDeTeste: false, linkDaProposta };

describe("a proposta (T04)", () => {
  it("leva o link da versão em vigor, a hora pedida e os preços fixados agora", () => {
    const pedido = pedidoComProposta();
    const dados = dadosDoEmail(pedido, linhaDaProposta(), opcoesProposta);
    expect(dados).toMatchObject({
      linkAceitar: "https://site.example/pedido/proposta/DAM-2410-AAAA/2-assinatura",
      levantamentoAnteriorEm: pedido.levantamentoAnteriorEm, levantamentoEm: pedido.levantamentoEm,
      expiraEm: pedido.expiraEm, linhas: [{ fixadoAgora: true }],
    });
    if ("saltar" in dados) throw new Error("não devia saltar");
    const { texto } = escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, "pt");
    expect(texto).toContain("https://site.example/pedido/proposta/DAM-2410-AAAA/2-assinatura");
    expect(texto).toContain("em vez das 10h00");
  });
  it("salta a proposta que outra mais nova substituiu: o link dela já não abre", () => {
    const pedido = { ...pedidoComProposta(), propostaEm: new Date(+agora + 60_000) };
    expect(dadosDoEmail(pedido, linhaDaProposta(), opcoesProposta)).toEqual({ saltar: "proposta-substituida" });
  });
  it.each([
    ["aceite", { estado: "confirmado" as const, confirmadoEm: agora, aceiteEm: agora }],
    ["cancelado", { estado: "cancelado" as const, canceladoEm: agora, canceladoPor: "gerente" as const }],
    ["fora do prazo", { expiraEm: agora }],
  ])("salta a proposta que já não espera o aceite: %s", (_, mudanca) => {
    expect(dadosDoEmail({ ...pedidoComProposta(), ...mudanca }, linhaDaProposta(), opcoesProposta))
      .toEqual({ saltar: "proposta-fechada" });
  });
  it("sem quem assine o link, não monta a proposta (falha, não manda um botão vazio)", () => {
    expect(() => dadosDoEmail(pedidoComProposta(), linhaDaProposta(), { agora, modoDeTeste: false })).toThrow();
  });
  it("só a proposta leva a hora pedida; o aceite marca os preços fixados, para a loja", () => {
    const pedido = { ...pedidoComProposta(), estado: "confirmado" as const, confirmadoEm: agora, aceiteEm: agora };
    const dados = dadosDoEmail(pedido, { ...linhaDeEmail(), modelo: "aceite-loja" }, opcoesProposta);
    expect(dados).not.toHaveProperty("levantamentoAnteriorEm");
    expect(dados).not.toHaveProperty("linkAceitar");
    expect(dados).toMatchObject({ linhas: [{ fixadoAgora: true }] });
  });
});

/** Um confirmado que a gerente reagendou agora: a proposta tinha mudado a hora pedida, e o
    reagendamento mudou-a outra vez. São duas horas «de antes» diferentes. */
function pedidoReagendado() {
  const pedido = pedidoComProposta();
  return {
    ...pedido, estado: "confirmado" as const, confirmadoEm: agora, aceiteEm: agora,
    reagendadoEm: agora, reagendadoDe: pedido.levantamentoEm, levantamentoEm: new Date("2026-10-28T15:00:00Z"),
  };
}

describe("o reagendamento (T09 e o aviso à loja)", () => {
  it.each(["reagendado-cliente", "reagendado-loja"])("%s leva a hora de antes do reagendamento, e não a da proposta", modelo => {
    const pedido = pedidoReagendado();
    const dados = dadosDoEmail(pedido, { ...linhaDeEmail(), modelo }, opcoesProposta);
    if ("saltar" in dados) throw new Error("não devia saltar");
    expect(dados.levantamentoAnteriorEm).toEqual(pedido.reagendadoDe);
    expect(dados.levantamentoAnteriorEm).not.toEqual(pedido.levantamentoAnteriorEm);
    expect(dados).not.toHaveProperty("linkAceitar");
    expect(escreverEmail(modelo as "reagendado-cliente", dados, CASA_EXEMPLO, "pt").html).toContain("cid:");
  });
  it("salta o de um reagendamento que outro mais novo ultrapassou", () => {
    const pedido = { ...pedidoReagendado(), reagendadoEm: new Date(+agora + 60_000) };
    expect(dadosDoEmail(pedido, { ...linhaDeEmail(), modelo: "reagendado-cliente" }, opcoesProposta))
      .toEqual({ saltar: "reagendamento-substituido" });
  });
  it.each([
    ["cancelado", { estado: "cancelado" as const, canceladoEm: agora, canceladoPor: "gerente" as const }],
    ["entregue", { estado: "entregue" as const, entregueEm: agora }],
  ])("salta o de um pedido que já não está por levantar: %s", (_, mudanca) => {
    expect(dadosDoEmail({ ...pedidoReagendado(), ...mudanca }, { ...linhaDeEmail(), modelo: "reagendado-loja" }, opcoesProposta))
      .toEqual({ saltar: "reagendamento-fechado" });
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

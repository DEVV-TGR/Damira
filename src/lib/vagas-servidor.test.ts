import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { fonteDeExemplo } from "./dados/exemplo";
import { CONFIGURACAO_JSON, criarFonteJson } from "./dados/json";
import { afluenciaDe, confirmarLevantamento, vagasDoCesto } from "./vagas-servidor";

/* Segunda, 5 de outubro de 2026, às 10h00 de Lisboa. Com a cozinha de exemplo
   (8h–18h) e um kit de festa de 2 dias, o primeiro levantamento é quarta às
   7h00, à abertura da loja. */
const AGORA = new TZDate(2026, 9, 5, 10, 0, "Europe/Lisbon");
const KIT = [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }];

describe("as vagas de um cesto", () => {
  it("sem horário da cozinha nem tempos, o calendário está indisponível — não inventa", async () => {
    expect(await vagasDoCesto(KIT, criarFonteJson(), AGORA)).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("com os dados (aqui, os de exemplo), começam no primeiro levantamento, em hora de Lisboa", async () => {
    const resultado = await vagasDoCesto(KIT, fonteDeExemplo(), AGORA);
    if (!resultado.ok) throw new Error("devia haver vagas");
    expect(resultado.vagas[0]).toEqual({
      inicio: "2026-10-07T06:00:00.000Z",
      data: "2026-10-07",
      hora: "07:00",
      livre: true,
      afluencia: "livre",
    });
    // 30 dias de calendário, de quarta a 4 de novembro
    expect(resultado.vagas.at(-1)?.data).toBe("2026-11-04");
  });

  it("o cesto espera pelo artigo mais lento", async () => {
    /* 24 h de cozinha a partir de segunda às 10h00: 8 h na segunda, 10 h na
       terça, 6 h na quarta — quarta às 14h00, depois do kit (quarta às 7h00). */
    const soCarta = await vagasDoCesto(
      [{ produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 12 }],
      fonteDeExemplo(),
      AGORA,
    );
    const misto = await vagasDoCesto(
      [...KIT, { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 12 }],
      fonteDeExemplo(),
      AGORA,
    );
    expect(soCarta.ok && `${soCarta.vagas[0].data} ${soCarta.vagas[0].hora}`).toBe("2026-10-07 14:00");
    expect(misto.ok && `${misto.vagas[0].data} ${misto.vagas[0].hora}`).toBe("2026-10-07 14:00");
  });

  it("um cesto que não se cota não tem vagas", async () => {
    expect(
      await vagasDoCesto([{ produtoId: "nao-existe", varianteId: "unica", quantidade: 1 }], fonteDeExemplo(), AGORA),
    ).toEqual({ ok: false, motivo: "cesto-invalido" });
    expect(await vagasDoCesto([], fonteDeExemplo(), AGORA)).toEqual({ ok: false, motivo: "cesto-invalido" });
  });

  it("uma vaga cheia continua na lista, riscada", async () => {
    const fonte = fonteDeExemplo({ configuracao: { ...CONFIGURACAO_JSON, limitePorVaga: 1 } });
    await fonte.criarPedido(
      {
        linhas: KIT,
        levantamentoEm: "2026-10-07T06:00:00.000Z",
        cliente: { nome: "Cliente de Teste", email: "teste@example.com" },
        chaveIdempotencia: "4f1b2c3d-1111-4222-8333-444455556666",
        armadilha: "",
      },
      { agora: AGORA, ip: null, contaId: null },
    );
    const resultado = await vagasDoCesto(KIT, fonte, AGORA);
    expect(resultado.ok && resultado.vagas[0]).toMatchObject({ hora: "07:00", livre: false });
    expect(resultado.ok && resultado.vagas[1]).toMatchObject({ hora: "07:30", livre: true });
  });
});

describe("confirmar a hora escolhida, ao enviar", () => {
  it("aceita uma vaga que o calendário mostrou", async () => {
    expect(await confirmarLevantamento(KIT, new Date("2026-10-07T06:00:00Z"), fonteDeExemplo(), AGORA)).toEqual({
      ok: true,
    });
  });

  it("recusa uma hora antes de o kit estar pronto", async () => {
    expect(await confirmarLevantamento(KIT, new Date("2026-10-06T06:00:00Z"), fonteDeExemplo(), AGORA)).toEqual({
      ok: false,
      motivo: "indisponivel",
    });
  });
});

describe("a afluência, em percentagem do limite", () => {
  const casa = { limitePorVaga: 4, limiaresAfluencia: { pouca: 25, media: 50, muita: 75 } };

  it.each([
    [0, "livre"],
    [1, "livre"],
    [2, "pouca"],
    [3, "media"],
  ] as const)("com limite 4, %i pedido(s) é %s", (ocupadas, afluencia) => {
    expect(afluenciaDe(ocupadas, true, casa)).toBe(afluencia);
  });

  it("uma vaga que já não aceita pedidos é cheia", () => {
    expect(afluenciaDe(4, false, casa)).toBe("cheia");
  });

  it("acima do último degrau, e ainda livre, é muita", () => {
    expect(afluenciaDe(7, true, { ...casa, limitePorVaga: 8 })).toBe("muita");
  });

  it("sem limite por vaga não há cores — percentagem de nada não quer dizer nada", () => {
    expect(afluenciaDe(3, true, { ...casa, limitePorVaga: null })).toBeNull();
  });

  it("os degraus vêm da configuração: outra casa, outras cores", () => {
    const exigente = { limitePorVaga: 4, limiaresAfluencia: { pouca: 0, media: 25, muita: 50 } };
    expect(afluenciaDe(1, true, exigente)).toBe("pouca");
  });
});

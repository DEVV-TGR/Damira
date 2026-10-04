import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/* O modo de teste liga-se antes de a fronteira escolher a fonte, que o faz ao
   carregar: é ele que dá ao calendário o horário e os tempos de exemplo. */
vi.hoisted(() => {
  process.env.LOJA_EM_TESTE = "1";
});
vi.mock("next-intl/server", async () => (await import("./traducoes-de-teste")).nextIntlDeTeste);

const { enviarCompra } = await import("./acoes");
const { consultarVagas } = await import("../vagas");

afterAll(() => {
  delete process.env.LOJA_EM_TESTE;
});
beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("o teste não pode mandar emails"); }));
});

const LINHAS = [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1, notas: null }];
const enviar = (campos: Record<string, string>) => {
  const dados = new FormData();
  const base = { linhas: JSON.stringify(LINHAS), nome: "Cliente de Teste", email: "teste@example.com", telefone: "912345678", consentimento: "sim", armadilha: "" };
  for (const [k, v] of Object.entries({ ...base, ...campos })) dados.set(k, v);
  return enviarCompra({ estado: "inicial" }, dados);
};

describe("o calendário na página de compra", () => {
  it("a vaga escolhida chega ao email por extenso, em hora de Lisboa, e a data é a dela", async () => {
    const vagas = await consultarVagas(LINHAS);
    if (!vagas.ok) throw new Error("devia haver vagas");
    const vaga = vagas.vagas.find((v) => v.livre)!;
    const enviado = await enviar({ levantamento: vaga.inicio, data: "2099-01-01" });
    if (enviado.estado !== "sem-servico") throw new Error(`esperava sem-servico, veio ${enviado.estado}`);
    const porExtenso = format(new Date(vaga.inicio), "EEEE, d 'de' MMMM 'às' HH:mm", { in: tz("Europe/Lisbon"), locale: pt });
    expect(enviado.corpo).toContain(`LEVANTAMENTO NA LOJA\n${porExtenso} (hora de Lisboa)`);
    expect(enviado.registo.data).toBe(vaga.data);
  });

  it("em modo de teste, o email avisa logo no topo", async () => {
    const vagas = await consultarVagas(LINHAS);
    if (!vagas.ok) throw new Error("devia haver vagas");
    const enviado = await enviar({ levantamento: vagas.vagas.find((v) => v.livre)!.inicio });
    expect(enviado.estado === "sem-servico" && enviado.corpo.split("\n")[2]).toContain("MODO DE TESTE");
  });

  it("uma hora que não está nas vagas é recusada", async () => {
    expect(await enviar({ levantamento: "2026-10-04T03:00:00.000Z" })).toEqual({
      estado: "erro",
      campos: { data: "Essa hora já não está disponível. Escolha outra." },
    });
  });

  it("um levantamento que não é uma data é recusado em vez de rebentar", async () => {
    expect((await enviar({ levantamento: "amanhã" })).estado).toBe("erro");
  });
});

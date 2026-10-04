import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/* O modo de teste liga-se antes de a fronteira escolher a fonte, que o faz ao
   carregar: é ele que dá ao calendário o horário e os tempos de exemplo. */
vi.hoisted(() => {
  process.env.LOJA_EM_TESTE = "1";
});

vi.mock("next-intl/server", async () => {
  const { default: mensagens } = await import("../../../../messages/pt.json");
  const procurar = (caminho: string): unknown =>
    caminho.split(".").reduce<unknown>((no, chave) => (no as Record<string, unknown>)?.[chave], mensagens);
  return {
    getLocale: async () => "pt",
    getTranslations: async (espaco: string) => (chave: string, valores: Record<string, unknown> = {}) => {
      const texto = procurar(`${espaco}.${chave}`);
      if (typeof texto !== "string") throw new Error(`tradução em falta: ${espaco}.${chave}`);
      return Object.entries(valores).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, String(v)), texto);
    },
  };
});

const { enviarPedido } = await import("./acoes");
const { consultarVagas } = await import("./vagas");

afterAll(() => {
  delete process.env.LOJA_EM_TESTE;
});

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("o teste não pode mandar emails");
    }),
  );
});

const LINHAS = [{ produtoId: "festa-premium", varianteId: "20", quantidade: 1, notas: null }];

const enviar = (campos: Record<string, string>) => {
  const dados = new FormData();
  const base = { tipo: "festa", nome: "Cliente de Teste", email: "teste@example.com", telefone: "", consentimento: "sim", armadilha: "", linhas: JSON.stringify(LINHAS) };
  for (const [k, v] of Object.entries({ ...base, ...campos })) dados.set(k, v);
  return enviarPedido({ estado: "inicial" }, dados);
};

describe("o calendário no formulário", () => {
  it("as vagas vêm do servidor, com data e hora de Lisboa", async () => {
    const resultado = await consultarVagas(LINHAS);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.vagas.length).toBeGreaterThan(0);
    expect(resultado.vagas[0].inicio).toMatch(/Z$/);
  });

  it("a vaga escolhida chega ao email, por extenso e em hora de Lisboa, e a data é a dela", async () => {
    const resultado = await consultarVagas(LINHAS);
    if (!resultado.ok) throw new Error("devia haver vagas");
    const vaga = resultado.vagas.find((v) => v.livre)!;
    // o browser manda uma data qualquer ao lado: conta a da vaga
    const enviado = await enviar({ levantamento: vaga.inicio, data: "2099-01-01" });
    expect(enviado.estado).toBe("sem-servico");
    if (enviado.estado !== "sem-servico") return;
    const lisboa = { in: tz("Europe/Lisbon") };
    const porExtenso = format(new Date(vaga.inicio), "EEEE, d 'de' MMMM 'às' HH:mm", { ...lisboa, locale: pt });
    expect(enviado.corpo).toContain(`Levantamento: ${porExtenso} (hora de Lisboa)`);
    expect(enviado.corpo).toContain(`Data pretendida: ${vaga.data}`);
    expect(enviado.registo.data).toBe(vaga.data);
  });

  it("uma hora que não está nas vagas é recusada, e o pedido não segue", async () => {
    const resultado = await enviar({ levantamento: "2026-10-04T03:00:00.000Z", data: "2026-10-04" });
    expect(resultado).toEqual({
      estado: "erro",
      campos: { data: "Essa hora já não está disponível. Escolha outra." },
    });
  });

  it("um levantamento que não é uma data é recusado em vez de rebentar", async () => {
    expect((await enviar({ levantamento: "amanhã", data: "2026-10-20" })).estado).toBe("erro");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { linhasDoCesto, normalizarCesto } from "@/lib/cesto";
import { formatarCent } from "@/lib/preco";
import { enviarPedido } from "./acoes";

/* As traduções vêm das mensagens portuguesas verdadeiras: um texto que falte
   rebenta aqui, como rebentaria na página. */
vi.mock("next-intl/server", async () => {
  const { default: pt } = await import("../../../../messages/pt.json");
  const procurar = (caminho: string): unknown =>
    caminho.split(".").reduce<unknown>((no, chave) => (no as Record<string, unknown>)?.[chave], pt);
  return {
    getLocale: async () => "pt",
    getTranslations: async (espaco: string) => (chave: string, valores: Record<string, unknown> = {}) => {
      const texto = procurar(`${espaco}.${chave}`);
      if (typeof texto !== "string") throw new Error(`tradução em falta: ${espaco}.${chave}`);
      return Object.entries(valores).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, String(v)), texto);
    },
  };
});

/* ⚠️ Nada aqui manda um email: sem chave, a ação devolve o corpo para o ecrã (o
   caminho «sem serviço»), e um `fetch` que rebenta garante que, se alguém
   puser a chave no ambiente dos testes, o teste falha em vez de enviar. */
beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("o teste não pode mandar emails");
    }),
  );
});

/** Um cesto como o browser o guarda — com os preços que o browser lhe pôs. */
const CESTO = normalizarCesto([
  {
    id: "festa-premium:20",
    produtoId: "festa-premium",
    varianteId: "20",
    nome: "Kit Premium",
    variante: "20 pessoas",
    precoCent: 33500,
    pessoas: 20,
    quantidade: 1,
  },
  {
    id: "ementa:bolo-de-cenoura",
    produtoId: "bolo-de-cenoura",
    varianteId: "unica",
    nome: "Bolo de Cenoura",
    precoCent: 300,
    quantidade: 12,
    minimo: 12,
    passo: 6,
  },
]);

const formulario = (campos: Record<string, string>) => {
  const dados = new FormData();
  const base = {
    tipo: "outro",
    nome: "Cliente de Teste",
    email: "teste@example.com",
    telefone: "",
    data: "2027-01-15",
    consentimento: "sim",
    armadilha: "",
  };
  for (const [chave, valor] of Object.entries({ ...base, ...campos })) dados.set(chave, valor);
  return dados;
};

const enviar = (campos: Record<string, string>) =>
  enviarPedido({ estado: "inicial" }, formulario(campos));

describe("o formulário manda o cesto sem preços", () => {
  it("mesmo com os preços do localStorage adulterados, as linhas não levam nenhum", () => {
    const adulterado = CESTO.map((item) => ({ ...item, precoCent: 1 }));
    const linhas = linhasDoCesto(adulterado);
    expect(linhas).toEqual([
      { produtoId: "festa-premium", varianteId: "20", quantidade: 1, notas: null },
      { produtoId: "bolo-de-cenoura", varianteId: "unica", quantidade: 12, notas: null },
    ]);
    expect(JSON.stringify(linhas)).not.toMatch(/preco/i);
  });
});

describe("enviarPedido escreve o pedido com os preços do servidor", () => {
  it("o cesto adulterado no browser chega ao email com os preços do catálogo", async () => {
    const adulterado = CESTO.map((item) => ({ ...item, precoCent: 1 }));
    const resultado = await enviar({ linhas: JSON.stringify(linhasDoCesto(adulterado)) });

    expect(resultado.estado).toBe("sem-servico");
    if (resultado.estado !== "sem-servico") return;
    expect(resultado.corpo).toContain(`- 1× Kit Premium (20 pessoas) — ${formatarCent(33500, "pt")}`);
    expect(resultado.corpo).toContain(`- 12× Bolo de Cenoura — ${formatarCent(3600, "pt")}`);
    expect(resultado.corpo).toContain(`Estimativa: ${formatarCent(37100, "pt")}`);
    expect(resultado.corpo).not.toContain(formatarCent(13, "pt"));
    // o histórico guarda o número do servidor
    expect(resultado.registo).toMatchObject({ totalCent: 37100, semPreco: 0 });
    expect(resultado.registo.referencia).toMatch(/^DAM-\d{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("as notas livres vão por baixo do cesto", async () => {
    const resultado = await enviar({
      linhas: JSON.stringify(linhasDoCesto(CESTO)),
      notas: "Levantamos depois das 17h.",
    });
    expect(resultado.estado === "sem-servico" && resultado.corpo).toMatch(
      /Estimativa: .*\n\nLevantamos depois das 17h\.$/,
    );
  });

  it("uma linha que traga preço é recusada, e o pedido não segue", async () => {
    const comPreco = linhasDoCesto(CESTO).map((linha) => ({ ...linha, precoCent: 1 }));
    expect(await enviar({ linhas: JSON.stringify(comPreco) })).toEqual({
      estado: "erro",
      campos: { detalhe: expect.stringContaining("Reveja o cesto") },
    });
  });

  it("um artigo que deixou de existir trava o pedido", async () => {
    const linhas = [{ produtoId: "nao-existe", varianteId: "unica", quantidade: 1, notas: null }];
    expect((await enviar({ linhas: JSON.stringify(linhas) })).estado).toBe("erro");
  });

  it("linhas que não são JSON travam o pedido em vez de rebentar", async () => {
    expect((await enviar({ linhas: "{isto não é json" })).estado).toBe("erro");
  });

  it("a armadilha preenchida finge que correu bem, e não escreve nada", async () => {
    expect(await enviar({ linhas: JSON.stringify(linhasDoCesto(CESTO)), armadilha: "x" })).toEqual({
      estado: "enviado",
    });
  });

  it("sem cesto, o pedido é o texto que a pessoa escreveu, como sempre foi", async () => {
    const resultado = await enviar({ detalhe: "Um bolo de chocolate para 10 pessoas." });
    expect(resultado.estado === "sem-servico" && resultado.corpo).toContain(
      "Um bolo de chocolate para 10 pessoas.",
    );
    expect(resultado.estado === "sem-servico" && resultado.registo.totalCent).toBe(0);
  });
});

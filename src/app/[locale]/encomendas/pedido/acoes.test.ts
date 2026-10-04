import { beforeEach, describe, expect, it, vi } from "vitest";
import { linhasDoCesto, normalizarCesto } from "@/lib/cesto";
import { formatarCent } from "@/lib/preco";
import { enviarCompra } from "./acoes";
import { consultarVagas } from "../vagas";

vi.mock("next-intl/server", async () => (await import("./traducoes-de-teste")).nextIntlDeTeste);

/* ⚠️ Nada aqui manda um email: sem chave, a ação devolve o corpo para o ecrã, e
   um `fetch` que rebenta garante que nenhum teste envia, mesmo com a chave no
   ambiente. Sem o modo de teste, não há calendário: a data vem do campo. */
beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("o teste não pode mandar emails"); }));
});

const CESTO = normalizarCesto([
  { id: "festa-premium:20", produtoId: "festa-premium", varianteId: "20", nome: "Kit Premium", variante: "20 pessoas", precoCent: 33500, pessoas: 20, quantidade: 1 },
  { id: "ementa:bolo-de-cenoura", produtoId: "bolo-de-cenoura", varianteId: "unica", nome: "Bolo de Cenoura", precoCent: 300, quantidade: 12, minimo: 12, passo: 6 },
]);

const enviar = (campos: Record<string, string> = {}) => {
  const dados = new FormData();
  const base = {
    linhas: JSON.stringify(linhasDoCesto(CESTO)),
    nome: "Cliente de Teste",
    email: "teste@example.com",
    telefone: "912345678",
    nif: "",
    observacoes: "",
    data: "2099-01-15",
    consentimento: "sim",
    armadilha: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...campos })) dados.set(k, v);
  return enviarCompra({ estado: "inicial" }, dados);
};

const corpoDe = async (campos?: Record<string, string>) => {
  const resultado = await enviar(campos);
  if (resultado.estado !== "sem-servico") throw new Error(`esperava sem-servico, veio ${resultado.estado}`);
  return resultado;
};

describe("o formulário manda o cesto sem preços", () => {
  it("mesmo com os preços do localStorage adulterados, as linhas não levam nenhum", () => {
    const linhas = linhasDoCesto(CESTO.map((item) => ({ ...item, precoCent: 1 })));
    expect(JSON.stringify(linhas)).not.toMatch(/preco/i);
  });
});

describe("enviarCompra: o email por secções, com os preços do servidor", () => {
  it("o cesto adulterado no browser chega ao email com os preços do catálogo", async () => {
    const adulterado = linhasDoCesto(CESTO.map((item) => ({ ...item, precoCent: 1 })));
    const { corpo, registo } = await corpoDe({ linhas: JSON.stringify(adulterado) });
    expect(corpo).toContain(`- 1× Kit Premium (20 pessoas) — ${formatarCent(33500, "pt")}`);
    expect(corpo).toContain(`- 12× Bolo de Cenoura — ${formatarCent(3600, "pt")}`);
    expect(corpo).toContain(`Estimativa: ${formatarCent(37100, "pt")}`);
    expect(registo).toMatchObject({ totalCent: 37100, semPreco: 0, tipo: "outro", pessoas: 20, data: "2099-01-15" });
  });

  it("começa pela referência, e tem as secções todas, pela ordem", async () => {
    const { corpo, registo, assunto } = await corpoDe();
    expect(corpo.split("\n")[0]).toBe(`PEDIDO ${registo.referencia}`);
    const ordem = ["LEVANTAMENTO NA LOJA", "CLIENTE", "O QUE LEVA", "OBSERVAÇÕES", "PAGAMENTO"].map((s) => corpo.indexOf(s));
    expect(ordem.every((pos, i) => pos > 0 && (i === 0 || pos > ordem[i - 1]))).toBe(true);
    expect(assunto).toBe(`Pedido ${registo.referencia} — Cliente de Teste · levantamento 2099-01-15`);
  });

  it("os opcionais vazios escrevem-se «—», e não desaparecem", async () => {
    const { corpo } = await corpoDe();
    expect(corpo).toContain("NIF:       — (não indicado)");
    expect(corpo).toMatch(/OBSERVAÇÕES\n— \(não indicado\)/);
  });

  it("os opcionais preenchidos vão como vieram", async () => {
    const { corpo } = await corpoDe({ nif: "123456789", observacoes: "Sem frutos secos, por favor." });
    expect(corpo).toContain("NIF:       123456789");
    expect(corpo).toMatch(/OBSERVAÇÕES\nSem frutos secos, por favor\./);
  });

  it("sem calendário, a hora fica a combinar", async () => {
    expect((await corpoDe()).corpo).toMatch(/LEVANTAMENTO NA LOJA\n2099-01-15 — hora a combinar com o cliente/);
  });

  it("sem o modo de teste, o email não traz o aviso de teste", async () => {
    expect((await corpoDe()).corpo).not.toContain("MODO DE TESTE");
  });
});

describe("enviarCompra: o que não segue", () => {
  it.each([
    ["email", { email: "" }],
    ["email", { email: "nao-e-um-email" }],
    ["telefone", { telefone: "" }],
    ["nif", { nif: "12345" }],
    ["data", { data: "2020-01-01" }],
    ["consentimento", { consentimento: "" }],
    ["nome", { nome: "A" }],
  ])("sem %s válido, volta com o erro no campo", async (campo, valores) => {
    const resultado = await enviar(valores);
    expect(resultado.estado).toBe("erro");
    expect(resultado.estado === "erro" && Object.keys(resultado.campos)).toContain(campo);
  });

  it("uma linha que traga preço é recusada", async () => {
    const comPreco = linhasDoCesto(CESTO).map((linha) => ({ ...linha, precoCent: 1 }));
    expect(await enviar({ linhas: JSON.stringify(comPreco) })).toEqual({
      estado: "erro",
      campos: { cesto: expect.stringContaining("Reveja o cesto") },
    });
  });

  it("linhas que não são JSON travam o pedido em vez de rebentar", async () => {
    expect((await enviar({ linhas: "{isto não é json" })).estado).toBe("erro");
  });

  it("a armadilha preenchida finge que correu bem, e não escreve nada", async () => {
    expect(await enviar({ armadilha: "x" })).toEqual({ estado: "enviado" });
  });
});

describe("enviarCompra: sem dados da cozinha, a hora é pretendida", () => {
  it("o calendário oferece as horas da loja, e o email diz que a hora é a confirmar", async () => {
    const vagas = await consultarVagas(linhasDoCesto(CESTO));
    if (!vagas.ok) throw new Error("devia haver horas");
    expect(vagas.aConfirmar).toBe(true);
    const vaga = vagas.vagas[3];
    const { corpo, registo } = await corpoDe({ levantamento: vaga.inicio, data: "" });
    expect(corpo).toMatch(/LEVANTAMENTO NA LOJA\n.* \(hora de Lisboa\) — HORA PRETENDIDA, a confirmar com o cliente/);
    expect(registo.data).toBe(vaga.data);
  });
});

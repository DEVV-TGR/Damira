import { describe, expect, it } from "vitest";
import { normalizarCesto } from "@/lib/cesto";
import { emailDaCompraParaLoja } from "./compra";

/* O email da casa enquanto o pedido ainda não fica guardado (`soPorEmail`): o
   modelo `criado-loja`, mas sem as frases que só são verdade com o painel. */

const dados = {
  nome: "Cliente de Teste",
  email: "teste@example.com",
  telefone: "+351912345678",
  pais: "PT",
  nif: "",
  observacoes: "",
  data: "2099-01-15",
  consentimento: true,
} as const;

const KIT = { id: "festa-premium:20", produtoId: "festa-premium", varianteId: "20", nome: "Kit Premium", variante: "20 pessoas", precoCent: 33500, pessoas: 20, quantidade: 1 };
const BOLO = { id: "medida", produtoId: "medida", varianteId: "unica", nome: "Bolo por medida", precoCent: null, quantidade: 1, notas: "Parabéns,\nAna" };

const escrever = (itens: unknown[], aConfirmar = false) =>
  emailDaCompraParaLoja({
    referencia: "DAM-1501-K7Q2",
    criadoEm: new Date("2099-01-10T15:00:00Z"),
    modoDeTeste: false,
    levantamento: new Date("2099-01-15T10:30:00Z"),
    aConfirmar,
    dados,
    itens: normalizarCesto(itens),
  });

describe("emailDaCompraParaLoja", () => {
  it("com tudo certo é «novo» e não «confirmado», e não promete talão nem painel", () => {
    const email = escrever([KIT]);
    if (!email) throw new Error("devia haver email");
    expect(email.assunto).toBe("Pedido DAM-1501-K7Q2 — NOVO · Cliente de Teste · qui 15/1 10:30");
    expect(email.texto).toContain("PEDIDO DAM-1501-K7Q2 — NOVO");
    expect(email.texto).not.toMatch(/talão sai no balcão|CONFIRMADO|Responde-se no painel/);
    expect(email.texto).toContain("Este pedido ainda não fica no painel nem sai talão");
    expect(email.html).toContain("Kit Premium");
  });

  it("sem preço ou com a hora pretendida fica por confirmar, sem prazo de 48 horas", () => {
    for (const email of [escrever([KIT, BOLO]), escrever([KIT], true)]) {
      if (!email) throw new Error("devia haver email");
      expect(email.assunto).toMatch(/^Pedido DAM-1501-K7Q2 — POR CONFIRMAR · Cliente de Teste · qui 15\/1 10:30$/);
      expect(email.texto).toContain("— pretendida");
      expect(email.texto).not.toContain("Responder até");
    }
  });

  it("a mensagem do bolo não se perde: vai no detalhe da linha, numa linha só", () => {
    const email = escrever([KIT, BOLO]);
    expect(email?.texto).toContain("1 × Bolo por medida («Parabéns, Ana») — SEM PREÇO");
  });

  it("sem hora de levantamento não há modelo, e quem chama manda o texto simples", () => {
    expect(
      emailDaCompraParaLoja({
        referencia: "DAM-1501-K7Q2",
        criadoEm: new Date(),
        modoDeTeste: false,
        levantamento: null,
        aConfirmar: false,
        dados,
        itens: normalizarCesto([KIT]),
      }),
    ).toBeNull();
  });
});

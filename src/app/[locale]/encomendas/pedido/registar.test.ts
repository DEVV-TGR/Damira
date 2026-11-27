import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { catalogoDeTeste } from "@/db/teste";
import { loteEmTransacao } from "@/db/lote";
import { emailsPorEnviar, pedidos, produtos, variantes, vagas } from "@/db/esquema";
import { montarFonteBd } from "@/lib/dados/bd";
import { comExemplo } from "@/lib/dados/exemplo";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { enviarCompra } from "./acoes";

const dependencias = vi.hoisted(() => ({
  fonte: null as FonteDeDados | null,
  avisar: vi.fn(),
  enviarDepois: vi.fn(),
  sessao: null as { user: { id: string } } | null,
  modoConta: "demonstracao" as string,
}));
vi.mock("next-intl/server", async () => (await import("./traducoes-de-teste")).nextIntlDeTeste);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.8, 203.0.113.9" }) }));
vi.mock("@/lib/conta", () => ({ get MODO_CONTA() { return dependencias.modoConta; } }));
vi.mock("@/lib/autenticacao", () => ({ auth: async () => dependencias.sessao }));
vi.mock("@/lib/painel-versao", () => ({ avisarQuePedidosMudaram: dependencias.avisar }));
vi.mock("@/lib/emails/depois", () => ({ enviarDepois: dependencias.enviarDepois }));
/* Só se troca o transporte: as regras e as escritas usam Postgres verdadeiro. */
vi.mock("@/lib/dados", () => ({
  criarPedido: (...args: Parameters<FonteDeDados["criarPedido"]>) => dependencias.fonte!.criarPedido(...args),
  configuracaoDaCasa: () => dependencias.fonte!.configuracaoDaCasa(),
  definicoesLoja: () => dependencias.fonte!.definicoesLoja(),
  cotarCesto: (...args: Parameters<FonteDeDados["cotarCesto"]>) => dependencias.fonte!.cotarCesto(...args),
  ocupacao: (...args: Parameters<FonteDeDados["ocupacao"]>) => dependencias.fonte!.ocupacao(...args),
  produtoPorId: (...args: Parameters<FonteDeDados["produtoPorId"]>) => dependencias.fonte!.produtoPorId(...args),
}));

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());
let base: Awaited<ReturnType<typeof modelo.copia>>;
const AGORA = new Date("2026-10-05T09:00:00Z");
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  vi.stubEnv("DATABASE_URL", "base-local-do-teste");
  vi.stubGlobal("fetch", () => { throw new Error("nenhum teste envia emails"); });
  base = await modelo.copia();
  const fonte = montarFonteBd(base.db, loteEmTransacao(base.db), { deTeste: true, leitura: () => vista, relogio: () => new Date() });
  const vista = comExemplo(fonte, { LOJA_EM_TESTE: "1" });
  dependencias.fonte = vista;
  dependencias.avisar.mockReset();
  dependencias.enviarDepois.mockReset();
  dependencias.sessao = null;
  dependencias.modoConta = "demonstracao";
});
afterEach(async () => {
  await base.cliente.close();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function enviar(campos: Record<string, string> = {}) {
  const dados = new FormData();
  for (const [nome, valor] of Object.entries({
    linhas: JSON.stringify([{ produtoId: "festa-premium", varianteId: "20", quantidade: 1 }]),
    levantamento: "2026-10-07T06:30:00Z", data: "2099-01-01",
    nome: "Cliente de Teste", email: "teste@example.com", telefone: "912345678", pais: "PT",
    consentimento: "sim", chaveIdempotencia: "318b63e4-eccf-45d5-bb8b-b92812bf3760", ...campos,
  })) dados.set(nome, valor);
  return enviarCompra({ estado: "inicial" }, dados);
}

describe("o pedido do site na base de dados", () => {
  it("guarda antes de responder e devolve a referência, o dia de Lisboa e o total gravados", async () => {
    const resultado = await enviar({ nif: "123456789", observacoes: "Campainha da porta" });
    expect(resultado).toMatchObject({ estado: "enviado", estadoPedido: "confirmado", registo: { totalCent: 30150, data: "2026-10-07", semPreco: 0 } });
    const [pedido] = await base.db.select().from(pedidos);
    expect(resultado).toMatchObject({ registo: { referencia: pedido.referencia } });
    // Gravado com o desconto da loja: 335,00 € − 33,50 €.
    expect(pedido).toMatchObject({ totalCent: 30150, descontoPercentagem: 10, descontoCent: 3350 });
    expect(pedido).toMatchObject({ estado: "confirmado", clienteTelefone: "+351912345678", clienteNif: "123456789", observacoes: "Campainha da porta", ip: "203.0.113.8", contaId: null, deTeste: true });
    expect(await base.db.select().from(emailsPorEnviar)).toHaveLength(2);
    expect(dependencias.avisar).toHaveBeenCalled();
  });

  it("pede o envio dos emails só depois de o pedido ficar gravado", async () => {
    dependencias.enviarDepois.mockImplementation(async () => {
      expect(await base.db.select().from(emailsPorEnviar)).toHaveLength(2);
    });
    expect(await enviar()).toMatchObject({ estado: "enviado" });
    expect(dependencias.enviarDepois).toHaveBeenCalledTimes(1);
    /* Numa repetição pede outra vez: o emissor só envia o que ainda está pendente. */
    await enviar();
    expect(dependencias.enviarDepois).toHaveBeenCalledTimes(2);
  });

  it("um artigo a confirmar fica por confirmar, sem prometer confirmação", async () => {
    await base.db.update(produtos).set({ pedeConfirmacao: true }).where(eq(produtos.id, "festa-premium"));
    expect(await enviar()).toMatchObject({ estado: "enviado", estadoPedido: "por-confirmar" });
  });

  it("repetir depois de mudar o preço, encher a vaga e pausar mantém a mesma referência e o mesmo total", async () => {
    const primeiro = await enviar();
    await base.db.update(variantes).set({ precoCent: 99900 }).where(eq(variantes.produtoId, "festa-premium"));
    await base.db.update(vagas).set({ limite: 1 }).where(eq(vagas.inicio, new Date("2026-10-07T06:30:00Z")));
    await dependencias.fonte!.pausarLoja(new Date("2026-10-05T12:00:00Z"), { papel: "gerente", agora: AGORA });
    expect(await enviar()).toEqual(primeiro);
    expect(await base.db.select().from(pedidos)).toHaveLength(1);
    expect(await base.db.select().from(emailsPorEnviar)).toHaveLength(2);
    expect((await base.db.select().from(vagas))[0].ocupadas).toBe(1);
  });

  it("repetir um pedido que a loja entretanto cancelou diz o estado de agora, não «confirmado»", async () => {
    await enviar();
    const [gravado] = await base.db.select().from(pedidos);
    expect(await dependencias.fonte!.cancelarPedido(gravado.id, 0, { papel: "gerente", agora: AGORA })).toMatchObject({ ok: true });
    expect(await enviar()).toMatchObject({ estado: "enviado", estadoPedido: "cancelado", registo: { referencia: gravado.referencia } });
    expect(await base.db.select().from(pedidos)).toHaveLength(1);
  });

  it("não aceita preços nem identidade ou IP vindos do formulário", async () => {
    dependencias.modoConta = "fornecedores";
    dependencias.sessao = { user: { id: "pessoa-autenticada" } };
    expect(await enviar({ contaId: "outra-pessoa", ip: "outro-ip" })).toMatchObject({ estado: "enviado" });
    expect((await base.db.select().from(pedidos))[0]).toMatchObject({ contaId: "pessoa-autenticada", ip: "203.0.113.8" });
    expect(await enviar({ chaveIdempotencia: "201367d6-6175-4a11-b501-64230f950b0a", linhas: JSON.stringify([{ produtoId: "festa-premium", varianteId: "20", quantidade: 1, precoCent: 1 }]) })).toMatchObject({ estado: "erro" });
    expect(await base.db.select().from(pedidos)).toHaveLength(1);
  });

  it.each<Record<string, string>>([
    { chaveIdempotencia: "" }, { levantamento: "" }, { levantamento: "nao-e-data" },
    { consentimento: "" }, { email: "invalido" }, { telefone: "811222333" }, { linhas: "{}" },
  ])("recusa dados inválidos sem reservar nem enfileirar: %j", async (campos) => {
    expect(await enviar(campos)).toMatchObject({ estado: "erro" });
    expect(await base.db.select().from(pedidos)).toHaveLength(0);
    expect(await base.db.select().from(emailsPorEnviar)).toHaveLength(0);
    expect(dependencias.enviarDepois).not.toHaveBeenCalled();
  });

  it("a armadilha não grava nada", async () => {
    expect(await enviar({ armadilha: "robô" })).toEqual({ estado: "enviado" });
    expect(await base.db.select().from(pedidos)).toHaveLength(0);
  });

  it("uma falha da base de dados devolve um erro sem expor os dados do erro", async () => {
    vi.spyOn(dependencias.fonte!, "criarPedido").mockRejectedValue(new Error("segredo@example.com"));
    const registo = vi.spyOn(console, "error").mockImplementation(() => {});
    const resultado = await enviar();
    expect(resultado).toMatchObject({ estado: "erro", campos: { geral: expect.any(String) } });
    expect(JSON.stringify(resultado)).not.toContain("segredo");
    expect(JSON.stringify(registo.mock.calls)).not.toContain("segredo");
    expect(dependencias.enviarDepois).not.toHaveBeenCalled();
  });

  it("a falha da invalidação da cache não transforma um pedido gravado num erro", async () => {
    dependencias.avisar.mockImplementation(() => { throw new Error("cache indisponível"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await enviar()).toMatchObject({ estado: "enviado" });
    expect(await base.db.select().from(pedidos)).toHaveLength(1);
  });
});

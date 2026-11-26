import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emailsPorEnviar } from "@/db/esquema";
import { baseComPedidos } from "./fontes-de-teste";
import { criarEmailsBd } from "./bd-emails";
import { executarEmissor } from "@/lib/emails/executar";
import { agora, pedidoDeEmail, linhaDeEmail } from "@/lib/emails/exemplo-emissor-teste";

const ambiente = { VERCEL_ENV: "preview", EMAILS_SO_PARA: "ensaio@example.com", RESEND_API_KEY: "chave-inventada", EMAIL_REMETENTE: "remetente@example.com", LOJA_EM_TESTE: "1" };
const casa = { nome: "Casa", morada: "Rua Exemplo", localidade: "Localidade", telefone: "+351 229 730 939", email: "casa@example.com" };
const mais = (ms: number) => new Date(+agora + ms);
let base: Awaited<ReturnType<typeof baseComPedidos>>;
let fonte: ReturnType<typeof criarEmailsBd>;
const executar = (buscar: typeof fetch, data = agora, env = ambiente, origem = fonte) => executarEmissor({ agora: data, limite: 10 }, {
  fonte: origem, ambiente: env, casa, buscar, esperar: async () => {}, decorrido: () => 0,
});
const sucesso = () => vi.fn<typeof fetch>().mockResolvedValue(new Response('{"id":"inventado"}', { status: 200 }));

beforeAll(async () => { base = await baseComPedidos([pedidoDeEmail()]); fonte = criarEmailsBd(base.db); });
afterAll(() => vi.restoreAllMocks());
async function preparar(extra: Partial<ReturnType<typeof linhaDeEmail>> = {}) {
  await base.db.delete(emailsPorEnviar);
  await base.db.insert(emailsPorEnviar).values({ ...linhaDeEmail(), ...extra });
}

describe("emissor com Postgres", () => {
  it("duas voltas em paralelo só fazem um envio e mantêm destino, anexo e chave", async () => {
    await preparar(); const buscar = sucesso();
    await Promise.all([executar(buscar), executar(buscar)]);
    expect(buscar).toHaveBeenCalledTimes(1);
    const pedido = buscar.mock.calls[0][1]!;
    expect(pedido.headers).toMatchObject({ "Idempotency-Key": linhaDeEmail().id });
    const corpo = JSON.parse(pedido.body as string);
    expect(corpo).toMatchObject({ to: [ambiente.EMAILS_SO_PARA], reply_to: casa.email,
      from: "Confeitaria Damira <remetente@example.com>", attachments: [expect.objectContaining({ content_id: expect.any(String) })] });
    expect(corpo.subject).toContain("pessoa@example.com"); expect(corpo.subject).toContain("[TESTE]");
    const [linha] = await base.db.select().from(emailsPorEnviar);
    expect(linha).toMatchObject({ tentativas: 1, enviadoEm: agora, ultimoErro: null });
    await executar(buscar); expect(buscar).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 503, 429])("%s só repete mais tarde, com a mesma chave", async status => {
    await preparar(); const buscar = sucesso(); buscar.mockResolvedValueOnce(new Response("dados privados", { status }));
    expect(await executar(buscar)).toMatchObject({ falhados: 1 });
    await executar(buscar, mais(119999)); expect(buscar).toHaveBeenCalledTimes(1);
    await executar(buscar, mais(120000)); expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar.mock.calls.map(c => (c[1]!.headers as Record<string, string>)["Idempotency-Key"])).toEqual([linhaDeEmail().id, linhaDeEmail().id]);
  });
  it.each([400, 422])("um %s fica definitivo, distinguível de um saltado", async status => {
    await preparar(); const buscar = vi.fn<typeof fetch>().mockResolvedValue(new Response("email privado", { status }));
    await executar(buscar); await executar(buscar, mais(960000));
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ tentativas: 5, ultimoErro: `resend-${status}`, saltado: false }]);
  });
  it("recupera uma reserva que morreu sem resposta", async () => {
    await preparar(); await fonte.reservarEmail(linhaDeEmail().id, agora);
    const buscar = sucesso(); await executar(buscar, mais(119999)); expect(buscar).not.toHaveBeenCalled();
    await executar(buscar, mais(120000)); expect(buscar).toHaveBeenCalledTimes(1);
  });
  it("um trabalhador antigo não marca nem estraga uma tentativa nova", async () => {
    await preparar(); const antiga = (await fonte.reservarEmail(linhaDeEmail().id, agora))!;
    const nova = await fonte.reservarEmail(antiga.id, mais(120000)); expect(nova?.tentativas).toBe(2);
    await fonte.marcarEmailEnviado(antiga, mais(130000));
    await fonte.registarFalhaEmail(antiga, "resend-400", true);
    expect((await base.db.select().from(emailsPorEnviar))[0]).toMatchObject({ enviadoEm: null, tentativas: 2, ultimoErro: null });
  });
  it("esgota cinco tentativas com espera crescente", async () => {
    await preparar(); const buscar = vi.fn<typeof fetch>().mockRejectedValue(new Error("pessoa@example.com Pessoa Exemplo"));
    for (const ms of [0, 120000, 360000, 840000, 1800000, 4000000]) await executar(buscar, mais(ms));
    expect(buscar).toHaveBeenCalledTimes(5);
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ tentativas: 5, ultimoErro: "resend-rede" }]);
  });
  it("não reenvia uma tentativa incerta depois da validade da idempotência", async () => {
    await preparar({ tentativas: 1, ultimaTentativaEm: agora }); const buscar = sucesso();
    await executar(buscar, mais(86400000)); expect(buscar).not.toHaveBeenCalled();
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "idempotencia-expirada", tentativas: 5 }]);
  });
  it("reavalia o instante da reserva e a janela do Resend ao chegar à linha", async () => {
    await preparar({ tentativas: 1, ultimaTentativaEm: agora });
    const buscar = sucesso();
    await executarEmissor({ agora: mais(86399000), limite: 10 }, {
      fonte, ambiente, casa, buscar, esperar: async () => {}, decorrido: () => 2000,
    });
    expect(buscar).not.toHaveBeenCalled();
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "idempotencia-expirada" }]);
  });
  it("revalida as 24 horas depois de uma leitura lenta, antes do fetch", async () => {
    await preparar({ tentativas: 1, ultimaTentativaEm: agora }); const buscar = sucesso();
    let decorrido = 0;
    const lenta = { ...fonte, pedidoDoEmail: async (id: string) => {
      const pedido = await fonte.pedidoDoEmail(id); decorrido = 2000; return pedido;
    } };
    await executarEmissor({ agora: mais(86399000) }, { fonte: lenta, ambiente, casa, buscar, decorrido: () => decorrido });
    expect(buscar).not.toHaveBeenCalled();
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "idempotencia-expirada" }]);
  });
  it("o limite temporal deixa a fila por tentar e não gasta reservas", async () => {
    await preparar(); const buscar = sucesso();
    await executarEmissor({ agora }, { fonte, ambiente, casa, buscar, decorrido: () => 45000 });
    expect(buscar).not.toHaveBeenCalled();
    expect((await base.db.select().from(emailsPorEnviar))[0].tentativas).toBe(0);
  });
  it("a reserva direta também deixa resposta-cliente sem tentativa", async () => {
    await preparar({ modelo: "resposta-cliente" });
    expect(await fonte.reservarEmail(linhaDeEmail().id, agora)).toBeNull();
    expect((await base.db.select().from(emailsPorEnviar))[0].tentativas).toBe(0);
  });
  it("a confirmação espera pelo recibo inicial reservado ou em backoff", async () => {
    await preparar();
    const posterior = { ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000003", modelo: "confirmado-cliente", criadoEm: mais(1000) };
    await base.db.insert(emailsPorEnviar).values(posterior);
    const recibo = (await fonte.reservarEmail(linhaDeEmail().id, agora))!;
    expect(await fonte.reservarEmail(posterior.id, mais(1000))).toBeNull();
    await fonte.registarFalhaEmail(recibo, "resend-503", false);
    expect(await fonte.reservarEmail(posterior.id, mais(2000))).toBeNull();
    const retoma = (await fonte.reservarEmail(recibo.id, mais(120000)))!;
    await fonte.marcarEmailEnviado(retoma, mais(120000));
    expect(await fonte.reservarEmail(posterior.id, mais(120000))).not.toBeNull();
  });
  it("marca com instante posterior ao de uma linha criada durante a volta", async () => {
    await preparar({ criadoEm: mais(1000) }); const buscar = sucesso();
    expect(await executarEmissor({ agora }, { fonte, ambiente, casa, buscar, decorrido: () => 2000 })).toMatchObject({ enviados: 1 });
    expect((await base.db.select().from(emailsPorEnviar))[0].enviadoEm).toEqual(mais(2000));
  });
  it("usa o remetente de teste existente se EMAIL_REMETENTE estiver ausente", async () => {
    await preparar(); const buscar = sucesso();
    expect(await executar(buscar, agora, { ...ambiente, EMAIL_REMETENTE: "" })).toMatchObject({ enviados: 1 });
    expect(JSON.parse(buscar.mock.calls[0][1]!.body as string).from).toBe("Confeitaria Damira <onboarding@resend.dev>");
  });
  it("não deixa um cancelamento ultrapassar uma confirmação em espera", async () => {
    await preparar({ modelo: "confirmado-cliente", tentativas: 1, ultimaTentativaEm: agora, ultimoErro: "resend-503" });
    const posterior = { ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000003", modelo: "cancelado-cliente", criadoEm: mais(1000) };
    await base.db.insert(emailsPorEnviar).values(posterior);
    expect(await fonte.reservarEmail(posterior.id, mais(2000))).toBeNull();
    expect(await fonte.emailsPendentes({ agora: mais(2000), limite: 10 })).toEqual([]);
  });
  it("linhas à espera não escondem um pedido novo pronto no limite da volta", async () => {
    await preparar({ modelo: "confirmado-cliente", tentativas: 1, ultimaTentativaEm: agora, ultimoErro: "resend-503" });
    const posterior = { ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000003", modelo: "cancelado-cliente", criadoEm: mais(1000) };
    await base.db.insert(emailsPorEnviar).values([posterior, { ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000004", destinatario: "outra-caixa@example.com", criadoEm: mais(2000) }]);
    expect(await fonte.emailsPendentes({ agora: mais(3000), limite: 1 })).toMatchObject([{ destinatario: "outra-caixa@example.com" }]);
  });
  it.each([401, 403, 429])("um %s para a volta e deixa as outras caixas sem tentativas", async status => {
    await preparar();
    await base.db.insert(emailsPorEnviar).values({ ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000003", destinatario: "outra-caixa@example.com" });
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status }));
    await executar(buscar); expect(buscar).toHaveBeenCalledTimes(1);
    const linhas = await base.db.select().from(emailsPorEnviar);
    expect(linhas.map(l => l.tentativas).sort()).toEqual([0, 1]);
  });
  it("não inicia o fetch quando a reserva não cobre os 10 s de timeout e folga", async () => {
    await preparar(); const buscar = sucesso(); let decorrido = 0;
    const lenta = { ...fonte, pedidoDoEmail: async (id: string) => {
      const pedido = await fonte.pedidoDoEmail(id); decorrido = 110000; return pedido;
    } };
    expect(await executarEmissor({ agora }, { fonte: lenta, ambiente, casa, buscar, decorrido: () => decorrido })).toMatchObject({ falhados: 1 });
    expect(buscar).not.toHaveBeenCalled();
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "reserva-expirada" }]);
  });
  it("fora de produção sem caixa segura não consulta nem gasta tentativas", async () => {
    await preparar(); const buscar = sucesso(); const ler = vi.spyOn(fonte, "emailsPendentes");
    await executar(buscar, agora, { ...ambiente, EMAILS_SO_PARA: "" });
    expect(ler).not.toHaveBeenCalled(); expect(buscar).not.toHaveBeenCalled(); ler.mockRestore();
    expect((await base.db.select().from(emailsPorEnviar))[0].tentativas).toBe(0);
  });
  it("produção usa o destinatário gravado e loja responde ao cliente", async () => {
    await preparar({ modelo: "criado-loja", destinatario: "destino-gravado@example.com" }); const buscar = sucesso();
    await executar(buscar, agora, { ...ambiente, VERCEL_ENV: "production", EMAILS_SO_PARA: "" });
    expect(JSON.parse(buscar.mock.calls[0][1]!.body as string)).toMatchObject({ to: ["destino-gravado@example.com"], reply_to: "pessoa@example.com" });
  });
  it("resposta sem #139 fica pendente e não impede o próximo email", async () => {
    await preparar({ modelo: "resposta-cliente" });
    await base.db.insert(emailsPorEnviar).values({ ...linhaDeEmail(), id: "00000000-0000-4000-8000-000000000003" });
    const buscar = sucesso(); await executar(buscar); expect(buscar).toHaveBeenCalledTimes(1);
    expect((await base.db.select().from(emailsPorEnviar).where(eq(emailsPorEnviar.id, linhaDeEmail().id)))[0]).toMatchObject({ enviadoEm: null, tentativas: 0 });
  });
  it("salta lembretes obsoletos e regista modelos sem dados", async () => {
    await preparar({ modelo: "reagendado-cliente" }); const buscar = sucesso(); await executar(buscar);
    expect(buscar).not.toHaveBeenCalled();
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "dados-do-modelo", tentativas: 5 }]);
    await preparar({ modelo: "lembrete-loja" });
    const outraFonte = { ...fonte, pedidoDoEmail: async () => ({ ...pedidoDeEmail(), estado: "confirmado" as const }) };
    expect(await executar(buscar, agora, ambiente, outraFonte)).toMatchObject({ saltados: 1 });
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ ultimoErro: "saltado: lembrete-sem-espera", enviadoEm: null, saltado: true }]);
  });
  it("não lança nem revela dados em erros de rede, chave ou Postgres", async () => {
    await preparar(); const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const buscar = vi.fn<typeof fetch>().mockRejectedValue(new Error("chave-inventada pessoa@example.com Pessoa Exemplo"));
    await expect(executar(buscar)).resolves.toMatchObject({ falhados: 1 });
    await expect(executar(buscar, agora, { ...ambiente, RESEND_API_KEY: "" })).resolves.toMatchObject({ bloqueado: "sem-chave-resend" });
    await expect(executar(buscar, agora, ambiente, { ...fonte, emailsPendentes: async () => { throw { cause: { code: "08006", message: "Pessoa Exemplo pessoa@example.com" } }; } })).resolves.toMatchObject({ falhados: 1 });
    const logs = JSON.stringify(log.mock.calls);
    expect(logs).not.toMatch(/pessoa@example.com|Pessoa Exemplo|chave-inventada/); expect(logs).toContain("08006"); log.mockRestore();
  });
});

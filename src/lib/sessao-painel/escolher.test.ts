import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { definirPinDaEquipa } from "./bd";
import { enviadorDoResend } from "./email-codigo";
import { entradaDoAmbiente } from "./escolher";
import type { LojaDeCookies, OpcoesCookie } from "./tipos";

/**
 * # Que entrada tem o painel, conforme o ambiente
 *
 * Com a `DATABASE_URL`, a verdadeira; sem ela, a provisória. Aqui sem conta
 * nenhuma: a base de dados é um PGlite, e o envio do email é de mentira — o
 * código «enviado» fica guardado no teste.
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

const CTX = { agora: new Date("2026-10-14T09:00:00Z"), ip: "203.0.113.1" };
const PIN = "2468";

function browser() {
  const guardados = new Map<string, { valor: string; opcoes: OpcoesCookie }>();
  const loja: LojaDeCookies = {
    get: (nome) => guardados.get(nome)?.valor,
    set: (nome, valor, opcoes) => void guardados.set(nome, { valor, opcoes }),
    delete: (nome) => void guardados.delete(nome),
  };
  return { guardados, cookies: async () => loja };
}

/* A entrada que o site teria com este ambiente, numa cópia da base de dados. */
async function entrada(ambiente: Record<string, string | undefined>) {
  const { db } = await modelo.copia();
  const emLote = loteEmTransacao(db);
  await definirPinDaEquipa(db, emLote, PIN);
  const enviados: { chave: string; remetente: string; email: string; codigo: string }[] = [];
  const b = browser();
  const sessao = entradaDoAmbiente({
    ambiente,
    cookies: b.cookies,
    dispositivo: async () => null,
    ligarBaseDeDados: () => ({ db, emLote }),
    enviador: (chave, remetente) => async (email, codigo) => void enviados.push({ chave, remetente, email, codigo }),
  });
  return { sessao, enviados, b };
}

const COM_BASE = { DATABASE_URL: "postgres://teste" };

describe("a escolha", () => {
  it("sem base de dados, a provisória, como até aqui", async () => {
    const { sessao } = await entrada({ LOJA_EM_TESTE: "1" });
    expect(sessao.provisoria).toBe(true);
    expect(sessao.ligada).toBe(true);
  });

  it("com base de dados, a verdadeira — mesmo com o modo de teste ligado", async () => {
    const { sessao } = await entrada({ ...COM_BASE, LOJA_EM_TESTE: "1" });
    expect(sessao.provisoria).toBe(false);
    expect(await sessao.entrarComPin(PIN, CTX)).toEqual({ ok: true, papel: "funcionario" });
    /* O PIN público da provisória não abre nada aqui. */
    expect((await sessao.entrarComPin("123456", { ...CTX, ip: "198.51.100.7" })).ok).toBe(false);
  });
});

describe("a verdadeira, com o que o ambiente lhe dá", () => {
  it("com a chave do Resend, o código vai por email, pelo remetente do ambiente", async () => {
    const { sessao, enviados } = await entrada({
      ...COM_BASE,
      EMAILS_GERENTE: "Ana@Example.com, andreia@example.com",
      RESEND_API_KEY: "re_teste",
      EMAIL_REMETENTE: "painel@damira.pt",
    });
    expect(await sessao.pedirCodigo("ana@example.com", CTX)).toEqual({ ok: true });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ chave: "re_teste", remetente: "painel@damira.pt", email: "ana@example.com" });
    expect((await sessao.entrarComCodigo("ana@example.com", enviados[0].codigo, true, CTX)).ok).toBe(true);
  });

  it("sem remetente, o de testes do Resend — que só entrega a quem criou a conta", async () => {
    const { sessao, enviados } = await entrada({ ...COM_BASE, EMAILS_GERENTE: "ana@example.com", RESEND_API_KEY: "re_teste" });
    await sessao.pedirCodigo("ana@example.com", CTX);
    expect(enviados[0].remetente).toBe("onboarding@resend.dev");
  });

  it("sem a chave do Resend, a entrada da gerente não está disponível — e a do PIN funciona", async () => {
    const { sessao } = await entrada({ ...COM_BASE, EMAILS_GERENTE: "ana@example.com" });
    expect(await sessao.pedirCodigo("ana@example.com", CTX)).toEqual({ ok: false, erro: "indisponivel" });
    expect((await sessao.entrarComPin(PIN, CTX)).ok).toBe(true);
  });

  it("sem EMAILS_GERENTE, ninguém é gerente — nem o email da equipa que a provisória usa", async () => {
    const { sessao, enviados } = await entrada({ ...COM_BASE, RESEND_API_KEY: "re_teste" });
    expect(await sessao.pedirCodigo("developerplusteam@gmail.com", CTX)).toEqual({ ok: true });
    expect(enviados).toHaveLength(0);
  });

  it("no ar, os cookies são «secure»; em local não, que o http://localhost não os aceitava", async () => {
    const noAr = await entrada({ ...COM_BASE, NODE_ENV: "production" });
    await noAr.sessao.entrarComPin(PIN, CTX);
    expect(noAr.b.guardados.get("painel_equipa")?.opcoes.secure).toBe(true);

    const local = await entrada({ ...COM_BASE, NODE_ENV: "development" });
    await local.sessao.entrarComPin(PIN, CTX);
    expect(local.b.guardados.get("painel_equipa")?.opcoes.secure).toBe(false);
  });
});

describe("o envio pelo Resend", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("manda o código à gerente, pelo remetente dado, e diz quanto tempo vale", async () => {
    const pedidos: { url: string; corpo: Record<string, unknown>; autorizacao: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      pedidos.push({
        url,
        corpo: JSON.parse(String(init.body)),
        autorizacao: (init.headers as Record<string, string>).Authorization,
      });
      return new Response("{}", { status: 200 });
    });
    await enviadorDoResend("re_teste", "painel@damira.pt")("ana@example.com", "482913");

    expect(pedidos[0].url).toBe("https://api.resend.com/emails");
    expect(pedidos[0].autorizacao).toBe("Bearer re_teste");
    expect(pedidos[0].corpo.to).toEqual(["ana@example.com"]);
    expect(pedidos[0].corpo.from).toContain("painel@damira.pt");
    expect(String(pedidos[0].corpo.text)).toContain("482913");
    expect(String(pedidos[0].corpo.text)).toContain("10 minutos");
  });

  it("se o Resend recusar, rebenta — e a mensagem não leva o email de ninguém", async () => {
    vi.stubGlobal("fetch", async () => new Response('{"to":"ana@example.com"}', { status: 422 }));
    const envio = enviadorDoResend("re_teste", "painel@damira.pt")("ana@example.com", "482913");
    await expect(envio).rejects.toThrow("422");
    await expect(envio).rejects.not.toThrow(/ana@example\.com/);
  });
});

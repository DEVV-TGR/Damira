import { describe, expect, it } from "vitest";
import { criarSessaoProvisoria } from "./provisoria";
import type { LojaDeCookies, OpcoesCookie } from "./tipos";

/*
 * A entrada provisória, com os cookies num `Map` em vez do `next/headers`. A
 * entrada verdadeira (#33) tem regras a mais — tentativas limitadas, sessões
 * revogáveis —, mas estas valem para as duas.
 */

const AGORA = new Date("2026-10-07T09:00:00Z");
const CTX = { agora: AGORA, ip: "203.0.113.1" };
const minutosDepois = (m: number) => ({ ...CTX, agora: new Date(AGORA.getTime() + m * 60_000) });

const LOCAL = {
  NODE_ENV: "development",
  PAINEL_PIN_TESTE: "246810",
  PAINEL_SEGREDO: "um-segredo-com-mais-de-16",
  EMAILS_GERENTE: "Ana@Example.com, andreia@example.com",
};

/* Um browser: os cookies que o servidor grava são os que ele manda a seguir. */
const browser = () => {
  const guardados = new Map<string, { valor: string; opcoes: OpcoesCookie }>();
  const loja: LojaDeCookies = {
    get: (nome) => guardados.get(nome)?.valor,
    set: (nome, valor, opcoes) => void guardados.set(nome, { valor, opcoes }),
    delete: (nome) => void guardados.delete(nome),
  };
  return { guardados, cookies: async () => loja };
};

const criar = (ambiente: Record<string, string | undefined> = LOCAL, b = browser()) => ({
  b,
  sessao: criarSessaoProvisoria({ ambiente, cookies: b.cookies }),
});

describe("quando liga", () => {
  it("em local, com PIN e segredo", () => {
    expect(criar().sessao.ligada).toBe(true);
  });

  it("no ar, só com o modo de teste", async () => {
    const noAr = criar({ ...LOCAL, NODE_ENV: "production" }).sessao;
    expect(noAr.ligada).toBe(false);
    expect(await noAr.entrarComPin("246810", CTX)).toEqual({ ok: false, erro: "indisponivel" });
    expect(criar({ ...LOCAL, NODE_ENV: "production", LOJA_EM_TESTE: "1" }).sessao.ligada).toBe(true);
  });

  it("sem PIN de seis dígitos ou sem um segredo a sério, não liga", () => {
    expect(criar({ ...LOCAL, PAINEL_PIN_TESTE: undefined }).sessao.ligada).toBe(false);
    expect(criar({ ...LOCAL, PAINEL_PIN_TESTE: "1234" }).sessao.ligada).toBe(false);
    expect(criar({ ...LOCAL, PAINEL_SEGREDO: "curto" }).sessao.ligada).toBe(false);
  });
});

describe("a equipa, com o PIN", () => {
  it("o PIN certo abre o balcão e lembra o tablet 30 dias", async () => {
    const { sessao, b } = criar();
    expect(await sessao.entrarComPin("246810", CTX)).toEqual({ ok: true, papel: "funcionario" });
    expect(await sessao.sessaoAtual(AGORA)).toEqual({ papel: "funcionario", desde: AGORA, lembrar: true });
    expect(b.guardados.get("painel_equipa")?.opcoes).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/painel",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("o PIN errado não abre, e um PIN que não são seis dígitos nem é tentado", async () => {
    const { sessao } = criar();
    expect(await sessao.entrarComPin("000000", CTX)).toEqual({ ok: false, erro: "pin-errado" });
    expect(await sessao.entrarComPin("24681", CTX)).toEqual({ ok: false, erro: "dados-invalidos" });
    expect(await sessao.entrarComPin(246810, CTX)).toEqual({ ok: false, erro: "dados-invalidos" });
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });

  it("ao fim de 30 dias, volta a pedir o PIN", async () => {
    const { sessao } = criar();
    await sessao.entrarComPin("246810", CTX);
    expect(await sessao.sessaoAtual(new Date(AGORA.getTime() + 31 * 24 * 60 * 60_000))).toBeNull();
  });
});

describe("um cookie que não foi o servidor a escrever", () => {
  it("adulterado, é como não haver sessão", async () => {
    const { sessao, b } = criar();
    await sessao.entrarComPin("246810", CTX);
    const [, assinatura] = b.guardados.get("painel_equipa")!.valor.split(".");
    const forjado = Buffer.from(JSON.stringify({ p: "gerente", d: AGORA, l: true, x: "2099-01-01" })).toString(
      "base64url",
    );
    b.guardados.set("painel_gerente", { valor: `${forjado}.${assinatura}`, opcoes: b.guardados.get("painel_equipa")!.opcoes });
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("funcionario");
  });

  it("assinado com outro segredo, também", async () => {
    const b = browser();
    await criar(LOCAL, b).sessao.entrarComPin("246810", CTX);
    const outra = criar({ ...LOCAL, PAINEL_SEGREDO: "outro-segredo-com-mais-de-16" }, b).sessao;
    expect(await outra.sessaoAtual(AGORA)).toBeNull();
  });
});

describe("a gerente, com o código", () => {
  it("o código do email da lista abre a gestão, sem contar maiúsculas", async () => {
    const { sessao } = criar();
    const pedido = await sessao.pedirCodigo("ana@example.com", CTX);
    if (!pedido.ok || !pedido.codigoDeTeste) throw new Error("devia haver código");
    expect(await sessao.entrarComCodigo("ANA@example.com", pedido.codigoDeTeste, true, CTX)).toEqual({
      ok: true,
      papel: "gerente",
    });
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("gerente");
  });

  it("um email sem acesso recebe a mesma resposta — e o código não abre nada", async () => {
    const { sessao } = criar();
    const dentro = await sessao.pedirCodigo("ana@example.com", CTX);
    const fora = await sessao.pedirCodigo("intruso@example.com", CTX);
    expect(Object.keys(fora)).toEqual(Object.keys(dentro));
    if (!fora.ok || !fora.codigoDeTeste) throw new Error("devia haver código");
    expect(await sessao.entrarComCodigo("intruso@example.com", fora.codigoDeTeste, true, CTX)).toEqual({
      ok: false,
      erro: "codigo-errado",
    });
  });

  it("o código serve uma vez só, e acaba aos 10 minutos", async () => {
    const { sessao } = criar();
    const primeiro = await sessao.pedirCodigo("ana@example.com", CTX);
    if (!primeiro.ok || !primeiro.codigoDeTeste) throw new Error("devia haver código");
    await sessao.entrarComCodigo("ana@example.com", primeiro.codigoDeTeste, true, CTX);
    await sessao.sair("gerente");
    expect(await sessao.entrarComCodigo("ana@example.com", primeiro.codigoDeTeste, true, CTX)).toMatchObject({
      ok: false,
    });

    const segundo = await sessao.pedirCodigo("ana@example.com", CTX);
    if (!segundo.ok || !segundo.codigoDeTeste) throw new Error("devia haver código");
    expect(await sessao.entrarComCodigo("ana@example.com", segundo.codigoDeTeste, true, minutosDepois(11))).toEqual({
      ok: false,
      erro: "codigo-errado",
    });
  });

  it("um código certo para outro email não serve", async () => {
    const { sessao } = criar();
    const pedido = await sessao.pedirCodigo("ana@example.com", CTX);
    if (!pedido.ok || !pedido.codigoDeTeste) throw new Error("devia haver código");
    expect(await sessao.entrarComCodigo("andreia@example.com", pedido.codigoDeTeste, true, CTX)).toMatchObject({
      ok: false,
    });
  });

  it("sem «lembrar», o cookie acaba com o browser", async () => {
    const { sessao, b } = criar();
    const pedido = await sessao.pedirCodigo("ana@example.com", CTX);
    if (!pedido.ok || !pedido.codigoDeTeste) throw new Error("devia haver código");
    await sessao.entrarComCodigo("ana@example.com", pedido.codigoDeTeste, false, CTX);
    expect(b.guardados.get("painel_gerente")?.opcoes.maxAge).toBeUndefined();
    expect((await sessao.sessaoAtual(AGORA))?.lembrar).toBe(false);
  });
});

describe("sair", () => {
  const comAsDuas = async () => {
    const criado = criar();
    await criado.sessao.entrarComPin("246810", CTX);
    const pedido = await criado.sessao.pedirCodigo("ana@example.com", CTX);
    if (!pedido.ok || !pedido.codigoDeTeste) throw new Error("devia haver código");
    await criado.sessao.entrarComCodigo("ana@example.com", pedido.codigoDeTeste, false, CTX);
    return criado.sessao;
  };

  it("a gerente que sai deixa o tablet no balcão, sem pedir o PIN", async () => {
    const sessao = await comAsDuas();
    expect(await sessao.temSessaoDeEquipa(AGORA)).toBe(true);
    await sessao.sair("gerente");
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("funcionario");
  });

  it("«esquecer este dispositivo» tira as duas", async () => {
    const sessao = await comAsDuas();
    await sessao.sair("dispositivo");
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });
});

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { codigosGerente, sessoesPainel } from "@/db/esquema";
import { loteEmTransacao } from "@/db/lote";
import { catalogoDeTeste } from "@/db/teste";
import { criarSessaoBd, definirPinDaEquipa, descreverDispositivo } from "./bd";
import type { LojaDeCookies, OpcoesCookie } from "./tipos";

/**
 * # A entrada verdadeira no painel (#33)
 *
 * Os mesmos cenários dos testes da entrada provisória (`provisoria.test.ts`) —
 * o PIN, o código da gerente, sair —, mais o que só a verdadeira faz: os
 * limites de tentativas, as sessões na base de dados (renovadas, terminadas à
 * distância) e o PIN que, ao mudar, fecha as sessões da equipa.
 *
 * Cada teste numa cópia limpa da base de dados, com os cookies num `Map` em vez
 * do `next/headers`, e os emails apanhados em vez de enviados.
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

const AGORA = new Date("2026-10-07T09:00:00Z");
const CTX = { agora: AGORA, ip: "203.0.113.1" };
const minutosDepois = (m: number, ip = CTX.ip) => ({ agora: new Date(AGORA.getTime() + m * 60_000), ip });
const diasDepois = (d: number) => new Date(AGORA.getTime() + d * 24 * 60 * 60_000);

const PIN = "246810";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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

/**
 * Uma entrada nova, numa base de dados nova, com o PIN da equipa definido.
 * `semEmail` é não haver serviço de email.
 */
async function criar({ semEmail = false, comPin = true } = {}) {
  const { db } = await modelo.copia();
  const emLote = loteEmTransacao(db);
  if (comPin) await definirPinDaEquipa(db, emLote, PIN);
  const emails: { email: string; codigo: string }[] = [];
  const b = browser();
  const opcoes = {
    db,
    emLote,
    gerentes: ["Ana@Example.com", " andreia@example.com"],
    enviarCodigo: semEmail ? null : async (email: string, codigo: string) => void emails.push({ email, codigo }),
    dispositivo: async () => IPAD,
    producao: true,
  };
  /* Outro dispositivo, na mesma base de dados: o telemóvel da gerente. */
  const outroDispositivo = () => criarSessaoBd({ ...opcoes, cookies: browser().cookies });
  return { db, emLote, b, emails, outroDispositivo, sessao: criarSessaoBd({ ...opcoes, cookies: b.cookies }) };
}

/* O último código que chegou por email a este endereço. */
const ultimoCodigo = (emails: { email: string; codigo: string }[], email: string) =>
  emails.filter((e) => e.email === email).at(-1)?.codigo;

describe("como liga", () => {
  it("é a verdadeira: ligada, e sem aviso de provisória", async () => {
    const { sessao } = await criar();
    expect(sessao.ligada).toBe(true);
    expect(sessao.provisoria).toBe(false);
  });

  it("sem PIN definido, a entrada da equipa ainda não está ligada", async () => {
    const { sessao } = await criar({ comPin: false });
    expect(await sessao.entrarComPin(PIN, CTX)).toEqual({ ok: false, erro: "indisponivel" });
  });

  it("sem serviço de email, a da gerente também não — e o código nunca vai para o ecrã", async () => {
    const { sessao } = await criar({ semEmail: true });
    expect(await sessao.pedirCodigo("ana@example.com", CTX)).toEqual({ ok: false, erro: "indisponivel" });
  });
});

describe("a equipa, com o PIN", () => {
  it("o PIN certo abre o balcão e lembra o tablet; o cookie é só do painel", async () => {
    const { sessao, b } = await criar();
    expect(await sessao.entrarComPin(PIN, CTX)).toEqual({ ok: true, papel: "funcionario" });
    expect(await sessao.sessaoAtual(AGORA)).toEqual({ papel: "funcionario", desde: AGORA, lembrar: true });

    const cookie = b.guardados.get("painel_equipa")!;
    expect(cookie.opcoes).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/painel" });
    expect(cookie.opcoes.maxAge).toBeGreaterThan(0);
  });

  it("o cookie leva um token, e a base de dados só o hash dele", async () => {
    const { sessao, b, db } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    const token = b.guardados.get("painel_equipa")!.valor;
    const [guardada] = await db.select().from(sessoesPainel);
    expect(guardada.tokenHash).not.toBe(token);
    expect(JSON.stringify(guardada)).not.toContain(token);
    expect(guardada.dispositivo).toBe("iPad · Safari");
  });

  it("o PIN errado não abre, e um PIN sem a forma de um PIN nem é tentado", async () => {
    const { sessao } = await criar();
    expect(await sessao.entrarComPin("000000", CTX)).toEqual({ ok: false, erro: "pin-errado" });
    expect(await sessao.entrarComPin("12345", CTX)).toEqual({ ok: false, erro: "dados-invalidos" });
    expect(await sessao.entrarComPin(246810 as unknown as string, CTX)).toEqual({ ok: false, erro: "dados-invalidos" });
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });
});

describe("as tentativas do PIN", () => {
  it("5 erros bloqueiam esse IP — nem o PIN certo entra —, e outro IP não", async () => {
    const { sessao } = await criar();
    for (let i = 0; i < 5; i++) expect((await sessao.entrarComPin("000000", CTX)).ok).toBe(false);
    expect(await sessao.entrarComPin(PIN, CTX)).toEqual({ ok: false, erro: "bloqueado" });
    expect(await sessao.entrarComPin(PIN, minutosDepois(1, "198.51.100.7"))).toEqual({
      ok: true,
      papel: "funcionario",
    });
  });

  it("o bloqueio acaba com a janela de 15 minutos", async () => {
    const { sessao } = await criar();
    for (let i = 0; i < 5; i++) await sessao.entrarComPin("000000", CTX);
    expect((await sessao.entrarComPin(PIN, minutosDepois(14))).ok).toBe(false);
    expect((await sessao.entrarComPin(PIN, minutosDepois(16))).ok).toBe(true);
  });

  it("acertar no PIN volta a contar do zero: os erros eram seguidos", async () => {
    const { sessao } = await criar();
    for (let i = 0; i < 4; i++) await sessao.entrarComPin("000000", CTX);
    expect((await sessao.entrarComPin(PIN, CTX)).ok).toBe(true);
    for (let i = 0; i < 4; i++) await sessao.entrarComPin("000000", CTX);
    expect((await sessao.entrarComPin(PIN, CTX)).ok).toBe(true);
  });

  it("vinte tentativas ao mesmo tempo: só cinco chegam a ser conferidas", async () => {
    const { sessao } = await criar();
    const resultados = await Promise.all(Array.from({ length: 20 }, () => sessao.entrarComPin("000000", CTX)));
    const conferidas = resultados.filter((r) => !r.ok && r.erro === "pin-errado");
    expect(conferidas).toHaveLength(5);
    expect(resultados.filter((r) => !r.ok && r.erro === "bloqueado")).toHaveLength(15);
  });
});

describe("as sessões vivem na base de dados", () => {
  it("lembrado: 30 dias sem uso e volta a pedir o PIN", async () => {
    const { sessao } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    expect(await sessao.sessaoAtual(diasDepois(29))).not.toBeNull();
    expect(await sessao.sessaoAtual(diasDepois(61))).toBeNull();
  });

  it("os 30 dias renovam-se a cada uso: o tablet usado todos os dias nunca volta a pedir o PIN", async () => {
    const { sessao } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    for (let dia = 1; dia <= 90; dia += 20) expect(await sessao.sessaoAtual(diasDepois(dia))).not.toBeNull();
  });

  it("um token que a base de dados não conhece é como não haver sessão", async () => {
    const { sessao, b } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    const cookie = b.guardados.get("painel_equipa")!;
    b.guardados.set("painel_equipa", { ...cookie, valor: `${cookie.valor}x` });
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });

  it("um cookie de equipa no lugar do da gerente não dá a gestão", async () => {
    const { sessao, b } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    b.guardados.set("painel_gerente", b.guardados.get("painel_equipa")!);
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("funcionario");
  });

  it("uma sessão apagada na base de dados termina no dispositivo: é o «revogar o tablet»", async () => {
    const { sessao, db } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    await db.delete(sessoesPainel).where(eq(sessoesPainel.papel, "funcionario"));
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });

  it("mudar o PIN termina todas as sessões da equipa, e só essas", async () => {
    const { sessao, db, emLote, emails } = await criar();
    await sessao.entrarComPin(PIN, CTX);
    await sessao.pedirCodigo("ana@example.com", CTX);
    await sessao.entrarComCodigo("ana@example.com", ultimoCodigo(emails, "ana@example.com")!, true, CTX);

    await definirPinDaEquipa(db, emLote, "1357");
    expect(await sessao.temSessaoDeEquipa(AGORA)).toBe(false);
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("gerente");
    expect((await sessao.entrarComPin(PIN, CTX)).ok).toBe(false);
    expect((await sessao.entrarComPin("1357", CTX)).ok).toBe(true);
  });
});

describe("a gerente, com o código por email", () => {
  it("o código chega por email e abre a gestão, sem contar maiúsculas — e a resposta nunca o traz", async () => {
    const { sessao, emails } = await criar();
    expect(await sessao.pedirCodigo("ANA@example.com", CTX)).toEqual({ ok: true });
    const codigo = ultimoCodigo(emails, "ana@example.com");
    expect(codigo).toMatch(/^\d{6}$/);
    expect(await sessao.entrarComCodigo("Ana@Example.com", codigo!, true, CTX)).toEqual({ ok: true, papel: "gerente" });
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("gerente");
  });

  it("um email sem acesso recebe exatamente a mesma resposta, e não lhe chega nada", async () => {
    const { sessao, emails } = await criar();
    const dentro = await sessao.pedirCodigo("ana@example.com", CTX);
    const fora = await sessao.pedirCodigo("intruso@example.com", CTX);
    expect(fora).toEqual(dentro);
    expect(emails.map((e) => e.email)).toEqual(["ana@example.com"]);
  });

  it("o código guarda-se com hash, nunca em claro", async () => {
    const { sessao, emails, db } = await criar();
    await sessao.pedirCodigo("ana@example.com", CTX);
    const [guardado] = await db.select().from(codigosGerente);
    expect(guardado.codigoHash).not.toContain(ultimoCodigo(emails, "ana@example.com")!);
  });

  it("o código serve uma vez só, e acaba aos 10 minutos", async () => {
    const { sessao, emails } = await criar();
    await sessao.pedirCodigo("ana@example.com", CTX);
    const primeiro = ultimoCodigo(emails, "ana@example.com")!;
    expect((await sessao.entrarComCodigo("ana@example.com", primeiro, true, CTX)).ok).toBe(true);
    await sessao.sair("gerente");
    expect(await sessao.entrarComCodigo("ana@example.com", primeiro, true, CTX)).toEqual({
      ok: false,
      erro: "codigo-errado",
    });

    await sessao.pedirCodigo("ana@example.com", CTX);
    const segundo = ultimoCodigo(emails, "ana@example.com")!;
    expect(await sessao.entrarComCodigo("ana@example.com", segundo, true, minutosDepois(11))).toEqual({
      ok: false,
      erro: "codigo-errado",
    });
  });

  it("um código certo para outro email não serve", async () => {
    const { sessao, emails } = await criar();
    await sessao.pedirCodigo("ana@example.com", CTX);
    const codigo = ultimoCodigo(emails, "ana@example.com")!;
    expect((await sessao.entrarComCodigo("andreia@example.com", codigo, true, CTX)).ok).toBe(false);
  });

  it("5 tentativas erradas e o código deixa de servir, mesmo o certo", async () => {
    const { sessao, emails } = await criar();
    await sessao.pedirCodigo("ana@example.com", CTX);
    const codigo = ultimoCodigo(emails, "ana@example.com")!;
    const errado = codigo === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await sessao.entrarComCodigo("ana@example.com", errado, true, CTX);
    expect(await sessao.entrarComCodigo("ana@example.com", codigo, true, CTX)).toEqual({
      ok: false,
      erro: "codigo-errado",
    });
  });

  it("pedir códigos tem limite por email — e acima dele a resposta continua igual", async () => {
    const { sessao, emails } = await criar();
    const respostas = [];
    for (let i = 0; i < 7; i++) respostas.push(await sessao.pedirCodigo("ana@example.com", CTX));
    expect(respostas.every((r) => r.ok)).toBe(true);
    expect(emails).toHaveLength(5);
  });

  it("sem «lembrar», o cookie acaba com o browser, e a sessão com o dia", async () => {
    const { sessao, b, emails } = await criar();
    await sessao.pedirCodigo("ana@example.com", CTX);
    await sessao.entrarComCodigo("ana@example.com", ultimoCodigo(emails, "ana@example.com")!, false, CTX);
    expect(b.guardados.get("painel_gerente")?.opcoes.maxAge).toBeUndefined();
    expect((await sessao.sessaoAtual(AGORA))?.lembrar).toBe(false);
    expect(await sessao.sessaoAtual(diasDepois(1))).toBeNull();
  });
});

describe("sair", () => {
  const comAsDuas = async () => {
    const criado = await criar();
    await criado.sessao.entrarComPin(PIN, CTX);
    await criado.sessao.pedirCodigo("ana@example.com", CTX);
    await criado.sessao.entrarComCodigo("ana@example.com", ultimoCodigo(criado.emails, "ana@example.com")!, false, CTX);
    return criado;
  };

  it("a gerente que sai deixa o tablet no balcão, sem pedir o PIN", async () => {
    const { sessao } = await comAsDuas();
    expect(await sessao.temSessaoDeEquipa(AGORA)).toBe(true);
    await sessao.sair("gerente");
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("funcionario");
  });

  it("«esquecer este dispositivo» tira as duas", async () => {
    const { sessao } = await comAsDuas();
    await sessao.sair("dispositivo");
    expect(await sessao.sessaoAtual(AGORA)).toBeNull();
  });

  it("sair apaga a sessão na base de dados: um cookie copiado antes deixa de abrir", async () => {
    const { sessao, b, db } = await comAsDuas();
    const copiado = b.guardados.get("painel_gerente")!;
    await sessao.sair("gerente");
    b.guardados.set("painel_gerente", copiado);
    expect((await sessao.sessaoAtual(AGORA))?.papel).toBe("funcionario");
    expect(await db.select().from(sessoesPainel).where(eq(sessoesPainel.papel, "gerente"))).toHaveLength(0);
  });
});

describe("o dispositivo, como a gerente o vê", () => {
  it.each([
    [IPAD, "iPad · Safari"],
    ["Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36", "Tablet Android · Chrome"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "iPhone · Safari"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0", "Windows · Edge"],
    [null, null],
  ])("%s", (userAgent, esperado) => {
    expect(descreverDispositivo(userAgent)).toBe(esperado);
  });
});

import { count, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { criarSessaoBd } from "@/lib/sessao-painel/bd";
import type { LojaDeCookies } from "@/lib/sessao-painel/tipos";
import { comandoComparar, comandoImportar, comandoMigrar, comandoPin, descreverAlvo, type Conversa } from "./comandos";
import { casa, produtos, sessoesPainel } from "./esquema";
import { loteEmTransacao } from "./lote";
import { baseDeTeste, catalogoDeTeste } from "./teste";

/**
 * Os comandos que correm na Neon (`scripts/bd.ts`), aqui num PGlite e com as
 * respostas do terminal escritas de antemão: o «sim», o «não», o PIN.
 */

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

const ALVO = "teste";

/* Um terminal de mentira: responde pela ordem, e guarda o que lhe escrevem. */
function terminal(...respostas: string[]) {
  const escrito: string[] = [];
  const perguntas: string[] = [];
  const responder = async (pergunta: string) => {
    perguntas.push(pergunta);
    return respostas.shift() ?? "";
  };
  const conversa: Conversa = {
    escrever: (texto) => void escrito.push(texto),
    perguntar: responder,
    perguntarEscondido: responder,
  };
  return { conversa, escrito, perguntas, texto: () => escrito.join("\n") };
}

describe("o endereço mostrado antes de confirmar", () => {
  it("mostra o servidor e a base de dados, e nunca a palavra-passe", () => {
    const endereco = "postgresql://damira_owner:pa55-secreta@ep-cool-rain-123.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    expect(descreverAlvo(endereco)).toBe("ep-cool-rain-123.eu-central-1.aws.neon.tech / neondb");
    expect(descreverAlvo(endereco)).not.toContain("pa55-secreta");
    expect(descreverAlvo("isto não é um endereço")).toBe("(endereço que não se percebe)");
  });
});

describe("bd:migrar", () => {
  it("sem «sim», não aplica nada", async () => {
    let aplicadas = false;
    const t = terminal("não");
    expect(await comandoMigrar({ alvo: ALVO, conversa: t.conversa, aplicarMigracoes: async () => void (aplicadas = true) })).toBe(1);
    expect(aplicadas).toBe(false);
    expect(t.texto()).toContain("Cancelado");
  });

  it("com «sim», aplica — e diz onde antes de perguntar", async () => {
    let aplicadas = false;
    const t = terminal("sim");
    expect(await comandoMigrar({ alvo: ALVO, conversa: t.conversa, aplicarMigracoes: async () => void (aplicadas = true) })).toBe(0);
    expect(aplicadas).toBe(true);
    /* O endereço vem antes da pergunta: lê-se, e só depois se responde. */
    expect(t.escrito[0].trim()).toBe(`Base de dados: ${ALVO}`);
  });
});

describe("bd:importar", () => {
  it("sem «sim», a base de dados fica vazia", async () => {
    const { db, cliente } = await baseDeTeste();
    try {
      expect(await comandoImportar({ db, alvo: ALVO, conversa: terminal("nao").conversa })).toBe(1);
      expect((await db.select({ n: count() }).from(produtos))[0].n).toBe(0);
    } finally {
      await cliente.close();
    }
  });

  it("com «sim», importa e acaba com 0 diferenças", async () => {
    const { db, cliente } = await baseDeTeste();
    try {
      const t = terminal("sim");
      expect(await comandoImportar({ db, alvo: ALVO, conversa: t.conversa })).toBe(0);
      expect(t.texto()).toContain("Importados 107 produtos");
      expect(t.texto()).toContain("0 diferenças");
    } finally {
      await cliente.close();
    }
  });

  it("numa base de dados com produtos, recusa-se — e nem pergunta", async () => {
    const { db } = await modelo.copia();
    const t = terminal("sim");
    expect(await comandoImportar({ db, alvo: ALVO, conversa: t.conversa })).toBe(1);
    expect(t.perguntas).toHaveLength(0);
    expect(t.texto()).toContain("só corre sobre uma base de dados vazia");
  });
});

describe("bd:comparar", () => {
  it("só lê: não pergunta nada, e dá 0 diferenças depois da importação", async () => {
    const { db } = await modelo.copia();
    const t = terminal();
    expect(await comandoComparar({ db, conversa: t.conversa })).toBe(0);
    expect(t.perguntas).toHaveLength(0);
  });

  it("lista as diferenças, se as houver", async () => {
    const { db } = await modelo.copia();
    await db.update(produtos).set({ nomePt: "Outro nome" }).where(eq(produtos.id, "festa-premium"));
    const t = terminal();
    expect(await comandoComparar({ db, conversa: t.conversa })).toBe(1);
    expect(t.texto()).toContain("festa-premium.nome");
  });
});

describe("painel:pin", () => {
  /* Um tablet com o PIN já definido e sessão aberta. */
  async function comTablet(db: Awaited<ReturnType<typeof modelo.copia>>["db"], pin: string) {
    const guardados = new Map<string, string>();
    const cookies: LojaDeCookies = {
      get: (nome) => guardados.get(nome),
      set: (nome, valor) => void guardados.set(nome, valor),
      delete: (nome) => void guardados.delete(nome),
    };
    const sessao = criarSessaoBd({
      db,
      emLote: loteEmTransacao(db),
      cookies: async () => cookies,
      gerentes: [],
      enviarCodigo: null,
      producao: false,
    });
    await comandoPin({ db, emLote: loteEmTransacao(db), alvo: ALVO, conversa: terminal("sim", pin, pin).conversa });
    await sessao.entrarComPin(pin, { agora: new Date(), ip: "203.0.113.1" });
    return sessao;
  }

  it("define o PIN, que passa a abrir o balcão, e fecha as sessões da equipa que havia", async () => {
    const { db } = await modelo.copia();
    const sessao = await comTablet(db, "1357");
    expect(await sessao.temSessaoDeEquipa(new Date())).toBe(true);

    const t = terminal("sim", "246810", "246810");
    expect(await comandoPin({ db, emLote: loteEmTransacao(db), alvo: ALVO, conversa: t.conversa })).toBe(0);
    expect(await sessao.temSessaoDeEquipa(new Date())).toBe(false);
    expect((await sessao.entrarComPin("246810", { agora: new Date(), ip: "198.51.100.7" })).ok).toBe(true);
  });

  it.each([
    ["sem «sim»", ["nao"], "Cancelado"],
    ["com 5 dígitos", ["sim", "12345"], "4 ou 6 dígitos"],
    ["com letras", ["sim", "12ab56"], "4 ou 6 dígitos"],
    ["com os dois diferentes", ["sim", "246810", "135790"], "não são iguais"],
  ])("%s, não muda nada", async (_, respostas, aviso) => {
    const { db } = await modelo.copia();
    const t = terminal(...respostas);
    expect(await comandoPin({ db, emLote: loteEmTransacao(db), alvo: ALVO, conversa: t.conversa })).toBe(1);
    expect(t.texto()).toContain(aviso);
    expect((await db.select({ pin: casa.pinEquipaHash }).from(casa))[0].pin).toBeNull();
  });

  it("o PIN pede-se escondido, duas vezes, e nunca aparece no que se escreve", async () => {
    const { db } = await modelo.copia();
    const t = terminal("sim", "246810", "246810");
    await comandoPin({ db, emLote: loteEmTransacao(db), alvo: ALVO, conversa: t.conversa });
    expect(t.perguntas).toHaveLength(3);
    expect(t.texto()).not.toContain("246810");
  });

  it("sem a casa importada, diz o que falta e não pergunta nada", async () => {
    const { db, cliente } = await baseDeTeste();
    try {
      const t = terminal("sim", "246810", "246810");
      expect(await comandoPin({ db, emLote: loteEmTransacao(db), alvo: ALVO, conversa: t.conversa })).toBe(1);
      expect(t.perguntas).toHaveLength(0);
      expect(t.texto()).toContain("bd:importar");
      expect(await db.select().from(sessoesPainel)).toHaveLength(0);
    } finally {
      await cliente.close();
    }
  });
});

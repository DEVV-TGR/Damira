import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { casa, codigosGerente, limites, sessoesPainel } from "@/db/esquema";
import type { ExecutarLote } from "@/db/lote";
import type { Papel } from "@/lib/dados/tipos";
import type { FonteSessao, LojaDeCookies, OpcoesCookie, SessaoListada, SessaoPainel } from "./tipos";

/**
 * # A entrada verdadeira no painel (#33)
 *
 * A mesma `FonteSessao` que a entrada provisória (`provisoria.ts`), com a base
 * de dados do outro lado. As regras são as do `painel.md`; o porquê de cada
 * tabela está em `docs/loja/base-de-dados.md` › A entrada no painel.
 *
 * - **O PIN da equipa** guarda-se com *hash* lento, e cada IP tem 5 tentativas
 *   por janela de 15 minutos — contadas **antes** de o PIN ser conferido (ver
 *   `tentativa`).
 * - **O código da gerente** vai por email, vale 10 minutos, serve uma vez, e
 *   deixa de servir ao fim de 5 tentativas erradas.
 * - **As sessões vivem na base de dados.** O cookie leva um token aleatório; a
 *   base de dados guarda o *hash* dele e decide até quando vale.
 *
 * ⚠️ **Nunca devolve o `codigoDeTeste`.** O código vai por email ou não vai: sem
 * serviço de email, a entrada da gerente diz que não está disponível, e nunca
 * mostra o código no ecrã.
 *
 * Ainda não está ligada ao site: liga-se no `index.ts` quando houver Neon e
 * Resend (`docs/loja/ligar-a-neon.md` › 8).
 */

const COOKIE_EQUIPA = "painel_equipa";
const COOKIE_GERENTE = "painel_gerente";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Lembrado: 30 dias, renovados a cada uso (`painel.md` › Lembrar o dispositivo). */
const LEMBRADO_MS = 30 * DIA;
/* Sem «lembrar», o cookie acaba com o browser; e no servidor ao fim de um dia de
   trabalho, para um browser que nunca se fecha não ser «lembrar» às escondidas. */
const SEM_LEMBRAR_MS = 14 * HORA;
/* O cookie de uma sessão lembrada dura o máximo que os browsers aceitam: quem
   decide se ainda vale é o `expira_em`, que se renova sem reescrever o cookie
   (o Next não deixa escrever cookies ao desenhar uma página). */
const COOKIE_LEMBRADO_S = 400 * 24 * 60 * 60;
/* Renovar a cada uso, mas não a cada clique: uma escrita por hora chega, e a
   base de dados não é acordada sem necessidade (regra 6). */
const RENOVAR_DEPOIS_DE_MS = HORA;

/* O id de uma sessão é um uuid. Um que não tenha essa forma vem de um browser a
   inventar, e a coluna `uuid` rebentava com ele em vez de dizer que não existe. */
const FORMATO_DO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* O que a gerente vê quando o browser não se reconheceu (`descreverDispositivo`). */
const APARELHO_DESCONHECIDO = "Aparelho desconhecido";

/* 4 ou 6 dígitos: a casa escolhe (#25). Ao entrar e ao definir, o mesmo. */
const FORMATO_DO_PIN = /^(\d{4}|\d{6})$/;

const CODIGO_MS = 10 * MINUTO;
const TENTATIVAS_POR_CODIGO = 5;

/* Os limites (`robustez.md` › Limites): quantas, em que janela. */
const LIMITES = {
  pin: { maximo: 5, janela: 15 * MINUTO },
  entrarComCodigo: { maximo: 10, janela: 15 * MINUTO },
  codigosPorEmail: { maximo: 5, janela: HORA },
  codigosPorIp: { maximo: 20, janela: HORA },
} as const;

// ——— Hashes ———

/** O token da sessão é aleatório e comprido: chega-lhe um hash rápido. */
const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

const scryptAsync = (segredo: string, sal: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(segredo, sal, 32, (erro, chave) => (erro ? reject(erro) : resolve(chave))),
  );

/**
 * O PIN e o código são poucos dígitos — um milhão de combinações, ou dez mil.
 * Com um hash rápido, quem tivesse a base de dados adivinhava-os em segundos;
 * o `scrypt` é lento de propósito.
 */
export async function hashLento(segredo: string): Promise<string> {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("base64url")}$${(await scryptAsync(segredo, sal)).toString("base64url")}`;
}

async function confere(segredo: string, guardado: string): Promise<boolean> {
  const [tipo, sal, hash] = guardado.split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  const calculado = await scryptAsync(segredo, Buffer.from(sal, "base64url"));
  const esperado = Buffer.from(hash, "base64url");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

// ——— O dispositivo ———

/**
 * O que a gerente vê na lista de sessões: «iPad · Safari». Só o tipo de
 * aparelho e o browser — nunca o IP nem o texto inteiro do browser, que não lhe
 * dizem nada e são dados a mais.
 */
export function descreverDispositivo(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const aparelho = /iPad/.test(userAgent)
    ? "iPad"
    : /iPhone/.test(userAgent)
      ? "iPhone"
      : /Android/.test(userAgent)
        ? /Mobile/.test(userAgent)
          ? "Telemóvel Android"
          : "Tablet Android"
        : /Macintosh/.test(userAgent)
          ? "Mac"
          : /Windows/.test(userAgent)
            ? "Windows"
            : null;
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null;
  const partes = [aparelho, browser].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

// ——— A fonte ———

export type OpcoesSessaoBd = {
  db: BaseDeDados;
  emLote: ExecutarLote;
  cookies: () => Promise<LojaDeCookies>;
  /** Os emails de `EMAILS_GERENTE`, em minúsculas. Mudar a lista pede um deploy. */
  gerentes: readonly string[];
  /**
   * Manda o código por email. `null` é não haver serviço de email: a entrada da
   * gerente fica indisponível — o código nunca vai para o ecrã.
   */
  enviarCodigo: ((email: string, codigo: string) => Promise<void>) | null;
  /** O texto do browser, para a lista de sessões da gerente. */
  dispositivo?: () => Promise<string | null>;
  /** Cookies `secure` no ar; em local, `http://localhost` não os aceitava. */
  producao: boolean;
};

export function criarSessaoBd(opcoes: OpcoesSessaoBd): FonteSessao {
  const { db, emLote, cookies, enviarCodigo } = opcoes;
  const gerentes = new Set(opcoes.gerentes.map((email) => email.trim().toLowerCase()));

  const opcoesCookie = (maxAge?: number): OpcoesCookie => ({
    httpOnly: true,
    secure: opcoes.producao,
    sameSite: "strict",
    path: "/painel",
    ...(maxAge === undefined ? {} : { maxAge }),
  });

  /**
   * ⚠️ **Conta a tentativa antes de a fazer.** «Ver se está bloqueado, tentar,
   * e contar o erro» deixava passar cem tentativas mandadas ao mesmo tempo —
   * todas viam o contador a zero. Aqui cada uma soma-se numa instrução só e
   * recebe o seu número: só as primeiras `maximo` chegam a ser conferidas.
   *
   * As janelas são fixas (dos 10h00 às 10h15, por exemplo): o bloqueio dura até
   * ao fim da janela em que se passou o limite.
   */
  const tentativa = async (chave: string, { maximo, janela }: { maximo: number; janela: number }, agora: Date) => {
    const inicio = new Date(Math.floor(agora.getTime() / janela) * janela);
    const [{ contagem }] = await db
      .insert(limites)
      .values({ chave, janela: inicio, contagem: 1 })
      .onConflictDoUpdate({ target: [limites.chave, limites.janela], set: { contagem: sql`${limites.contagem} + 1` } })
      .returning({ contagem: limites.contagem });
    return contagem <= maximo;
  };

  /* O que já não serve a ninguém: limites e códigos de ontem, sessões expiradas.
     Corre quando alguém entra — com a base de dados já acordada. */
  const limpar = (agora: Date) => {
    const ontem = new Date(agora.getTime() - DIA);
    return emLote((d) => [
      d.delete(limites).where(lt(limites.janela, ontem)),
      d.delete(codigosGerente).where(lt(codigosGerente.expiraEm, ontem)),
      d.delete(sessoesPainel).where(lt(sessoesPainel.expiraEm, agora)),
    ]);
  };

  const abrirSessao = async (papel: Papel, lembrar: boolean, agora: Date) => {
    const token = randomBytes(32).toString("base64url");
    await db.insert(sessoesPainel).values({
      tokenHash: hashDoToken(token),
      papel,
      lembrar,
      dispositivo: descreverDispositivo((await opcoes.dispositivo?.()) ?? null),
      criadaEm: agora,
      ultimoUsoEm: agora,
      expiraEm: new Date(agora.getTime() + (lembrar ? LEMBRADO_MS : SEM_LEMBRAR_MS)),
    });
    const nome = papel === "gerente" ? COOKIE_GERENTE : COOKIE_EQUIPA;
    (await cookies()).set(nome, token, opcoesCookie(lembrar ? COOKIE_LEMBRADO_S : undefined));
  };

  /** A sessão deste cookie, se ainda valer. Renova-a, se for altura. */
  const lerSessao = async (token: string | undefined, papel: Papel, agora: Date): Promise<SessaoPainel | null> => {
    if (!token) return null;
    const [sessao] = await db
      .select()
      .from(sessoesPainel)
      .where(
        and(
          eq(sessoesPainel.tokenHash, hashDoToken(token)),
          eq(sessoesPainel.papel, papel),
          gt(sessoesPainel.expiraEm, agora),
        ),
      );
    if (!sessao) return null;

    if (agora.getTime() - sessao.ultimoUsoEm.getTime() > RENOVAR_DEPOIS_DE_MS) {
      await db
        .update(sessoesPainel)
        .set({
          ultimoUsoEm: agora,
          /* Lembrado: 30 dias a contar de agora. Sem lembrar, o fim não mexe. */
          ...(sessao.lembrar ? { expiraEm: new Date(agora.getTime() + LEMBRADO_MS) } : {}),
        })
        .where(eq(sessoesPainel.id, sessao.id));
    }
    return { papel: sessao.papel as Papel, desde: sessao.criadaEm, lembrar: sessao.lembrar };
  };

  return {
    ligada: true,
    provisoria: false,

    async sessaoAtual(agora) {
      const loja = await cookies();
      return (
        (await lerSessao(loja.get(COOKIE_GERENTE), "gerente", agora)) ??
        (await lerSessao(loja.get(COOKIE_EQUIPA), "funcionario", agora))
      );
    },

    async temSessaoDeEquipa(agora) {
      return (await lerSessao((await cookies()).get(COOKIE_EQUIPA), "funcionario", agora)) !== null;
    },

    async entrarComPin(pin, { agora, ip }) {
      /* Um PIN que nem tem a forma de um PIN não é uma tentativa. */
      if (typeof pin !== "string" || !FORMATO_DO_PIN.test(pin)) return { ok: false, erro: "dados-invalidos" };
      const [linha] = await db.select({ pin: casa.pinEquipaHash }).from(casa).where(eq(casa.id, 1));
      /* Sem PIN definido, a entrada da equipa ainda não está ligada. */
      if (!linha?.pin) return { ok: false, erro: "indisponivel" };

      const chave = `pin:${ip ?? "sem-ip"}`;
      if (!(await tentativa(chave, LIMITES.pin, agora))) return { ok: false, erro: "bloqueado" };
      if (!(await confere(pin, linha.pin))) return { ok: false, erro: "pin-errado" };

      /* Acertou: os erros eram seguidos, e deixam de contar. */
      await db.delete(limites).where(eq(limites.chave, chave));
      await limpar(agora);
      await abrirSessao("funcionario", true, agora);
      return { ok: true, papel: "funcionario" };
    },

    async pedirCodigo(entrada, { agora, ip }) {
      if (!enviarCodigo) return { ok: false, erro: "indisponivel" };
      if (typeof entrada !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entrada.trim())) {
        return { ok: false, erro: "dados-invalidos" };
      }
      const email = entrada.trim().toLowerCase();

      /* ⚠️ A mesma resposta em todos os casos — com acesso, sem acesso, acima do
         limite (`painel.md`): o formulário não pode servir para descobrir quem é
         gerente. Os limites contam para todos os emails por igual.

         O que **não** é igual é o tempo: para a gerente gera-se o código e manda-
         se o email, e demora mais. Medir isso pede muitas tentativas, que o
         limite por IP torna lentas, e a lista é só o email da gerente. Se um dia
         importar, o envio passa para depois da resposta (`after` do Next). */
      const dentroDosLimites =
        (await tentativa(`codigo-envio-ip:${ip ?? "sem-ip"}`, LIMITES.codigosPorIp, agora)) &&
        (await tentativa(`codigo-envio:${email}`, LIMITES.codigosPorEmail, agora));
      if (!dentroDosLimites || !gerentes.has(email)) return { ok: true };

      const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await db.insert(codigosGerente).values({
        email,
        codigoHash: await hashLento(codigo),
        criadoEm: agora,
        expiraEm: new Date(agora.getTime() + CODIGO_MS),
      });
      await limpar(agora);
      try {
        await enviarCodigo(email, codigo);
      } catch (erro) {
        /* Um email que falha não muda a resposta; fica no registo do servidor,
           sem o email da gerente (`robustez.md` › Logs). */
        console.error("[painel] o código da gerente não foi enviado:", erro);
      }
      return { ok: true };
    },

    async entrarComCodigo(emailEntrada, codigoEntrada, lembrar, { agora, ip }) {
      if (typeof emailEntrada !== "string" || typeof codigoEntrada !== "string" || !/^\d{6}$/.test(codigoEntrada)) {
        return { ok: false, erro: "dados-invalidos" };
      }
      if (typeof lembrar !== "boolean") return { ok: false, erro: "dados-invalidos" };
      const email = emailEntrada.trim().toLowerCase();

      if (!(await tentativa(`codigo-entrada:${ip ?? "sem-ip"}`, LIMITES.entrarComCodigo, agora))) {
        return { ok: false, erro: "bloqueado" };
      }
      if (!gerentes.has(email)) return { ok: false, erro: "codigo-errado" };

      /* O código mais recente deste email que ainda pode servir. */
      const [guardado] = await db
        .select()
        .from(codigosGerente)
        .where(
          and(
            eq(codigosGerente.email, email),
            isNull(codigosGerente.usadoEm),
            gt(codigosGerente.expiraEm, agora),
            lt(codigosGerente.tentativas, TENTATIVAS_POR_CODIGO),
          ),
        )
        .orderBy(desc(codigosGerente.criadoEm))
        .limit(1);
      if (!guardado) return { ok: false, erro: "codigo-errado" };

      if (!(await confere(codigoEntrada, guardado.codigoHash))) {
        await db
          .update(codigosGerente)
          .set({ tentativas: sql`${codigosGerente.tentativas} + 1` })
          .where(eq(codigosGerente.id, guardado.id));
        return { ok: false, erro: "codigo-errado" };
      }

      /* Uso único, mesmo com dois toques ao mesmo tempo: só um consegue marcá-lo. */
      const usado = await db
        .update(codigosGerente)
        .set({ usadoEm: agora })
        .where(and(eq(codigosGerente.id, guardado.id), isNull(codigosGerente.usadoEm)))
        .returning({ id: codigosGerente.id });
      if (usado.length === 0) return { ok: false, erro: "codigo-errado" };

      await abrirSessao("gerente", lembrar, agora);
      return { ok: true, papel: "gerente" };
    },

    // ——— A equipa, na gestão (só a gerente: quem chama confirma o papel) ———

    async listarSessoes(agora) {
      /* «Este aparelho»: as sessões cujo token está nos cookies de quem vê. */
      const loja = await cookies();
      const destes = new Set(
        [loja.get(COOKIE_GERENTE), loja.get(COOKIE_EQUIPA)].flatMap((token) => (token ? [hashDoToken(token)] : [])),
      );
      const abertas = await db
        .select()
        .from(sessoesPainel)
        .where(gt(sessoesPainel.expiraEm, agora))
        .orderBy(desc(sessoesPainel.ultimoUsoEm));
      return abertas.map(
        (sessao): SessaoListada => ({
          /* O id, e nunca o hash: é o que vai ao browser. */
          id: sessao.id,
          papel: sessao.papel as Papel,
          dispositivo: sessao.dispositivo ?? APARELHO_DESCONHECIDO,
          desde: sessao.criadaEm,
          ultimoUso: sessao.ultimoUsoEm,
          esta: destes.has(sessao.tokenHash),
        }),
      );
    },

    async terminarSessao(id) {
      if (typeof id !== "string" || !FORMATO_DO_ID.test(id)) return { ok: false, erro: "nao-existe" };
      /* Apagada aqui, o aparelho volta a pedir o PIN (ou o código) no próximo
         uso: o cookie dele aponta para uma sessão que já não existe. */
      const terminadas = await db
        .delete(sessoesPainel)
        .where(eq(sessoesPainel.id, id))
        .returning({ id: sessoesPainel.id });
      return terminadas.length > 0 ? { ok: true } : { ok: false, erro: "nao-existe" };
    },

    async mudarPin(novo) {
      if (typeof novo !== "string" || !FORMATO_DO_PIN.test(novo)) return { ok: false, erro: "dados-invalidos" };
      /* Sem a casa importada não há onde guardar o PIN: a entrada da equipa
         ainda não está ligada. */
      const [linha] = await db.select({ id: casa.id }).from(casa).where(eq(casa.id, 1));
      if (!linha) return { ok: false, erro: "indisponivel" };
      await definirPinDaEquipa(db, emLote, novo);
      return { ok: true };
    },

    async sair(ambito) {
      const loja = await cookies();
      const nomes = ambito === "dispositivo" ? [COOKIE_GERENTE, COOKIE_EQUIPA] : [COOKIE_GERENTE];
      for (const nome of nomes) {
        const token = loja.get(nome);
        /* A sessão sai da base de dados, e não só do browser: um cookie copiado
           antes de sair deixa de abrir o que quer que seja. */
        if (token) await db.delete(sessoesPainel).where(eq(sessoesPainel.tokenHash, hashDoToken(token)));
        loja.delete(nome);
      }
    },
  };
}

/**
 * Define o PIN da equipa e **termina todas as sessões de funcionário**, num
 * lote só (`painel.md`): é assim que se tira o acesso a quem saiu da casa.
 *
 * Enquanto não houver ecrã para isto (`ligar-a-neon.md` › 8), corre-se pelo
 * comando, na visita, com a Damira a escolher o PIN.
 */
export async function definirPinDaEquipa(db: BaseDeDados, emLote: ExecutarLote, pin: string) {
  if (!FORMATO_DO_PIN.test(pin)) throw new Error("O PIN da equipa tem 4 ou 6 dígitos.");
  const hash = await hashLento(pin);
  await emLote((d) => [
    d.update(casa).set({ pinEquipaHash: hash }).where(eq(casa.id, 1)),
    d.delete(sessoesPainel).where(eq(sessoesPainel.papel, "funcionario")),
  ]);
}

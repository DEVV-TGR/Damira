import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
import type { Papel } from "@/lib/dados/tipos";
import type { FonteSessao, LojaDeCookies, OpcoesCookie, SessaoPainel } from "./tipos";

/**
 * # ⚠️ A entrada provisória do painel — **não é a verdadeira**
 *
 * Existe para o painel poder ser construído e mostrado antes de haver base de
 * dados. A verdadeira é a #33 (do Sobral): PIN com *hash* e tentativas
 * limitadas na base de dados, código da gerente enviado por email, sessões que
 * a gerente vê e termina.
 *
 * ⚠️ **Liga com o modo de teste (`LOJA_EM_TESTE=1`), e só com ele** — em local
 * e no ar. É o mesmo interruptor de todos os dados provisórios
 * (`src/lib/modo-teste.ts`): não há uma segunda coisa a ligar para ver o painel.
 * Sem ele fica desligada, e o painel diz que a entrada ainda não existe em vez
 * de abrir a porta. Ligada, a página mostra um aviso que não se apaga.
 *
 * ⚠️ **Os valores por defeito estão escritos aqui, num repositório público**
 * (decidido a 04/10): o PIN `123456`, o email da equipa como gerente e um
 * segredo que **não é segredo nenhum**. Quem lê o código entra no painel de um
 * site em modo de teste — onde só há pedidos de exemplo, em memória. Foi a troca
 * aceite para o modo de teste ligar com uma variável só. `PAINEL_PIN_TESTE`,
 * `PAINEL_SEGREDO` e `EMAILS_GERENTE` sobrepõem-se a estes, e a entrada
 * verdadeira (#33) não tem nada disto.
 *
 * O que fica de fora, porque pede a base de dados:
 * - **Sem limite de tentativas.** Seis dígitos sem limite adivinham-se. Por
 *   isso é só para o modo de teste, com pedidos de exemplo.
 * - **Sem revogação.** A sessão é um cookie assinado: não se termina à
 *   distância nem quando o PIN muda. Apaga-se no próprio dispositivo.
 * - **Sem renovação a cada uso.** Lembrado são 30 dias a contar da entrada.
 *
 * O segredo é o `PAINEL_SEGREDO`, e não o `AUTH_SECRET` da conta de cliente: o
 * painel e a conta não se misturam (`painel.md`).
 */

const COOKIE_EQUIPA = "painel_equipa";
const COOKIE_GERENTE = "painel_gerente";
const COOKIE_CODIGO = "painel_codigo";

const TRINTA_DIAS_S = 30 * 24 * 60 * 60;
/* Sem «lembrar», o cookie acaba com o browser; e no servidor, ao fim de um dia
   de trabalho, para um browser que nunca se fecha não ser «lembrar» às escondidas. */
const SEM_LEMBRAR_MS = 14 * 60 * 60 * 1000;
const DEZ_MINUTOS_MS = 10 * 60 * 1000;

/* Os valores do modo de teste. Ver o cabeçalho: são públicos de propósito. */
export const PIN_DE_TESTE = "123456";
export const GERENTE_DE_TESTE = "developerplusteam@gmail.com";
const SEGREDO_DE_TESTE = "damira-modo-de-teste-nao-e-segredo-nenhum";

type Opcoes = { ambiente: Ambiente; cookies: () => Promise<LojaDeCookies> };

/* O que vai dentro do cookie, assinado. O `x` é o fim, verificado no servidor:
   um cookie que o browser guardasse para lá do prazo não serve. */
type Carga = { p: Papel; d: string; l: boolean; x: string };
type CargaCodigo = { e: string; c: string; x: string };

const emBase64 = (texto: string) => Buffer.from(texto).toString("base64url");
const deBase64 = (texto: string) => Buffer.from(texto, "base64url").toString();

const iguais = (a: string, b: string): boolean => {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
};

export function criarSessaoProvisoria({ ambiente, cookies }: Opcoes): FonteSessao {
  const ligada = emModoDeTeste(ambiente);
  /* Um PIN do ambiente que não seja de seis dígitos cai no de defeito, em vez
     de deixar o painel sem entrada. */
  const pin = /^\d{6}$/.test(ambiente.PAINEL_PIN_TESTE ?? "") ? ambiente.PAINEL_PIN_TESTE! : PIN_DE_TESTE;
  const segredo = (ambiente.PAINEL_SEGREDO ?? "").length >= 16 ? ambiente.PAINEL_SEGREDO! : SEGREDO_DE_TESTE;
  const gerentes = (ambiente.EMAILS_GERENTE || GERENTE_DE_TESTE)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const opcoesCookie = (maxAge?: number): OpcoesCookie => ({
    httpOnly: true,
    secure: ambiente.NODE_ENV === "production",
    sameSite: "strict",
    path: "/painel",
    ...(maxAge === undefined ? {} : { maxAge }),
  });

  const assinar = (dados: object): string => {
    const corpo = emBase64(JSON.stringify(dados));
    return `${corpo}.${createHmac("sha256", segredo).update(corpo).digest("base64url")}`;
  };

  /* Um cookie que não bate com a assinatura é como não haver cookie. Não se
     distingue «adulterado» de «ausente»: não há nada de útil a dizer a quem o
     adulterou. */
  const abrir = <T>(valor: string | undefined): T | null => {
    if (!ligada || !valor) return null;
    const [corpo, assinatura] = valor.split(".");
    if (!corpo || !assinatura) return null;
    const esperada = createHmac("sha256", segredo).update(corpo).digest("base64url");
    if (!iguais(assinatura, esperada)) return null;
    try {
      return JSON.parse(deBase64(corpo)) as T;
    } catch {
      return null;
    }
  };

  const lerSessao = (valor: string | undefined, agora: Date): SessaoPainel | null => {
    const carga = abrir<Carga>(valor);
    if (!carga || new Date(carga.x).getTime() <= agora.getTime()) return null;
    return { papel: carga.p, desde: new Date(carga.d), lembrar: carga.l };
  };

  const gravarSessao = async (papel: Papel, lembrar: boolean, agora: Date) => {
    const fim = new Date(agora.getTime() + (lembrar ? TRINTA_DIAS_S * 1000 : SEM_LEMBRAR_MS));
    const carga: Carga = { p: papel, d: agora.toISOString(), l: lembrar, x: fim.toISOString() };
    const nome = papel === "gerente" ? COOKIE_GERENTE : COOKIE_EQUIPA;
    (await cookies()).set(nome, assinar(carga), opcoesCookie(lembrar ? TRINTA_DIAS_S : undefined));
  };

  /* O código guarda-se com HMAC e não em claro: quem lesse o cookie não ficava a
     saber o código. */
  const marcaDoCodigo = (email: string, codigo: string) =>
    createHmac("sha256", segredo).update(`${email}:${codigo}`).digest("base64url");

  return {
    ligada,
    provisoria: true,

    async sessaoAtual(agora) {
      const loja = await cookies();
      return lerSessao(loja.get(COOKIE_GERENTE), agora) ?? lerSessao(loja.get(COOKIE_EQUIPA), agora);
    },

    async temSessaoDeEquipa(agora) {
      return lerSessao((await cookies()).get(COOKIE_EQUIPA), agora) !== null;
    },

    async entrarComPin(entrada, { agora }) {
      if (!ligada) return { ok: false, erro: "indisponivel" };
      if (typeof entrada !== "string" || !/^\d{6}$/.test(entrada)) return { ok: false, erro: "dados-invalidos" };
      if (!iguais(entrada, pin)) return { ok: false, erro: "pin-errado" };
      await gravarSessao("funcionario", true, agora);
      return { ok: true, papel: "funcionario" };
    },

    async pedirCodigo(entrada, { agora }) {
      if (!ligada) return { ok: false, erro: "indisponivel" };
      if (typeof entrada !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entrada.trim())) {
        return { ok: false, erro: "dados-invalidos" };
      }
      const email = entrada.trim().toLowerCase();
      /* Um código para toda a gente, com e sem acesso: a resposta é igual nos
         dois casos. Só o de quem está na lista abre a porta, ao entrar. */
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const carga: CargaCodigo = {
        e: email,
        c: marcaDoCodigo(email, codigo),
        x: new Date(agora.getTime() + DEZ_MINUTOS_MS).toISOString(),
      };
      (await cookies()).set(COOKIE_CODIGO, assinar(carga), opcoesCookie(DEZ_MINUTOS_MS / 1000));
      return { ok: true, codigoDeTeste: codigo };
    },

    async entrarComCodigo(emailEntrada, codigoEntrada, lembrar, { agora }) {
      if (!ligada) return { ok: false, erro: "indisponivel" };
      if (typeof emailEntrada !== "string" || typeof codigoEntrada !== "string" || !/^\d{6}$/.test(codigoEntrada)) {
        return { ok: false, erro: "dados-invalidos" };
      }
      const email = emailEntrada.trim().toLowerCase();
      const loja = await cookies();
      const carga = abrir<CargaCodigo>(loja.get(COOKIE_CODIGO));
      const valido =
        carga !== null &&
        carga.e === email &&
        new Date(carga.x).getTime() > agora.getTime() &&
        iguais(carga.c, marcaDoCodigo(email, codigoEntrada)) &&
        gerentes.includes(email);
      if (!valido) return { ok: false, erro: "codigo-errado" };
      /* Uso único: o código sai antes de a sessão entrar. */
      loja.delete(COOKIE_CODIGO);
      await gravarSessao("gerente", lembrar, agora);
      return { ok: true, papel: "gerente" };
    },

    async sair(ambito) {
      const loja = await cookies();
      loja.delete(COOKIE_GERENTE);
      if (ambito === "dispositivo") loja.delete(COOKIE_EQUIPA);
    },
  };
}

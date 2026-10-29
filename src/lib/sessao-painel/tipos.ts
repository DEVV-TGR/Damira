import type { Papel } from "@/lib/dados/tipos";

/**
 * # O contrato da entrada no painel
 *
 * Quem está ao balcão e com que papel. A página `/painel` e as ações do painel
 * só falam com isto; do outro lado está hoje a **entrada provisória**
 * (`provisoria.ts`), e amanhã a verdadeira, sobre a base de dados (#33, do
 * Sobral). Como a `FonteDeDados`: a implementação troca-se, isto não muda.
 *
 * O que a verdadeira tem de fazer e a provisória não faz está em `painel.md`:
 * tentativas limitadas na base de dados, sessões que se terminam, renovação a
 * cada uso e a lista de dispositivos.
 */

export type SessaoPainel = {
  papel: Papel;
  desde: Date;
  /** Se o dispositivo fica lembrado (30 dias) ou se a sessão acaba com o browser. */
  lembrar: boolean;
};

/** O que o servidor sabe e o browser não manda. `agora` por argumento, como em todo o lado. */
export type ContextoEntrada = { agora: Date; ip: string | null };

/**
 * - `bloqueado`: demasiadas tentativas (`painel.md`). Só a verdadeira o devolve.
 * - `indisponivel`: a entrada não está ligada neste ambiente.
 */
export type ErroEntrada = "pin-errado" | "codigo-errado" | "bloqueado" | "indisponivel" | "dados-invalidos";

export type ResultadoEntrada = { ok: true; papel: Papel } | { ok: false; erro: ErroEntrada };

/**
 * ⚠️ **A mesma resposta para um email com acesso e para um sem acesso**
 * (`painel.md`): o formulário não pode servir para descobrir quem é gerente.
 *
 * `codigoDeTeste` só vem da entrada provisória, para se poder entrar sem email.
 * Vem para **qualquer** email, com e sem acesso — só o de quem tem acesso
 * funciona. A verdadeira nunca o devolve: o código vai por email.
 */
export type RespostaCodigo =
  | { ok: true; codigoDeTeste?: string }
  | { ok: false; erro: "indisponivel" | "dados-invalidos" };

/**
 * - `gerente`: sai a gerente, e um tablet com sessão de funcionário volta ao
 *   balcão sem pedir o PIN.
 * - `dispositivo`: «esquecer este dispositivo» — saem as duas.
 */
export type AmbitoSaida = "gerente" | "dispositivo";

/** Uma sessão aberta, como a gerente a vê em «Equipa» (`painel.md` › Lembrar o dispositivo). */
export type SessaoListada = {
  id: string;
  papel: Papel;
  /** «iPad · Safari» — sai do `user-agent`. Nunca o IP. */
  dispositivo: string;
  desde: Date;
  ultimoUso: Date;
  /** A sessão do aparelho onde se está a ver. */
  esta: boolean;
};

/**
 * - `indisponivel`: esta entrada não o permite (a provisória: o PIN é fixo, e
 *   uma sessão de outro aparelho não se vê nem se termina).
 * - `dados-invalidos`: um PIN sem 4 ou 6 dígitos (#25).
 * - `nao-existe`: a sessão já não existe.
 */
export type ResultadoGestaoEquipa = { ok: true } | { ok: false; erro: "indisponivel" | "dados-invalidos" | "nao-existe" };

export type FonteSessao = {
  /** Se se pode entrar neste ambiente. Desligada, a página diz isso e não mostra o teclado. */
  ligada: boolean;
  /** A provisória mostra um aviso à vista, que não se apaga (`painel.md`). */
  provisoria: boolean;
  /** A gerente, se houver; senão a equipa; senão `null`. Só lê. */
  sessaoAtual(agora: Date): Promise<SessaoPainel | null>;
  /** Para saber se a gerente está a entrar num tablet que já é do balcão. */
  temSessaoDeEquipa(agora: Date): Promise<boolean>;
  /** O PIN da equipa. O dispositivo fica sempre lembrado: é o tablet do balcão. */
  entrarComPin(pin: unknown, ctx: ContextoEntrada): Promise<ResultadoEntrada>;
  pedirCodigo(email: unknown, ctx: ContextoEntrada): Promise<RespostaCodigo>;
  entrarComCodigo(email: unknown, codigo: unknown, lembrar: boolean, ctx: ContextoEntrada): Promise<ResultadoEntrada>;
  sair(ambito: AmbitoSaida): Promise<void>;

  // A gestão da equipa (decidido a 05/10). ⚠️ **Só a gerente**: quem chama
  // confirma o papel da sessão no servidor antes (regra 8), como nas ações do
  // painel. A fonte não volta a verificá-lo.

  /** As sessões abertas, as da equipa e as da gerente, a mais recente primeiro. */
  listarSessoes(agora: Date): Promise<SessaoListada[]>;
  /** Termina uma sessão: esse aparelho volta a pedir o PIN (ou o código) no próximo uso. */
  terminarSessao(id: string, agora: Date): Promise<ResultadoGestaoEquipa>;
  /**
   * Muda o PIN da equipa e **fecha todas as sessões da equipa**, num lote só
   * (`painel.md`): é assim que se tira o acesso a quem saiu da casa. As da
   * gerente ficam.
   */
  mudarPin(novo: unknown, ctx: ContextoEntrada): Promise<ResultadoGestaoEquipa>;
};

/** O que a fonte precisa dos cookies. O `index.ts` liga-o ao `next/headers`; os testes, a um `Map`. */
export type LojaDeCookies = {
  get(nome: string): string | undefined;
  set(nome: string, valor: string, opcoes: OpcoesCookie): void;
  delete(nome: string): void;
};

export type OpcoesCookie = {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: string;
  /** Em segundos. Sem ele, o cookie acaba quando o browser fecha. */
  maxAge?: number;
};
